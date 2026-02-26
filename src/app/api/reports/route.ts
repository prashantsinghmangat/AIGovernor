import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const { data: reports } = await supabase
    .from('governance_reports')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('period_end', { ascending: false })
    .limit(10);

  return NextResponse.json({ data: { reports: reports || [] } });
}
