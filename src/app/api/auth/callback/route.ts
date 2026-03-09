import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const rawNext = request.nextUrl.searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect — only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
