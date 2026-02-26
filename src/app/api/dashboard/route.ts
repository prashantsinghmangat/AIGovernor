import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const companyId = profile.company_id;

    const [scoresRes, alertsRes, reposRes] = await Promise.all([
      supabase.from('ai_debt_scores').select('*').eq('company_id', companyId).is('repository_id', null).order('calculated_at', { ascending: false }).limit(6),
      supabase.from('alerts').select('id, severity, title, created_at').eq('company_id', companyId).eq('status', 'active').order('created_at', { ascending: false }).limit(4),
      supabase.from('repositories').select('id').eq('company_id', companyId).eq('is_active', true),
    ]);

    const latestScore = scoresRes.data?.[0];
    const previousScore = scoresRes.data?.[1];

    return NextResponse.json({
      data: {
        debt_score: {
          score: latestScore?.score ?? 0,
          risk_zone: latestScore?.risk_zone ?? 'unknown',
          change: latestScore && previousScore ? latestScore.score - previousScore.score : 0,
          trend: (scoresRes.data || []).reverse().map((s) => ({
            month: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short' }),
            score: s.score,
          })),
        },
        metrics: {
          ai_loc_percentage: 42,
          ai_loc_change: '+4.2%',
          review_coverage: 61,
          review_change: '+2.3%',
          unreviewed_merges: 6,
          unreviewed_change: '+2',
          refactor_backlog_growth: 12,
        },
        ai_usage_trend: [
          { week: 'W1', ai_loc: 2400, human_loc: 5600 },
          { week: 'W2', ai_loc: 2800, human_loc: 5200 },
          { week: 'W3', ai_loc: 3200, human_loc: 4800 },
          { week: 'W4', ai_loc: 3600, human_loc: 4400 },
        ],
        repo_risk: [],
        recent_alerts: (alertsRes.data || []).map((a) => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          time: a.created_at,
        })),
        last_scan: '2 hours ago',
        repos_monitored: reposRes.data?.length ?? 0,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
