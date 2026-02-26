import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const { data: members } = await supabase
    .from('team_metrics')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('period_end', { ascending: false });

  const uniqueMembers = new Map();
  members?.forEach((m) => {
    if (!uniqueMembers.has(m.github_username)) uniqueMembers.set(m.github_username, m);
  });

  const membersList = Array.from(uniqueMembers.values());
  const avgScore = membersList.length > 0
    ? Math.round(membersList.reduce((sum, m) => sum + m.governance_score, 0) / membersList.length)
    : 0;

  return NextResponse.json({
    data: {
      adoption_score: avgScore,
      members: membersList.map((m) => ({
        github_username: m.github_username,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        ai_usage_level: m.ai_usage_level,
        review_quality: m.review_quality,
        risk_index: m.risk_index,
        governance_score: m.governance_score,
        total_prs: m.total_prs,
        ai_prs: m.ai_prs,
        prs_reviewed: m.prs_reviewed,
        coaching_suggestions: m.coaching_suggestions,
      })),
    },
  });
}
