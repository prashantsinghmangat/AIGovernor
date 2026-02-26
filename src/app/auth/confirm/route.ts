import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');

  if (token_hash && type) {
    const supabase = await createServerSupabase();
    await supabase.auth.verifyOtp({ token_hash, type: type as 'email' });
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
