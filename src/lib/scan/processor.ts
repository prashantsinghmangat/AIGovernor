import { createAdminSupabase } from '@/lib/supabase/admin';
import { createGitHubClient } from '@/lib/github/client';
import { analyzeContributors, deriveTeamMetrics } from '@/lib/github/contributors';
import { decrypt } from '@/lib/utils/encryption';
import { detectAICode } from '@/lib/detection/combined-scorer';
import { detectVulnerabilities } from '@/lib/detection/vulnerability-detector';
import { detectCodeQuality } from '@/lib/detection/code-quality/detector';
import { detectEnhancements } from '@/lib/detection/enhancements/detector';
import { scanDependencies } from '@/lib/detection/dependency-scanner';
import { scanAllDependencies } from '@/lib/detection/dependency-scanning/scanner';
import type { MultiEcosystemScanResult } from '@/lib/detection/dependency-scanning/types';
import { calculateAIDebtScore } from '@/lib/scoring/ai-debt-score';
import type { Json } from '@/types/database';

// File extensions we analyze
const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'rb',
  'php', 'cs', 'cpp', 'c', 'h', 'hpp', 'swift', 'kt', 'scala',
  'vue', 'svelte', 'dart', 'lua', 'sh', 'bash', 'sql',
]);

const MAX_FILE_SIZE = 50000; // 50KB per file

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', rb: 'Ruby',
    php: 'PHP', cs: 'C#', cpp: 'C++', c: 'C', h: 'C', hpp: 'C++',
    swift: 'Swift', kt: 'Kotlin', scala: 'Scala', vue: 'Vue',
    svelte: 'Svelte', dart: 'Dart', lua: 'Lua', sh: 'Shell',
    bash: 'Shell', sql: 'SQL',
  };
  return map[ext] || 'Unknown';
}

function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Process a single pending scan. Claims the oldest pending scan from the DB,
 * fetches files from GitHub, runs AI detection, calculates scores, and saves results.
 */
export async function processPendingScan(): Promise<{
  success: boolean;
  scan_id?: string;
  message: string;
  error?: string;
}> {
  const admin = createAdminSupabase();

  // 0. Fail stale scans (pending or running > 10 minutes)
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  await admin
    .from('scans')
    .update({
      status: 'failed',
      error_message: 'Scan timed out: stuck in pending state for over 10 minutes',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('created_at', staleThreshold);

  await admin
    .from('scans')
    .update({
      status: 'failed',
      error_message: 'Scan timed out: stuck in running state for over 10 minutes',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'running')
    .lt('started_at', staleThreshold);

  // 1. Claim next pending scan
  const { data: pendingScan, error: claimError } = await admin
    .from('scans')
    .select('*, repository:repositories(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (claimError || !pendingScan) {
    return { success: true, message: 'No pending scans' };
  }

  const scanId = pendingScan.id;
  const repo = pendingScan.repository as {
    id: string;
    company_id: string;
    full_name: string;
    language: string | null;
    default_branch: string;
  };

  // Mark scan as running
  await admin.from('scans').update({
    status: 'running',
    started_at: new Date().toISOString(),
    progress: 0,
  }).eq('id', scanId);

  console.log(`[Scan Processor] Started scan ${scanId} for ${repo.full_name}`);

  try {
    // 2. Get GitHub token for the company
    const { data: userWithToken } = await admin
      .from('users')
      .select('github_token')
      .eq('company_id', repo.company_id)
      .not('github_token', 'is', null)
      .limit(1)
      .single();

    if (!userWithToken?.github_token) {
      throw new Error('No GitHub token available for this company');
    }

    const token = decrypt(userWithToken.github_token);
    const octokit = createGitHubClient(token);
    const [owner, repoName] = repo.full_name.split('/');

    // 3. Get recent commits for metadata detection + HEAD commit SHA
    let latestCommitMessage = '';
    let commitSha: string | null = null;
    let commitTitle: string | null = null;
    let commitDate: string | null = null;
    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        per_page: 5,
      });
      latestCommitMessage = commits.map(c => c.commit.message).join('\n');
      if (commits.length > 0) {
        commitSha = commits[0].sha;
        commitTitle = commits[0].commit.message.split('\n')[0].slice(0, 120);
        commitDate = commits[0].commit.committer?.date ?? commits[0].commit.author?.date ?? null;
      }
    } catch {
      console.log(`[Scan Processor] Could not fetch commits for ${repo.full_name} (may be empty)`);
    }

    // Store commit info on the scan record so the UI can show it during progress
    if (commitSha) {
      await admin.from('scans').update({
        commit_sha: commitSha,
        summary: {
          commit_sha: commitSha,
          commit_title: commitTitle,
          commit_date: commitDate,
        } as unknown as Json,
      }).eq('id', scanId);
    }

    // 4. Get the file tree from the default branch
    let rawTree: Array<{ path: string; size: number }> = [];
    let tree: Array<{ path: string; size: number }> = [];
    try {
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo: repoName,
        tree_sha: repo.default_branch,
        recursive: 'true',
      });
      // Keep raw tree for manifest file detection (dependency scanning)
      rawTree = (treeData.tree || []).filter(
        (item): item is typeof item & { path: string; size: number } =>
          item.type === 'blob' && !!item.path && typeof item.size === 'number',
      );
      // Filter to code files only for AI/vulnerability analysis
      tree = rawTree.filter(
        (item) => item.size <= MAX_FILE_SIZE && CODE_EXTENSIONS.has(getFileExtension(item.path)),
      );
    } catch (err) {
      throw new Error(`Failed to fetch file tree: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    console.log(`[Scan Processor] Found ${tree.length} code files to analyze in ${repo.full_name}`);

    if (tree.length === 0) {
      await admin.from('scans').update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        summary: {
          total_files_scanned: 0,
          ai_files_detected: 0,
          total_loc: 0,
          total_ai_loc: 0,
          ai_loc_percentage: 0,
        } as unknown as Json,
      }).eq('id', scanId);

      return { success: true, scan_id: scanId, message: 'Scan completed — no code files found' };
    }

    // Update progress
    await admin.from('scans').update({ progress: 10 }).eq('id', scanId);

    // 5. Fetch and analyze each file
    const scanResults: Array<{
      scan_id: string;
      company_id: string;
      repository_id: string;
      file_path: string;
      language: string;
      total_loc: number;
      ai_loc: number;
      ai_probability: number;
      risk_level: string;
      detection_signals: Json;
    }> = [];

    let totalLoc = 0;
    let totalAiLoc = 0;
    let totalVulnCritical = 0;
    let totalVulnHigh = 0;
    let totalVulnMedium = 0;
    let totalVulnLow = 0;
    let totalQualityErrors = 0;
    let totalQualityWarnings = 0;
    let totalQualityInfos = 0;
    let worstQualityGrade: string = 'A';
    const qualityGradeOrder = ['A', 'B', 'C', 'D', 'F'];
    let totalEnhHighImpact = 0;
    let totalEnhMediumImpact = 0;
    let totalEnhLowImpact = 0;

    for (let i = 0; i < tree.length; i++) {
      const file = tree[i];

      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: file.path,
          ref: repo.default_branch,
        });

        if ('content' in fileData && fileData.encoding === 'base64') {
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          const ext = getFileExtension(file.path);
          const language = getLanguageFromExt(ext);
          const loc = content.split('\n').length;

          const detection = await detectAICode(content, language, latestCommitMessage);
          const vulnerabilities = detectVulnerabilities(content, language);
          const codeQuality = detectCodeQuality(content, language);
          const enhancements = detectEnhancements(content, language);

          const aiLoc = Math.round(loc * detection.combined_probability);
          totalLoc += loc;
          totalAiLoc += aiLoc;
          totalVulnCritical += vulnerabilities.critical_count;
          totalVulnHigh += vulnerabilities.high_count;
          totalVulnMedium += vulnerabilities.medium_count;
          totalVulnLow += vulnerabilities.low_count;
          totalQualityErrors += codeQuality.error_count;
          totalQualityWarnings += codeQuality.warning_count;
          totalQualityInfos += codeQuality.info_count;
          totalEnhHighImpact += enhancements.high_impact;
          totalEnhMediumImpact += enhancements.medium_impact;
          totalEnhLowImpact += enhancements.low_impact;

          // Track worst quality grade across all files
          if (qualityGradeOrder.indexOf(codeQuality.quality_grade) > qualityGradeOrder.indexOf(worstQualityGrade)) {
            worstQualityGrade = codeQuality.quality_grade;
          }

          scanResults.push({
            scan_id: scanId,
            company_id: repo.company_id,
            repository_id: repo.id,
            file_path: file.path,
            language,
            total_loc: loc,
            ai_loc: aiLoc,
            ai_probability: detection.combined_probability,
            risk_level: detection.risk_level,
            detection_signals: JSON.parse(JSON.stringify({
              method: detection.detection_method,
              metadata: detection.metadata,
              style: detection.style,
              ml: detection.ml,
              vulnerabilities,
              code_quality: codeQuality,
              enhancements,
            })) as Json,
          });
        }
      } catch {
        // Skip files that can't be fetched (binary, too large, etc.)
      }

      // Update progress periodically (10-80% range for file processing)
      if (i % 10 === 0) {
        const progressPct = 10 + Math.round((i / tree.length) * 70);
        await admin.from('scans').update({ progress: progressPct }).eq('id', scanId);
      }
    }

    console.log(`[Scan Processor] Analyzed ${scanResults.length} files, ${totalLoc} LOC total`);
    console.log(
      `[Scan Processor] Code quality: grade ${worstQualityGrade}, ` +
      `${totalQualityErrors} errors, ${totalQualityWarnings} warnings, ${totalQualityInfos} infos`,
    );
    const totalEnhSuggestions = totalEnhHighImpact + totalEnhMediumImpact + totalEnhLowImpact;
    if (totalEnhSuggestions > 0) {
      console.log(
        `[Scan Processor] Enhancement suggestions: ${totalEnhSuggestions} total ` +
        `(${totalEnhHighImpact} high, ${totalEnhMediumImpact} medium, ${totalEnhLowImpact} low impact)`,
      );
    }

    // 5b. Multi-ecosystem dependency scanning (npm, pip, maven, go, cargo, rubygems, composer, nuget)
    let depScanResult: ReturnType<typeof scanDependencies> | null = null;
    let multiDepResult: MultiEcosystemScanResult | null = null;

    // Helper to fetch file content from GitHub
    const fetchFile = async (filePath: string): Promise<string | null> => {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: filePath,
          ref: repo.default_branch,
        });
        if ('content' in data && data.encoding === 'base64') {
          return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        return null;
      } catch {
        return null;
      }
    };

    try {
      multiDepResult = await scanAllDependencies(rawTree, fetchFile);
      if (multiDepResult.total_dependencies > 0) {
        console.log(
          `[Scan Processor] Multi-ecosystem dependency scan: ${multiDepResult.ecosystems_scanned.join(', ')} — ` +
          `${multiDepResult.total_dependencies} deps, ${multiDepResult.total_findings} finding(s)`,
        );
      }

      // Create a backward-compatible depScanResult from the npm portion (for existing alert logic)
      const npmResults = multiDepResult.per_ecosystem.filter((e) => e.ecosystem === 'npm');
      if (npmResults.length > 0) {
        const npmFindings = npmResults.flatMap((r) => r.findings);
        depScanResult = {
          scanned: true,
          total_dependencies: npmResults.reduce((s, r) => s + r.total_dependencies, 0),
          total_findings: npmFindings.length,
          critical_count: npmFindings.filter((f) => f.severity === 'critical').length,
          high_count: npmFindings.filter((f) => f.severity === 'high').length,
          medium_count: npmFindings.filter((f) => f.severity === 'medium').length,
          low_count: npmFindings.filter((f) => f.severity === 'low').length,
          findings: npmFindings.map((f) => ({
            id: f.id,
            package_name: f.package_name,
            installed_version: f.installed_version,
            severity: f.severity,
            title: f.title,
            description: f.description,
            vulnerable_range: f.vulnerable_range,
            patched_version: f.patched_version,
            cve: f.cve,
            ghsa: f.ghsa,
            url: f.url,
          })),
        };
      }
    } catch (err) {
      console.log(`[Scan Processor] Dependency scan error:`, err instanceof Error ? err.message : err);
    }

    // 6. Insert scan results in batches
    if (scanResults.length > 0) {
      const BATCH_SIZE = 25;
      let insertedCount = 0;
      for (let i = 0; i < scanResults.length; i += BATCH_SIZE) {
        const batch = scanResults.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await admin.from('scan_results').insert(batch);
        if (insertError) {
          console.error(`[Scan Processor] Batch insert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, insertError.message, insertError.code);
          // Retry: insert one-by-one for failed batch
          for (const row of batch) {
            const { error: singleError } = await admin.from('scan_results').insert(row);
            if (singleError) {
              console.error(`[Scan Processor] Single insert failed for ${row.file_path}:`, singleError.message);
            } else {
              insertedCount++;
            }
          }
        } else {
          insertedCount += batch.length;
        }
      }
      console.log(`[Scan Processor] Inserted ${insertedCount}/${scanResults.length} scan results`);
    }

    await admin.from('scans').update({ progress: 85 }).eq('id', scanId);

    // 7. Calculate AI Debt Score
    const aiFilesDetected = scanResults.filter(r => r.ai_probability > 0.5).length;
    const aiLocRatio = totalLoc > 0 ? totalAiLoc / totalLoc : 0;

    const debtScore = calculateAIDebtScore({
      ai_loc_ratio: aiLocRatio,
      review_coverage: 0.5,
      refactor_backlog_growth: 0,
      prompt_inconsistency: 0,
    });

    // Save the repo-specific score
    const { error: scoreError } = await admin.from('ai_debt_scores').insert({
      company_id: repo.company_id,
      repository_id: repo.id,
      scan_id: scanId,
      score: debtScore.score,
      risk_zone: debtScore.risk_zone,
      breakdown: JSON.parse(JSON.stringify(debtScore.breakdown)) as Json,
    });
    if (scoreError) {
      console.error(`[Scan Processor] Error inserting debt score:`, scoreError.message);
    }

    // Also save/update a company-wide score (aggregated from all repos)
    const { data: allRepoScores } = await admin
      .from('ai_debt_scores')
      .select('score, repository_id')
      .eq('company_id', repo.company_id)
      .not('repository_id', 'is', null)
      .order('calculated_at', { ascending: false });

    const latestPerRepo = new Map<string, number>();
    allRepoScores?.forEach(s => {
      if (s.repository_id && !latestPerRepo.has(s.repository_id)) {
        latestPerRepo.set(s.repository_id, s.score);
      }
    });

    if (latestPerRepo.size > 0) {
      const scores = Array.from(latestPerRepo.values());
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const companyRiskZone = avgScore >= 80 ? 'healthy' : avgScore >= 60 ? 'caution' : 'critical';

      await admin.from('ai_debt_scores').insert({
        company_id: repo.company_id,
        repository_id: null,
        scan_id: scanId,
        score: avgScore,
        risk_zone: companyRiskZone,
        breakdown: {
          ai_loc_ratio: aiLocRatio,
          review_coverage: 0.5,
          refactor_backlog_growth: 0,
          prompt_inconsistency: 0,
          weights: { ai_loc_ratio: 0.30, review_coverage: 0.30, refactor_backlog_growth: 0.20, prompt_inconsistency: 0.20 },
        } as unknown as Json,
      });
    }

    await admin.from('scans').update({ progress: 90 }).eq('id', scanId);

    // 8. Generate alerts if thresholds exceeded
    const alertInserts: Array<{
      company_id: string;
      repository_id: string;
      severity: string;
      category: string;
      title: string;
      description: string;
      status: string;
    }> = [];

    const aiLocPct = Math.round(aiLocRatio * 100);
    if (aiLocPct > 50) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'ai_loc',
        title: `High AI-generated code in ${repo.full_name}`,
        description: `${aiLocPct}% of code in ${repo.full_name} is AI-generated. Consider reviewing AI contributions.`,
        status: 'active',
      });
    }

    if (debtScore.score < 60) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'debt_score',
        title: `Critical AI debt score for ${repo.full_name}`,
        description: `AI debt score is ${debtScore.score}/100 (${debtScore.risk_zone}). Immediate attention recommended.`,
        status: 'active',
      });
    }

    // Vulnerability alerts
    if (totalVulnCritical > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'vulnerability',
        title: `Critical vulnerabilities found in ${repo.full_name}`,
        description: `${totalVulnCritical} critical vulnerability finding${totalVulnCritical > 1 ? 's' : ''} detected (hardcoded secrets, code injection). Immediate remediation required.`,
        status: 'active',
      });
    }

    if (totalVulnHigh > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'vulnerability',
        title: `High-severity vulnerabilities in ${repo.full_name}`,
        description: `${totalVulnHigh} high-severity finding${totalVulnHigh > 1 ? 's' : ''} detected (XSS, command injection). Review and fix recommended.`,
        status: 'active',
      });
    }

    // Code quality alerts
    if (worstQualityGrade === 'F' || worstQualityGrade === 'D') {
      const totalQualityFindings = totalQualityErrors + totalQualityWarnings;
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: worstQualityGrade === 'F' ? 'high' : 'medium',
        category: 'code_quality',
        title: `Poor code quality detected in ${repo.full_name}`,
        description: `Worst quality grade: ${worstQualityGrade}. ${totalQualityFindings} quality finding${totalQualityFindings > 1 ? 's' : ''} detected (${totalQualityErrors} errors, ${totalQualityWarnings} warnings). Review code for anti-patterns and complexity issues.`,
        status: 'active',
      });
    }

    // Dependency vulnerability alerts (multi-ecosystem)
    const depCritical = multiDepResult?.critical_count ?? depScanResult?.critical_count ?? 0;
    const depHigh = multiDepResult?.high_count ?? depScanResult?.high_count ?? 0;
    const depEcosystems = multiDepResult?.ecosystems_scanned?.join(', ') ?? 'npm';

    if (depCritical > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'dependency',
        title: `Critical dependency vulnerabilities in ${repo.full_name}`,
        description: `${depCritical} critical vulnerable package${depCritical > 1 ? 's' : ''} found across ${depEcosystems}. Update affected packages immediately.`,
        status: 'active',
      });
    }

    if (depHigh > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'dependency',
        title: `Vulnerable dependencies in ${repo.full_name}`,
        description: `${depHigh} high-severity vulnerable package${depHigh > 1 ? 's' : ''} found across ${depEcosystems}. Review and update.`,
        status: 'active',
      });
    }

    if (alertInserts.length > 0) {
      await admin.from('alerts').insert(alertInserts);
    }

    // 9. Update scan as completed
    const totalVulns = totalVulnCritical + totalVulnHigh + totalVulnMedium + totalVulnLow;
    const summary = {
      total_files_scanned: scanResults.length,
      ai_files_detected: aiFilesDetected,
      total_loc: totalLoc,
      total_ai_loc: totalAiLoc,
      ai_loc_percentage: aiLocPct,
      debt_score: debtScore.score,
      risk_zone: debtScore.risk_zone,
      commit_sha: commitSha,
      commit_title: commitTitle,
      commit_date: commitDate,
      vulnerabilities: {
        critical: totalVulnCritical,
        high: totalVulnHigh,
        medium: totalVulnMedium,
        low: totalVulnLow,
        total: totalVulns,
      },
      code_quality: {
        worst_grade: worstQualityGrade,
        total_errors: totalQualityErrors,
        total_warnings: totalQualityWarnings,
        total_infos: totalQualityInfos,
        total_findings: totalQualityErrors + totalQualityWarnings + totalQualityInfos,
      },
      enhancements: {
        high_impact: totalEnhHighImpact,
        medium_impact: totalEnhMediumImpact,
        low_impact: totalEnhLowImpact,
        total_suggestions: totalEnhHighImpact + totalEnhMediumImpact + totalEnhLowImpact,
      },
      dependency_vulnerabilities: multiDepResult ? {
        ecosystems_scanned: multiDepResult.ecosystems_scanned,
        total_dependencies: multiDepResult.total_dependencies,
        critical: multiDepResult.critical_count,
        high: multiDepResult.high_count,
        medium: multiDepResult.medium_count,
        low: multiDepResult.low_count,
        total: multiDepResult.total_findings,
        findings: multiDepResult.findings,
        per_ecosystem: multiDepResult.per_ecosystem.map((e) => ({
          ecosystem: e.ecosystem,
          manifest_file: e.manifest_file,
          total_dependencies: e.total_dependencies,
          findings_count: e.total_findings,
        })),
      } : depScanResult ? {
        ecosystems_scanned: ['npm'],
        total_dependencies: depScanResult.total_dependencies,
        critical: depScanResult.critical_count,
        high: depScanResult.high_count,
        medium: depScanResult.medium_count,
        low: depScanResult.low_count,
        total: depScanResult.total_findings,
        findings: depScanResult.findings,
      } : null,
    };

    await admin.from('scans').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      summary: summary as unknown as Json,
    }).eq('id', scanId);

    // 10. Update repository last_scan fields
    await admin.from('repositories').update({
      last_scan_at: new Date().toISOString(),
      last_scan_status: 'completed',
    }).eq('id', repo.id);

    // 11. Analyze contributors from Git history and update team metrics
    try {
      const contributors = await analyzeContributors(
        octokit,
        owner,
        repoName,
        repo.default_branch,
        scanResults.map((r) => ({
          file_path: r.file_path,
          ai_probability: r.ai_probability,
          ai_loc: r.ai_loc,
          total_loc: r.total_loc,
        })),
      );

      if (contributors.length > 0) {
        const now = new Date();
        // Current week: Monday to Sunday
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const periodStart = weekStart.toISOString().split('T')[0];
        const periodEnd = weekEnd.toISOString().split('T')[0];

        for (const contrib of contributors) {
          const metrics = deriveTeamMetrics(contrib);

          await admin.from('team_metrics').upsert(
            {
              company_id: repo.company_id,
              github_username: contrib.github_username,
              display_name: contrib.display_name,
              avatar_url: contrib.avatar_url,
              period_start: periodStart,
              period_end: periodEnd,
              ai_usage_level: metrics.ai_usage_level,
              ai_loc_authored: contrib.ai_loc_attributed,
              ai_prs: contrib.total_commits,
              total_prs: contrib.total_commits,
              prs_reviewed: 0,
              review_quality: metrics.review_quality,
              governance_score: metrics.governance_score,
              risk_index: metrics.risk_index,
              coaching_suggestions: metrics.coaching_suggestions as unknown as Json,
            },
            { onConflict: 'company_id,github_username,period_start,period_end' },
          );
        }

        console.log(
          `[Scan Processor] Updated team metrics for ${contributors.length} contributors`,
        );
      }
    } catch (contribErr) {
      console.log(
        `[Scan Processor] Contributor analysis skipped:`,
        contribErr instanceof Error ? contribErr.message : 'unknown',
      );
    }

    console.log(`[Scan Processor] Completed scan ${scanId} — ${scanResults.length} files, score: ${debtScore.score}`);

    return {
      success: true,
      scan_id: scanId,
      message: 'Scan completed',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scan Processor] Failed for scan ${scanId}:`, errorMessage);

    await admin.from('scans').update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq('id', scanId);

    return {
      success: false,
      scan_id: scanId,
      message: 'Scan failed',
      error: errorMessage,
    };
  }
}
