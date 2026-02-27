import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const repositoryId = request.nextUrl.searchParams.get('repository_id');

  const query = supabase.from('ai_debt_scores').select('*').eq('company_id', profile.company_id);

  if (repositoryId) {
    query.eq('repository_id', repositoryId);
  } else {
    query.is('repository_id', null);
  }

  const { data: scores } = await query.order('calculated_at', { ascending: false }).limit(30);

  const latest = scores?.[0];
  const previous = scores?.[1];

  const { data: repoScores } = await supabase
    .from('ai_debt_scores')
    .select('*, repository:repositories(name)')
    .eq('company_id', profile.company_id)
    .not('repository_id', 'is', null)
    .order('calculated_at', { ascending: false });

  const uniqueRepos = new Map();
  repoScores?.forEach((s) => {
    if (!uniqueRepos.has(s.repository_id)) uniqueRepos.set(s.repository_id, s);
  });

  return NextResponse.json({
    data: {
      current_score: {
        score: latest?.score ?? 0,
        risk_zone: latest?.risk_zone ?? 'unknown',
        change: latest && previous ? latest.score - previous.score : 0,
        breakdown: latest?.breakdown ?? {},
      },
      trend: (scores || []).reverse().map((s) => ({
        date: s.calculated_at,
        score: s.score,
        risk_zone: s.risk_zone,
      })),
      by_repository: Array.from(uniqueRepos.values()).map((s) => {
        const bd = (s.breakdown ?? {}) as Record<string, number>;
        return {
          repository_id: s.repository_id,
          repository_name: (s.repository as { name: string })?.name,
          score: s.score,
          risk_zone: s.risk_zone,
          ai_loc_percentage: bd.ai_loc_ratio != null ? Math.round(bd.ai_loc_ratio * 100) : 0,
          review_coverage: bd.review_coverage != null ? Math.round(bd.review_coverage * 100) : 0,
        };
      }),
    },
  });
}
