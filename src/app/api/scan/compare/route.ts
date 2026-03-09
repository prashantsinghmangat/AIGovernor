import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/scan/compare?base=<scan_id>&head=<scan_id>
 * Compare two scans and return the diff — new/fixed/changed issues.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const baseId = searchParams.get('base');
  const headId = searchParams.get('head');

  if (!baseId || !headId) {
    return NextResponse.json({ error: 'Both base and head scan IDs are required' }, { status: 400 });
  }

  // Fetch both scans
  const [{ data: baseScan }, { data: headScan }] = await Promise.all([
    supabase.from('scans').select('id, repository_id, status, summary, commit_sha, completed_at, scan_type')
      .eq('id', baseId).single(),
    supabase.from('scans').select('id, repository_id, status, summary, commit_sha, completed_at, scan_type')
      .eq('id', headId).single(),
  ]);

  if (!baseScan || !headScan) {
    return NextResponse.json({ error: 'One or both scans not found' }, { status: 404 });
  }

  if (baseScan.status !== 'completed' || headScan.status !== 'completed') {
    return NextResponse.json({ error: 'Both scans must be completed' }, { status: 400 });
  }

  // Fetch scan results for both scans
  const [{ data: baseResults }, { data: headResults }] = await Promise.all([
    supabase.from('scan_results')
      .select('file_path, language, total_loc, ai_loc, ai_probability, risk_level, detection_signals')
      .eq('scan_id', baseId),
    supabase.from('scan_results')
      .select('file_path, language, total_loc, ai_loc, ai_probability, risk_level, detection_signals')
      .eq('scan_id', headId),
  ]);

  // Build file maps
  const baseFileMap = new Map(
    (baseResults || []).map(r => [r.file_path, r]),
  );
  const headFileMap = new Map(
    (headResults || []).map(r => [r.file_path, r]),
  );

  // Compute file-level diff
  const allPaths = new Set([...baseFileMap.keys(), ...headFileMap.keys()]);

  const newFiles: Array<{ file_path: string; language: string | null; total_loc: number; ai_probability: number; risk_level: string }> = [];
  const removedFiles: Array<{ file_path: string; language: string | null; total_loc: number }> = [];
  const changedFiles: Array<{
    file_path: string;
    language: string | null;
    base: { total_loc: number; ai_probability: number; risk_level: string };
    head: { total_loc: number; ai_probability: number; risk_level: string };
    loc_change: number;
    ai_probability_change: number;
  }> = [];

  for (const path of allPaths) {
    const base = baseFileMap.get(path);
    const head = headFileMap.get(path);

    if (!base && head) {
      newFiles.push({
        file_path: path,
        language: head.language,
        total_loc: head.total_loc,
        ai_probability: head.ai_probability,
        risk_level: head.risk_level,
      });
    } else if (base && !head) {
      removedFiles.push({
        file_path: path,
        language: base.language,
        total_loc: base.total_loc,
      });
    } else if (base && head) {
      // Only include if something actually changed
      if (base.total_loc !== head.total_loc || base.ai_probability !== head.ai_probability || base.risk_level !== head.risk_level) {
        changedFiles.push({
          file_path: path,
          language: head.language,
          base: { total_loc: base.total_loc, ai_probability: base.ai_probability, risk_level: base.risk_level },
          head: { total_loc: head.total_loc, ai_probability: head.ai_probability, risk_level: head.risk_level },
          loc_change: head.total_loc - base.total_loc,
          ai_probability_change: Math.round((head.ai_probability - base.ai_probability) * 100) / 100,
        });
      }
    }
  }

  // Compute vulnerability diff from summaries
  type ScanSummary = Record<string, unknown>;
  const baseSummary = (baseScan.summary || {}) as ScanSummary;
  const headSummary = (headScan.summary || {}) as ScanSummary;

  const baseVulns = baseSummary.vulnerabilities as Record<string, number> | undefined;
  const headVulns = headSummary.vulnerabilities as Record<string, number> | undefined;
  const baseQuality = baseSummary.code_quality as Record<string, unknown> | undefined;
  const headQuality = headSummary.code_quality as Record<string, unknown> | undefined;
  const baseEnhancements = baseSummary.enhancements as Record<string, number> | undefined;
  const headEnhancements = headSummary.enhancements as Record<string, number> | undefined;

  const diff = {
    base_scan: {
      id: baseScan.id,
      commit_sha: baseScan.commit_sha,
      completed_at: baseScan.completed_at,
      scan_type: baseScan.scan_type,
      total_files: baseResults?.length || 0,
      total_loc: (baseSummary.total_loc as number) || 0,
      total_ai_loc: (baseSummary.total_ai_loc as number) || 0,
      ai_loc_percentage: (baseSummary.ai_loc_percentage as number) || 0,
      debt_score: (baseSummary.debt_score as number) || 0,
    },
    head_scan: {
      id: headScan.id,
      commit_sha: headScan.commit_sha,
      completed_at: headScan.completed_at,
      scan_type: headScan.scan_type,
      total_files: headResults?.length || 0,
      total_loc: (headSummary.total_loc as number) || 0,
      total_ai_loc: (headSummary.total_ai_loc as number) || 0,
      ai_loc_percentage: (headSummary.ai_loc_percentage as number) || 0,
      debt_score: (headSummary.debt_score as number) || 0,
    },
    changes: {
      loc_change: ((headSummary.total_loc as number) || 0) - ((baseSummary.total_loc as number) || 0),
      ai_loc_change: ((headSummary.total_ai_loc as number) || 0) - ((baseSummary.total_ai_loc as number) || 0),
      ai_percentage_change: ((headSummary.ai_loc_percentage as number) || 0) - ((baseSummary.ai_loc_percentage as number) || 0),
      debt_score_change: ((headSummary.debt_score as number) || 0) - ((baseSummary.debt_score as number) || 0),
      files_added: newFiles.length,
      files_removed: removedFiles.length,
      files_changed: changedFiles.length,
    },
    vulnerabilities: {
      base: baseVulns || { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      head: headVulns || { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      diff: {
        critical: (headVulns?.critical || 0) - (baseVulns?.critical || 0),
        high: (headVulns?.high || 0) - (baseVulns?.high || 0),
        medium: (headVulns?.medium || 0) - (baseVulns?.medium || 0),
        low: (headVulns?.low || 0) - (baseVulns?.low || 0),
        total: (headVulns?.total || 0) - (baseVulns?.total || 0),
      },
    },
    code_quality: {
      base_grade: (baseQuality?.worst_grade as string) || 'A',
      head_grade: (headQuality?.worst_grade as string) || 'A',
      errors_change: ((headQuality?.total_errors as number) || 0) - ((baseQuality?.total_errors as number) || 0),
      warnings_change: ((headQuality?.total_warnings as number) || 0) - ((baseQuality?.total_warnings as number) || 0),
    },
    enhancements: {
      change: ((headEnhancements?.total_suggestions as number) || 0) - ((baseEnhancements?.total_suggestions as number) || 0),
    },
    file_diff: {
      new_files: newFiles.slice(0, 50),
      removed_files: removedFiles.slice(0, 50),
      changed_files: changedFiles.sort((a, b) => Math.abs(b.loc_change) - Math.abs(a.loc_change)).slice(0, 50),
    },
  };

  return NextResponse.json({ data: diff });
}
