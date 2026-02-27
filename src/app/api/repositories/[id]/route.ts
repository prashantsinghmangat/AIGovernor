import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Fetch repository and verify it belongs to user's company
  const { data: repository } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single();

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Fetch enrichment data in parallel
  const [latestScoreRes, scanHistoryRes, scoreTrendRes, alertsRes] = await Promise.all([
    supabase
      .from('ai_debt_scores')
      .select('score, risk_zone, breakdown, calculated_at')
      .eq('repository_id', id)
      .order('calculated_at', { ascending: false })
      .limit(1),
    supabase
      .from('scans')
      .select('id, status, created_at, completed_at, summary, commit_sha')
      .eq('repository_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('ai_debt_scores')
      .select('score, risk_zone, calculated_at')
      .eq('repository_id', id)
      .order('calculated_at', { ascending: false })
      .limit(30),
    supabase
      .from('alerts')
      .select('id')
      .eq('company_id', profile.company_id)
      .or(`repository_id.eq.${id}`)
      .eq('status', 'active'),
  ]);

  const latestScore = latestScoreRes.data?.[0] ?? null;
  const latestCompletedScan = scanHistoryRes.data?.find((s) => s.status === 'completed') ?? null;

  // Get file counts from the scan summary (primary) with DB count as fallback
  let filesScanned = 0;
  let aiFilesDetected = 0;
  if (latestCompletedScan) {
    const summary = latestCompletedScan.summary as Record<string, unknown> | null;
    const summaryFiles = summary?.total_files_scanned as number | undefined;
    const summaryAiFiles = summary?.ai_files_detected as number | undefined;

    if (summaryFiles != null) {
      filesScanned = summaryFiles;
      aiFilesDetected = summaryAiFiles ?? 0;
    } else {
      // Fallback: count from scan_results table
      const { count: totalFiles } = await supabase
        .from('scan_results')
        .select('id', { count: 'exact', head: true })
        .eq('scan_id', latestCompletedScan.id);

      const { count: aiFiles } = await supabase
        .from('scan_results')
        .select('id', { count: 'exact', head: true })
        .eq('scan_id', latestCompletedScan.id)
        .gt('ai_probability', 0.5);

      filesScanned = totalFiles ?? 0;
      aiFilesDetected = aiFiles ?? 0;
    }
  }

  return NextResponse.json({
    data: {
      repository,
      latest_score: latestScore ? {
        score: latestScore.score,
        risk_zone: latestScore.risk_zone,
        breakdown: latestScore.breakdown as Record<string, number>,
        calculated_at: latestScore.calculated_at,
      } : null,
      latest_scan: latestCompletedScan ? {
        id: latestCompletedScan.id,
        status: latestCompletedScan.status,
        summary: latestCompletedScan.summary as Record<string, unknown> | null,
        completed_at: latestCompletedScan.completed_at,
      } : null,
      scan_history: (scanHistoryRes.data || []).map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        completed_at: s.completed_at,
        summary: s.summary as Record<string, unknown> | null,
        commit_sha: s.commit_sha ?? null,
      })),
      score_trend: (scoreTrendRes.data || []).reverse().map((s) => ({
        date: s.calculated_at,
        score: s.score,
        risk_zone: s.risk_zone,
      })),
      stats: {
        files_scanned: filesScanned,
        ai_files_detected: aiFilesDetected,
        active_alerts: alertsRes.data?.length ?? 0,
        vulnerabilities: (() => {
          const s = latestCompletedScan?.summary as Record<string, unknown> | null;
          const v = s?.vulnerabilities as { critical?: number; high?: number; medium?: number; low?: number; total?: number } | undefined;
          if (!v) return null;
          return { critical: v.critical ?? 0, high: v.high ?? 0, medium: v.medium ?? 0, low: v.low ?? 0, total: v.total ?? 0 };
        })(),
        code_quality: (() => {
          const s = latestCompletedScan?.summary as Record<string, unknown> | null;
          const cq = s?.code_quality as { worst_grade?: string; total_errors?: number; total_warnings?: number; total_infos?: number; total_findings?: number } | undefined;
          if (!cq) return null;
          return { worst_grade: cq.worst_grade ?? 'N/A', total_errors: cq.total_errors ?? 0, total_warnings: cq.total_warnings ?? 0, total_infos: cq.total_infos ?? 0, total_findings: cq.total_findings ?? 0 };
        })(),
        enhancements: (() => {
          const s = latestCompletedScan?.summary as Record<string, unknown> | null;
          const enh = s?.enhancements as { high_impact?: number; medium_impact?: number; low_impact?: number; total_suggestions?: number } | undefined;
          if (!enh) return null;
          return { high_impact: enh.high_impact ?? 0, medium_impact: enh.medium_impact ?? 0, low_impact: enh.low_impact ?? 0, total_suggestions: enh.total_suggestions ?? 0 };
        })(),
      },
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only admins can unlink repositories', code: 'FORBIDDEN' }, { status: 403 });
  }

  // Verify repo belongs to the company
  const { data: repo } = await supabase
    .from('repositories')
    .select('id, company_id')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single();

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Soft-delete: set is_active = false (preserves historical data)
  const admin = createAdminSupabase();
  const { error } = await admin
    .from('repositories')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
