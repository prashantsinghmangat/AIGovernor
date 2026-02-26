import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { decrypt } from '@/lib/utils/encryption';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('github_token, github_username')
    .eq('id', user.id)
    .single();

  if (!profile?.github_token) {
    return NextResponse.json({ error: 'GitHub not connected', code: 'GITHUB_NOT_CONNECTED' }, { status: 400 });
  }

  const token = decrypt(profile.github_token);

  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch repos from GitHub' }, { status: 502 });
  }

  const repos = await res.json();

  const mapped = repos.map((repo: { id: number; name: string; full_name: string; default_branch: string; language: string | null; private: boolean }) => ({
    github_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    language: repo.language,
    is_private: repo.private,
  }));

  return NextResponse.json({ data: { repos: mapped, github_username: profile.github_username } });
}
