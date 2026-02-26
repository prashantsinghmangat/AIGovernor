import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { count: totalCompanies } = await supabase.from('companies').select('*', { count: 'exact', head: true });

  return NextResponse.json({
    data: {
      total_companies: totalCompanies ?? 0,
      active_subscriptions: 0,
      avg_debt_score: 65,
      monthly_revenue: 0,
      plan_distribution: { starter: 0, growth: 0, enterprise: 0 },
      recent_signups: [],
    },
  });
}
