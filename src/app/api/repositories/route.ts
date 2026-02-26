import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('name');

  const repoList = repositories || [];
  const repoIds = repoList.map((r) => r.id);

  if (repoIds.length === 0) {
    return NextResponse.json({ data: { repositories: [] } });
  }

  // Fetch latest score and scan per repo in parallel
  const [scoresRes, scansRes] = await Promise.all([
    supabase
      .from('ai_debt_scores')
      .select('repository_id, score, risk_zone, calculated_at')
      .in('repository_id', repoIds)
      .order('calculated_at', { ascending: false }),
    supabase
      .from('scans')
      .select('repository_id, status, completed_at, summary')
      .in('repository_id', repoIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
  ]);

  // Deduplicate to latest per repo
  const latestScores = new Map<string, { score: number; risk_zone: string }>();
  scoresRes.data?.forEach((s) => {
    if (!latestScores.has(s.repository_id!)) {
      latestScores.set(s.repository_id!, { score: s.score, risk_zone: s.risk_zone });
    }
  });

  const latestScans = new Map<string, { status: string; completed_at: string | null; summary: unknown }>();
  scansRes.data?.forEach((s) => {
    if (!latestScans.has(s.repository_id)) {
      latestScans.set(s.repository_id, { status: s.status, completed_at: s.completed_at, summary: s.summary });
    }
  });

  // Enrich repositories with score and scan data
  const enriched = repoList.map((repo) => ({
    ...repo,
    debt_score: latestScores.get(repo.id)?.score ?? null,
    risk_zone: latestScores.get(repo.id)?.risk_zone ?? null,
    latest_scan_status: latestScans.get(repo.id)?.status ?? repo.last_scan_status,
    latest_scan_at: latestScans.get(repo.id)?.completed_at ?? repo.last_scan_at,
  }));

  return NextResponse.json({ data: { repositories: enriched } });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  console.log('[Repositories POST] user:', user.id, '| company_id:', profile.company_id, '| role:', profile.role);

  const body = await request.json();
  const { github_repos } = body;

  if (!Array.isArray(github_repos) || github_repos.length === 0) {
    return NextResponse.json({ error: 'No repos provided', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const inserts = github_repos.map((repo: { github_id: number; name: string; full_name: string; default_branch: string; language: string | null; is_private: boolean }) => ({
    company_id: profile.company_id,
    github_id: repo.github_id,
    name: repo.name,
    full_name: repo.full_name,
    default_branch: repo.default_branch || 'main',
    language: repo.language,
    is_private: repo.is_private,
  }));

  console.log('[Repositories POST] inserting', inserts.length, 'repos, sample:', inserts[0]?.full_name);

  // Use admin client to bypass RLS — auth is already verified above
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('repositories').upsert(inserts, { onConflict: 'company_id,github_id' }).select();

  if (error) {
    console.error('[Repositories POST] error:', error.message, '| code:', error.code);
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  console.log('[Repositories POST] saved', data?.length, 'repos ✅');
  return NextResponse.json({ data: { added: data?.length ?? 0, repositories: data || [] } });
}
