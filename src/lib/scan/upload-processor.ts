import { createAdminSupabase } from '@/lib/supabase/admin';
import { detectAICode } from '@/lib/detection/combined-scorer';
import { detectVulnerabilities } from '@/lib/detection/vulnerability-detector';
import { detectCodeQuality } from '@/lib/detection/code-quality/detector';
import { detectEnhancements } from '@/lib/detection/enhancements/detector';
import { scanAllDependencies } from '@/lib/detection/dependency-scanning/scanner';
import type { MultiEcosystemScanResult } from '@/lib/detection/dependency-scanning/types';
import { detectSensitiveFiles } from '@/lib/detection/sensitive-files/detector';
import type { SensitiveFileResult } from '@/lib/detection/sensitive-files/types';
import { scanNpmLicenses } from '@/lib/detection/license-scanning/detector';
import type { LicenseResult } from '@/lib/detection/license-scanning/types';
import { detectInfraIssues, getInfraFileType } from '@/lib/detection/infrastructure/detector';
import type { InfraResult, InfraFinding } from '@/lib/detection/infrastructure/types';
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
 * Process a scan for a ZIP-uploaded project. Reads files from a JSON blob
 * stored in Supabase Storage instead of fetching from GitHub.
 *
 * If scanId is provided, processes that specific scan.
 * Otherwise claims the next pending scan where scan_type = 'upload'.
 */
export async function processUploadScan(scanId?: string): Promise<{
  success: boolean;
  scan_id?: string;
  message: string;
  error?: string;
}> {
  const admin = createAdminSupabase();

  // 1. Claim scan — either by ID or next pending upload scan
  let pendingScan;

  if (scanId) {
    const { data, error } = await admin
      .from('scans')
      .select('*, repository:repositories(*)')
      .eq('id', scanId)
      .single();

    if (error || !data) {
      return { success: false, message: 'Scan not found', error: error?.message };
    }
    pendingScan = data;
  } else {
    const { data, error } = await admin
      .from('scans')
      .select('*, repository:repositories(*)')
      .eq('status', 'pending')
      .eq('scan_type', 'upload')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: true, message: 'No pending upload scans' };
    }
    pendingScan = data;
  }

  const currentScanId = pendingScan.id;
  const repo = pendingScan.repository as {
    id: string;
    company_id: string;
    full_name: string;
    language: string | null;
    default_branch: string;
  };

  // 2. Mark scan as running
  await admin.from('scans').update({
    status: 'running',
    started_at: new Date().toISOString(),
    progress: 0,
  }).eq('id', currentScanId);

  console.log(`[Upload Processor] Started scan ${currentScanId} for ${repo.full_name}`);

  try {
    // 3. Get the upload storage key from scan summary
    const summary = pendingScan.summary as { upload_storage_key?: string } | null;
    const storageKey = summary?.upload_storage_key;
    if (!storageKey) {
      throw new Error('No upload storage key found in scan summary');
    }

    // 4. Download the file map from Supabase Storage
    const { data: fileBlob, error: dlError } = await admin.storage
      .from('scan-uploads')
      .download(storageKey);

    if (dlError || !fileBlob) {
      throw new Error(`Failed to download upload data: ${dlError?.message ?? 'no data'}`);
    }

    const fileMapText = await fileBlob.text();
    const fileMap: Record<string, string> = JSON.parse(fileMapText);
    // fileMap is { "src/index.ts": "base64content...", ... }

    // 5. Build tree from file map keys
    const rawTree = Object.keys(fileMap).map(path => ({
      path,
      size: Buffer.from(fileMap[path], 'base64').length,
    }));

    const tree = rawTree.filter(
      item => item.size <= MAX_FILE_SIZE && CODE_EXTENSIONS.has(getFileExtension(item.path)),
    );

    console.log(`[Upload Processor] Found ${tree.length} code files to analyze in ${repo.full_name}`);

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
      }).eq('id', currentScanId);

      // Clean up storage even if no code files found
      await admin.storage.from('scan-uploads').remove([storageKey]);

      return { success: true, scan_id: currentScanId, message: 'Scan completed — no code files found' };
    }

    // 6. Update progress
    await admin.from('scans').update({ progress: 10 }).eq('id', currentScanId);

    // 7. Analyze each file
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
        const content = Buffer.from(fileMap[file.path], 'base64').toString('utf-8');
        const ext = getFileExtension(file.path);
        const language = getLanguageFromExt(ext);
        const loc = content.split('\n').length;

        const detection = await detectAICode(content, language, '');
        const vulnerabilities = detectVulnerabilities(content, language, file.path);
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
          scan_id: currentScanId,
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
      } catch {
        // Skip files that can't be decoded or analyzed
      }

      // Update progress periodically (10-80% range for file processing)
      if (i % 10 === 0) {
        const progressPct = 10 + Math.round((i / tree.length) * 70);
        await admin.from('scans').update({ progress: progressPct }).eq('id', currentScanId);
      }
    }

    // 8. Log analysis results
    console.log(`[Upload Processor] Analyzed ${scanResults.length} files, ${totalLoc} LOC total`);
    console.log(
      `[Upload Processor] Code quality: grade ${worstQualityGrade}, ` +
      `${totalQualityErrors} errors, ${totalQualityWarnings} warnings, ${totalQualityInfos} infos`,
    );
    const totalEnhSuggestions = totalEnhHighImpact + totalEnhMediumImpact + totalEnhLowImpact;
    if (totalEnhSuggestions > 0) {
      console.log(
        `[Upload Processor] Enhancement suggestions: ${totalEnhSuggestions} total ` +
        `(${totalEnhHighImpact} high, ${totalEnhMediumImpact} medium, ${totalEnhLowImpact} low impact)`,
      );
    }

    // 9. Multi-ecosystem dependency scanning
    let multiDepResult: MultiEcosystemScanResult | null = null;

    const fetchFile = async (filePath: string): Promise<string | null> => {
      const base64 = fileMap[filePath];
      if (!base64) return null;
      return Buffer.from(base64, 'base64').toString('utf-8');
    };

    try {
      multiDepResult = await scanAllDependencies(rawTree, fetchFile);
      if (multiDepResult.total_dependencies > 0) {
        console.log(
          `[Upload Processor] Multi-ecosystem dependency scan: ${multiDepResult.ecosystems_scanned.join(', ')} — ` +
          `${multiDepResult.total_dependencies} deps, ${multiDepResult.total_findings} finding(s)`,
        );
      }
    } catch (err) {
      console.log(`[Upload Processor] Dependency scan error:`, err instanceof Error ? err.message : err);
    }

    // 9b. Sensitive file detection
    let sensitiveFileResult: SensitiveFileResult | null = null;
    try {
      const allPaths = Object.keys(fileMap);
      sensitiveFileResult = detectSensitiveFiles(allPaths);
      if (sensitiveFileResult.total_findings > 0) {
        console.log(
          `[Upload Processor] Sensitive files detected: ${sensitiveFileResult.total_findings} ` +
          `(${sensitiveFileResult.critical_count} critical, ${sensitiveFileResult.high_count} high)`,
        );
      }
    } catch (err) {
      console.log(`[Upload Processor] Sensitive file detection error:`, err instanceof Error ? err.message : err);
    }

    // 9c. License compliance scanning
    let licenseResult: LicenseResult | null = null;
    try {
      // Find lockfile or package.json for license scanning
      const lockfilePath = Object.keys(fileMap).find(p => p.endsWith('package-lock.json') && p.split('/').length <= 2);
      const pkgJsonPath = Object.keys(fileMap).find(p => p.endsWith('package.json') && p.split('/').length <= 2);
      const licensePath = lockfilePath ?? pkgJsonPath;
      if (licensePath) {
        const content = Buffer.from(fileMap[licensePath], 'base64').toString('utf-8');
        licenseResult = scanNpmLicenses(content, !!lockfilePath);
        if (licenseResult.total_packages > 0) {
          console.log(
            `[Upload Processor] License scan: ${licenseResult.total_packages} packages — ` +
            `${licenseResult.permissive_count} permissive, ${licenseResult.weak_copyleft_count} weak-copyleft, ` +
            `${licenseResult.strong_copyleft_count} strong-copyleft, ${licenseResult.unknown_count} unknown`,
          );
        }
      }
    } catch (err) {
      console.log(`[Upload Processor] License scan error:`, err instanceof Error ? err.message : err);
    }

    // 9d. Infrastructure security scanning (Dockerfiles, GitHub Actions)
    const infraFindings: InfraFinding[] = [];
    try {
      for (const filePath of Object.keys(fileMap)) {
        const infraType = getInfraFileType(filePath);
        if (!infraType) continue;
        const content = Buffer.from(fileMap[filePath], 'base64').toString('utf-8');
        const result = detectInfraIssues(content, filePath, infraType);
        infraFindings.push(...result.findings);
      }
      if (infraFindings.length > 0) {
        console.log(`[Upload Processor] Infrastructure issues detected: ${infraFindings.length}`);
      }
    } catch (err) {
      console.log(`[Upload Processor] Infrastructure scan error:`, err instanceof Error ? err.message : err);
    }

    const infraResult: InfraResult | null = infraFindings.length > 0 ? {
      total_findings: infraFindings.length,
      critical_count: infraFindings.filter(f => f.severity === 'critical').length,
      high_count: infraFindings.filter(f => f.severity === 'high').length,
      medium_count: infraFindings.filter(f => f.severity === 'medium').length,
      low_count: infraFindings.filter(f => f.severity === 'low').length,
      findings: infraFindings,
      scanned: true,
    } : null;

    // 10. Insert scan results in batches
    if (scanResults.length > 0) {
      const BATCH_SIZE = 25;
      let insertedCount = 0;
      for (let i = 0; i < scanResults.length; i += BATCH_SIZE) {
        const batch = scanResults.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await admin.from('scan_results').insert(batch);
        if (insertError) {
          console.error(`[Upload Processor] Batch insert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, insertError.message, insertError.code);
          // Retry: insert one-by-one for failed batch
          for (const row of batch) {
            const { error: singleError } = await admin.from('scan_results').insert(row);
            if (singleError) {
              console.error(`[Upload Processor] Single insert failed for ${row.file_path}:`, singleError.message);
            } else {
              insertedCount++;
            }
          }
        } else {
          insertedCount += batch.length;
        }
      }
      console.log(`[Upload Processor] Inserted ${insertedCount}/${scanResults.length} scan results`);
    }

    // 11. Update progress
    await admin.from('scans').update({ progress: 85 }).eq('id', currentScanId);

    // 12. Calculate AI Debt Score
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
      scan_id: currentScanId,
      score: debtScore.score,
      risk_zone: debtScore.risk_zone,
      breakdown: JSON.parse(JSON.stringify(debtScore.breakdown)) as Json,
    });
    if (scoreError) {
      console.error(`[Upload Processor] Error inserting debt score:`, scoreError.message);
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
        scan_id: currentScanId,
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

    // 13. Update progress
    await admin.from('scans').update({ progress: 90 }).eq('id', currentScanId);

    // 14. Generate alerts if thresholds exceeded
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
    const depCritical = multiDepResult?.critical_count ?? 0;
    const depHigh = multiDepResult?.high_count ?? 0;
    const depEcosystems = multiDepResult?.ecosystems_scanned?.join(', ') ?? 'unknown';

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

    // Sensitive file alerts
    if (sensitiveFileResult && sensitiveFileResult.critical_count > 0) {
      const sensitiveFiles = sensitiveFileResult.findings
        .filter(f => f.severity === 'critical')
        .map(f => f.file_path)
        .slice(0, 5)
        .join(', ');
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'sensitive_file',
        title: `Sensitive files detected in ${repo.full_name}`,
        description: `${sensitiveFileResult.critical_count} sensitive file${sensitiveFileResult.critical_count > 1 ? 's' : ''} found: ${sensitiveFiles}. These files may contain credentials or private keys.`,
        status: 'active',
      });
    }

    // License compliance alerts
    if (licenseResult && licenseResult.strong_copyleft_count > 0) {
      const copyleftPkgs = licenseResult.findings
        .filter(f => f.risk === 'strong-copyleft')
        .map(f => `${f.package_name} (${f.license})`)
        .slice(0, 5)
        .join(', ');
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'medium',
        category: 'license',
        title: `Copyleft license dependencies in ${repo.full_name}`,
        description: `${licenseResult.strong_copyleft_count} package${licenseResult.strong_copyleft_count > 1 ? 's' : ''} with strong copyleft licenses: ${copyleftPkgs}. These may require open-sourcing derivative works.`,
        status: 'active',
      });
    }

    // Infrastructure security alerts
    if (infraResult && (infraResult.critical_count > 0 || infraResult.high_count > 0)) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        severity: 'high',
        category: 'infrastructure',
        title: `Infrastructure security issues in ${repo.full_name}`,
        description: `${infraResult.critical_count + infraResult.high_count} critical/high infrastructure finding${(infraResult.critical_count + infraResult.high_count) > 1 ? 's' : ''} in Dockerfiles or CI/CD workflows.`,
        status: 'active',
      });
    }

    if (alertInserts.length > 0) {
      await admin.from('alerts').insert(alertInserts);
    }

    // 15. Update scan as completed
    const totalVulns = totalVulnCritical + totalVulnHigh + totalVulnMedium + totalVulnLow;
    const completedSummary = {
      total_files_scanned: scanResults.length,
      ai_files_detected: aiFilesDetected,
      total_loc: totalLoc,
      total_ai_loc: totalAiLoc,
      ai_loc_percentage: aiLocPct,
      debt_score: debtScore.score,
      risk_zone: debtScore.risk_zone,
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
      } : null,
      sensitive_files: sensitiveFileResult && sensitiveFileResult.total_findings > 0 ? sensitiveFileResult : null,
      license_compliance: licenseResult && licenseResult.total_packages > 0 ? licenseResult : null,
      infrastructure: infraResult,
    };

    await admin.from('scans').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      summary: completedSummary as unknown as Json,
    }).eq('id', currentScanId);

    // 16. Clean up — delete the storage object after successful processing
    await admin.storage.from('scan-uploads').remove([storageKey]);

    // 17. Update repository last_scan fields
    await admin.from('repositories').update({
      last_scan_at: new Date().toISOString(),
      last_scan_status: 'completed',
    }).eq('id', repo.id);

    // 18. No contributor analysis for uploads (no git history available)

    console.log(`[Upload Processor] Completed scan ${currentScanId} — ${scanResults.length} files, score: ${debtScore.score}`);

    return {
      success: true,
      scan_id: currentScanId,
      message: 'Scan completed',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Upload Processor] Failed for scan ${currentScanId}:`, errorMessage);

    await admin.from('scans').update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq('id', currentScanId);

    return {
      success: false,
      scan_id: currentScanId,
      message: 'Scan failed',
      error: errorMessage,
    };
  }
}
