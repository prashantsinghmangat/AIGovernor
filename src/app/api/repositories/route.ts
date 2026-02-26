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
    .order('name');

  return NextResponse.json({ data: { repositories: repositories || [] } });
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
