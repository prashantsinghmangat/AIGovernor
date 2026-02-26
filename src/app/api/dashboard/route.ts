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

    const [scoresRes, alertsRes, reposRes, latestScanRes, repoScoresRes] = await Promise.all([
      supabase.from('ai_debt_scores').select('*').eq('company_id', companyId).is('repository_id', null).order('calculated_at', { ascending: false }).limit(6),
      supabase.from('alerts').select('id, severity, title, created_at').eq('company_id', companyId).eq('status', 'active').order('created_at', { ascending: false }).limit(4),
      supabase.from('repositories').select('id, name').eq('company_id', companyId).eq('is_active', true),
      supabase.from('scans').select('completed_at').eq('company_id', companyId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1),
      supabase.from('ai_debt_scores').select('repository_id, score, risk_zone, calculated_at').eq('company_id', companyId).not('repository_id', 'is', null).order('calculated_at', { ascending: false }),
    ]);

    const latestScore = scoresRes.data?.[0];
    const previousScore = scoresRes.data?.[1];
    const latestScan = latestScanRes.data?.[0];

    // Build per-repo risk data from latest scores
    const latestRepoScores = new Map<string, { score: number; risk_zone: string }>();
    repoScoresRes.data?.forEach((s) => {
      if (s.repository_id && !latestRepoScores.has(s.repository_id)) {
        latestRepoScores.set(s.repository_id, { score: s.score, risk_zone: s.risk_zone });
      }
    });

    const repoRisk = (reposRes.data || []).map((r) => {
      const scoreData = latestRepoScores.get(r.id);
      return {
        repo: r.name,
        risk_score: scoreData?.score ?? 0,
        risk_level: scoreData?.risk_zone ?? 'unknown',
      };
    }).filter((r) => r.risk_score > 0);

    // Compute last scan relative time
    let lastScanText = 'No scans yet';
    if (latestScan?.completed_at) {
      const diff = Date.now() - new Date(latestScan.completed_at).getTime();
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (days > 0) lastScanText = `${days} day${days > 1 ? 's' : ''} ago`;
      else if (hours > 0) lastScanText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      else lastScanText = 'Just now';
    }

    // Extract metrics from latest company-wide score breakdown if available
    const breakdown = (latestScore?.breakdown ?? {}) as Record<string, number>;

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
          ai_loc_percentage: breakdown.ai_loc_ratio != null ? Math.round(breakdown.ai_loc_ratio * 100) : 0,
          ai_loc_change: latestScore && previousScore
            ? `${latestScore.score - previousScore.score >= 0 ? '+' : ''}${latestScore.score - previousScore.score}%`
            : '--',
          review_coverage: breakdown.review_coverage != null ? Math.round(breakdown.review_coverage * 100) : 0,
          review_change: '--',
          unreviewed_merges: 0,
          unreviewed_change: '--',
          refactor_backlog_growth: breakdown.refactor_backlog_growth ?? 0,
        },
        ai_usage_trend: [] as Array<{ week: string; ai_loc: number; human_loc: number }>,
        repo_risk: repoRisk,
        recent_alerts: (alertsRes.data || []).map((a) => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          time: a.created_at,
        })),
        last_scan: lastScanText,
        repos_monitored: reposRes.data?.length ?? 0,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
