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

  const latestScans = new Map<string, { status: string; completed_at: string | null; summary: Record<string, unknown> | null }>();
  scansRes.data?.forEach((s) => {
    if (!latestScans.has(s.repository_id)) {
      latestScans.set(s.repository_id, { status: s.status, completed_at: s.completed_at, summary: s.summary as Record<string, unknown> | null });
    }
  });

  // Enrich repositories with score and scan data
  const enriched = repoList.map((repo) => {
    const scanData = latestScans.get(repo.id);
    const vulnSummary = (scanData?.summary?.vulnerabilities ?? null) as { critical?: number; high?: number; medium?: number; low?: number; total?: number } | null;
    return {
      ...repo,
      debt_score: latestScores.get(repo.id)?.score ?? null,
      risk_zone: latestScores.get(repo.id)?.risk_zone ?? null,
      latest_scan_status: scanData?.status ?? repo.last_scan_status,
      latest_scan_at: scanData?.completed_at ?? repo.last_scan_at,
      vulnerabilities: vulnSummary,
    };
  });

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

  // Cannot use .upsert() with onConflict because the unique constraint is a
  // partial index (WHERE github_id IS NOT NULL) and Postgres ON CONFLICT does
  // not support partial indexes via the supabase client. Instead, check for
  // existing repos and insert/update individually.
  const savedRepos: Record<string, unknown>[] = [];
  for (const repo of inserts) {
    // Check if this repo already exists for this company
    const { data: existing } = await admin
      .from('repositories')
      .select('id')
      .eq('company_id', repo.company_id)
      .eq('github_id', repo.github_id)
      .limit(1)
      .single();

    if (existing) {
      // Update existing repo
      const { data: updated, error: updateErr } = await admin
        .from('repositories')
        .update({
          name: repo.name,
          full_name: repo.full_name,
          default_branch: repo.default_branch,
          language: repo.language,
          is_private: repo.is_private,
          is_active: true,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        console.error('[Repositories POST] update error:', updateErr.message);
      } else if (updated) {
        savedRepos.push(updated);
      }
    } else {
      // Insert new repo
      const { data: inserted, error: insertErr } = await admin
        .from('repositories')
        .insert(repo)
        .select()
        .single();

      if (insertErr) {
        console.error('[Repositories POST] insert error:', insertErr.message);
      } else if (inserted) {
        savedRepos.push(inserted);
      }
    }
  }

  console.log('[Repositories POST] saved', savedRepos.length, 'repos');
  return NextResponse.json({ data: { added: savedRepos.length, repositories: savedRepos } });
}
