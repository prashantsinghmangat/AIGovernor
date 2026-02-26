import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('github_username, github_token')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    data: {
      connected: !!profile?.github_token,
      github_username: profile?.github_username ?? null,
    },
  });
}
