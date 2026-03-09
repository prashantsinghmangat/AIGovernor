import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/scan/history?repository_id=<id>&limit=20
 * Returns completed scans for a repository, ordered by completion time.
 */
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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  let query = supabase
    .from('scans')
    .select('id, repository_id, scan_type, status, commit_sha, summary, completed_at, created_at, repository:repositories(id, name, full_name)')
    .eq('company_id', profile.company_id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (repositoryId) {
    query = query.eq('repository_id', repositoryId);
  }

  const { data: scans, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      scans: (scans || []).map(s => {
        const summary = (s.summary || {}) as Record<string, unknown>;
        return {
          id: s.id,
          repository_id: s.repository_id,
          repository: s.repository,
          scan_type: s.scan_type,
          commit_sha: s.commit_sha,
          completed_at: s.completed_at,
          total_files: summary.total_files_scanned ?? summary.total_files_changed ?? 0,
          total_loc: summary.total_loc ?? 0,
          ai_loc_percentage: summary.ai_loc_percentage ?? 0,
          debt_score: summary.debt_score ?? 0,
          vulnerabilities_total: (summary.vulnerabilities as Record<string, number> | undefined)?.total ?? 0,
          quality_grade: (summary.code_quality as Record<string, unknown> | undefined)?.worst_grade ?? 'A',
        };
      }),
    },
  });
}
