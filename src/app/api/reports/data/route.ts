import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, companies(name)')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const companyId = profile.company_id;
  const companyName = (profile.companies as { name?: string } | null)?.name ?? 'Your Company';

  // Fetch everything in parallel
  const [reposRes, scoresRes, scansRes, alertsRes, teamRes] = await Promise.all([
    supabase
      .from('repositories')
      .select('id, name, full_name, language, last_scan_at, last_scan_status')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('ai_debt_scores')
      .select('repository_id, score, risk_zone, calculated_at')
      .eq('company_id', companyId)
      .order('calculated_at', { ascending: false }),
    supabase
      .from('scans')
      .select('repository_id, status, completed_at, summary, created_at')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100),
    supabase
      .from('alerts')
      .select('id, severity, category, title, description, created_at, repository_id, repositories(name)')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('team_metrics')
      .select('github_username, display_name, ai_loc_authored, governance_score, risk_index')
      .eq('company_id', companyId)
      .order('ai_loc_authored', { ascending: false })
      .limit(10),
  ]);

  // Build latest score per repo
  const latestScorePerRepo = new Map<string, { score: number; risk_zone: string }>();
  const companyScore = scoresRes.data?.find((s) => s.repository_id === null);
  scoresRes.data?.forEach((s) => {
    if (s.repository_id && !latestScorePerRepo.has(s.repository_id)) {
      latestScorePerRepo.set(s.repository_id, { score: s.score, risk_zone: s.risk_zone });
    }
  });

  // Build latest scan per repo
  const latestScanPerRepo = new Map<string, Record<string, unknown>>();
  scansRes.data?.forEach((s) => {
    if (!latestScanPerRepo.has(s.repository_id)) {
      latestScanPerRepo.set(s.repository_id, s.summary as Record<string, unknown> ?? {});
    }
  });

  const lastScanDate = scansRes.data?.[0]?.completed_at ?? null;

  // Build per-repo report data
  const repositories = (reposRes.data ?? []).map((repo) => {
    const score = latestScorePerRepo.get(repo.id);
    const summary = latestScanPerRepo.get(repo.id) ?? {};

    const vulns = summary.vulnerabilities as { critical?: number; high?: number; medium?: number; low?: number; total?: number } | null;
    const deps = summary.dependency_vulnerabilities as { critical?: number; high?: number; medium?: number; low?: number; total?: number; total_dependencies?: number; ecosystems_scanned?: string[] } | null;
    const quality = summary.code_quality as { worst_grade?: string; total_errors?: number; total_warnings?: number; total_findings?: number } | null;
    const enh = summary.enhancements as { total_suggestions?: number; high_impact?: number } | null;
    const pii = summary.pii_findings as { total_findings?: number; critical_count?: number; categories_detected?: string[] } | null;
    const sensitiveFiles = summary.sensitive_files as { total_findings?: number; critical_count?: number } | null;
    const infra = summary.infrastructure as { total_findings?: number; critical_count?: number; high_count?: number } | null;
    const license = summary.license_compliance as { total_packages?: number; strong_copyleft_count?: number; weak_copyleft_count?: number } | null;

    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      language: repo.language ?? 'Unknown',
      score: score?.score ?? 0,
      risk_zone: score?.risk_zone ?? 'unknown',
      last_scan_at: repo.last_scan_at,
      total_files: (summary.total_files_scanned as number) ?? 0,
      total_loc: (summary.total_loc as number) ?? 0,
      ai_loc_pct: (summary.ai_loc_percentage as number) ?? 0,
      vulnerabilities: {
        critical: vulns?.critical ?? 0,
        high: vulns?.high ?? 0,
        medium: vulns?.medium ?? 0,
        low: vulns?.low ?? 0,
        total: vulns?.total ?? 0,
      },
      dependencies: {
        total: deps?.total_dependencies ?? 0,
        critical: deps?.critical ?? 0,
        high: deps?.high ?? 0,
        medium: deps?.medium ?? 0,
        low: deps?.low ?? 0,
        total_findings: deps?.total ?? 0,
        ecosystems: deps?.ecosystems_scanned ?? [],
      },
      code_quality: {
        grade: quality?.worst_grade ?? 'N/A',
        total_errors: quality?.total_errors ?? 0,
        total_warnings: quality?.total_warnings ?? 0,
        total_findings: quality?.total_findings ?? 0,
      },
      enhancements: {
        total: enh?.total_suggestions ?? 0,
        high_impact: enh?.high_impact ?? 0,
      },
      pii: {
        total: pii?.total_findings ?? 0,
        critical: pii?.critical_count ?? 0,
        categories: pii?.categories_detected ?? [],
      },
      sensitive_files: {
        total: sensitiveFiles?.total_findings ?? 0,
        critical: sensitiveFiles?.critical_count ?? 0,
      },
      infrastructure: {
        total: infra?.total_findings ?? 0,
        critical: infra?.critical_count ?? 0,
        high: infra?.high_count ?? 0,
      },
      license: {
        total_packages: license?.total_packages ?? 0,
        strong_copyleft: license?.strong_copyleft_count ?? 0,
        weak_copyleft: license?.weak_copyleft_count ?? 0,
      },
    };
  });

  // Aggregate totals across all repos
  const totals = repositories.reduce(
    (acc, r) => ({
      vuln_critical: acc.vuln_critical + r.vulnerabilities.critical,
      vuln_high: acc.vuln_high + r.vulnerabilities.high,
      vuln_medium: acc.vuln_medium + r.vulnerabilities.medium,
      vuln_low: acc.vuln_low + r.vulnerabilities.low,
      dep_critical: acc.dep_critical + r.dependencies.critical,
      dep_high: acc.dep_high + r.dependencies.high,
      dep_findings: acc.dep_findings + r.dependencies.total_findings,
      quality_errors: acc.quality_errors + r.code_quality.total_errors,
      quality_warnings: acc.quality_warnings + r.code_quality.total_warnings,
      pii_total: acc.pii_total + r.pii.total,
      sensitive_total: acc.sensitive_total + r.sensitive_files.total,
      infra_total: acc.infra_total + r.infrastructure.total,
    }),
    {
      vuln_critical: 0, vuln_high: 0, vuln_medium: 0, vuln_low: 0,
      dep_critical: 0, dep_high: 0, dep_findings: 0,
      quality_errors: 0, quality_warnings: 0,
      pii_total: 0, sensitive_total: 0, infra_total: 0,
    },
  );

  return NextResponse.json({
    data: {
      company_name: companyName,
      generated_at: new Date().toISOString(),
      last_scan_at: lastScanDate,
      overall_score: companyScore?.score ?? 0,
      overall_risk_zone: companyScore?.risk_zone ?? 'unknown',
      repositories,
      totals,
      alerts: (alertsRes.data ?? []).map((a) => ({
        severity: a.severity,
        category: a.category,
        title: a.title,
        description: a.description,
        created_at: a.created_at,
        repo_name: (a.repositories as { name?: string } | null)?.name ?? null,
      })),
      top_contributors: (teamRes.data ?? []).map((t) => ({
        name: t.display_name ?? t.github_username,
        ai_loc: t.ai_loc_authored ?? 0,
        governance_score: t.governance_score ?? 0,
        risk_index: t.risk_index ?? 0,
      })),
    },
  });
}
