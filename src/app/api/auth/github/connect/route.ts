import { NextResponse } from 'next/server';
import { getGitHubAuthUrl } from '@/lib/github/oauth';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log('[GitHub Connect] GITHUB_CLIENT_ID:', clientId ? `set (${clientId})` : 'MISSING ❌');
  console.log('[GitHub Connect] NEXT_PUBLIC_APP_URL:', appUrl || 'MISSING ❌');

  if (!clientId) {
    console.error('[GitHub Connect] Missing GITHUB_CLIENT_ID env var');
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const url = getGitHubAuthUrl(state);
  console.log('[GitHub Connect] Redirecting to:', url);
  return NextResponse.json({ url });
}
