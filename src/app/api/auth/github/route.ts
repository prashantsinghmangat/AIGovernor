import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/github/oauth';
import { createServerSupabase } from '@/lib/supabase/server';
import { encrypt } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const errorParam = request.nextUrl.searchParams.get('error');

  console.log('[GitHub Callback] URL:', request.nextUrl.toString());
  console.log('[GitHub Callback] code:', code ? `received (${code.slice(0, 8)}...)` : 'MISSING ❌');
  console.log('[GitHub Callback] error from GitHub:', errorParam || 'none');

  if (!code) {
    console.error('[GitHub Callback] No code in callback — GitHub may have rejected the request');
    return NextResponse.json({ error: 'Missing code parameter', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    console.log('[GitHub Callback] Exchanging code for token...');
    const token = await exchangeCodeForToken(code);
    console.log('[GitHub Callback] Token received:', token ? `yes (${token.slice(0, 8)}...)` : 'EMPTY ❌');

    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[GitHub Callback] Supabase user:', user?.id || 'NOT LOGGED IN ❌', userError?.message || '');

    if (user) {
      console.log('[GitHub Callback] Fetching GitHub user info...');
      const githubRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const githubUser = await githubRes.json();
      console.log('[GitHub Callback] GitHub username:', githubUser.login || 'FAILED ❌', githubUser.message || '');

      const { error: updateError } = await supabase.from('users').update({
        github_username: githubUser.login,
        github_token: encrypt(token),
      }).eq('id', user.id);
      console.log('[GitHub Callback] DB update:', updateError ? `FAILED: ${updateError.message} ❌` : 'success ✅');
    }

    console.log('[GitHub Callback] Redirecting to /onboarding?step=2');
    return NextResponse.redirect(new URL('/onboarding?step=2', request.url));
  } catch (error) {
    console.error('[GitHub Callback] CAUGHT ERROR:', error);
    return NextResponse.redirect(new URL('/onboarding?error=github_auth_failed', request.url));
  }
}
