import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get('repository_id');
  const state = searchParams.get('state'); // open, closed, merged, all
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('pull_requests')
    .select('*, repository:repositories(id, name, full_name)', { count: 'exact' })
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (repositoryId) {
    query = query.eq('repository_id', repositoryId);
  }

  if (state && state !== 'all') {
    query = query.eq('state', state);
  }

  const { data: pullRequests, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute aggregate stats
  const totalPRs = count || 0;
  const aiPRs = pullRequests?.filter(pr => pr.ai_generated).length || 0;
  const unreviewedAiPRs = pullRequests?.filter(pr => pr.ai_generated && !pr.human_reviewed).length || 0;
  const withVulns = pullRequests?.filter(pr => {
    const summary = pr.findings_summary as Record<string, unknown> | null;
    if (!summary) return false;
    const vulns = summary.total_vulnerabilities as Record<string, number> | undefined;
    return vulns && (vulns.critical > 0 || vulns.high > 0);
  }).length || 0;

  return NextResponse.json({
    data: {
      pull_requests: pullRequests,
      total: totalPRs,
      stats: {
        total: totalPRs,
        ai_generated: aiPRs,
        unreviewed_ai: unreviewedAiPRs,
        with_vulnerabilities: withVulns,
      },
    },
  });
}
