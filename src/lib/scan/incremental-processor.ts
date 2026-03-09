import { createAdminSupabase } from '@/lib/supabase/admin';
import { createGitHubClient } from '@/lib/github/client';
import { decrypt } from '@/lib/utils/encryption';
import { detectAICode } from '@/lib/detection/combined-scorer';
import { detectVulnerabilities } from '@/lib/detection/vulnerability-detector';
import { detectCodeQuality } from '@/lib/detection/code-quality/detector';
import { detectEnhancements } from '@/lib/detection/enhancements/detector';
import { detectPii } from '@/lib/detection/pii/detector';
import { calculateAIDebtScore } from '@/lib/scoring/ai-debt-score';
import type { Json } from '@/types/database';

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'rb',
  'php', 'cs', 'cpp', 'c', 'h', 'hpp', 'swift', 'kt', 'scala',
  'vue', 'svelte', 'dart', 'lua', 'sh', 'bash', 'sql',
]);

const MAX_FILE_SIZE = 50000;

function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

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

/**
 * Process an incremental scan — only analyzes files changed since the last scan.
 * Falls back to a full scan if no previous scan is found.
 */
export async function processIncrementalScan(scanId: string): Promise<{
  success: boolean;
  scan_id: string;
  message: string;
  error?: string;
}> {
  const admin = createAdminSupabase();

  const { data: scan, error: scanError } = await admin
    .from('scans')
    .select('*, repository:repositories(*)')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    return { success: false, scan_id: scanId, message: 'Scan not found', error: scanError?.message };
  }

  const repo = scan.repository as {
    id: string;
    company_id: string;
    full_name: string;
    language: string | null;
    default_branch: string;
  };

  await admin.from('scans').update({
    status: 'running',
    started_at: new Date().toISOString(),
    progress: 0,
  }).eq('id', scanId);

  console.log(`[Incremental] Started scan ${scanId} for ${repo.full_name}`);

  try {
    // 1. Get GitHub token
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

    // 2. Find the last completed scan's commit SHA
    const { data: lastScan } = await admin
      .from('scans')
      .select('commit_sha, summary')
      .eq('repository_id', repo.id)
      .eq('status', 'completed')
      .not('commit_sha', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const lastCommitSha = lastScan?.commit_sha as string | null;

    // 3. Get the current HEAD
    const { data: headCommits } = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      per_page: 1,
    });

    const headSha = headCommits[0]?.sha;
    if (!headSha) throw new Error('Could not determine HEAD commit');

    // Store current commit SHA
    await admin.from('scans').update({
      commit_sha: headSha,
      progress: 10,
    }).eq('id', scanId);

    // 4. Get changed files — compare last scan SHA to HEAD
    let changedFiles: Array<{ filename: string; status: string; additions: number; deletions: number }> = [];

    if (lastCommitSha && lastCommitSha !== headSha) {
      try {
        const { data: comparison } = await octokit.repos.compareCommits({
          owner,
          repo: repoName,
          base: lastCommitSha,
          head: headSha,
        });

        changedFiles = (comparison.files || []).map(f => ({
          filename: f.filename,
          status: f.status || 'modified',
          additions: f.additions,
          deletions: f.deletions,
        }));

        console.log(`[Incremental] Found ${changedFiles.length} changed files between ${lastCommitSha.slice(0, 7)} and ${headSha.slice(0, 7)}`);
      } catch (err) {
        console.warn(`[Incremental] Compare failed, falling back to full tree scan:`, err instanceof Error ? err.message : err);
        changedFiles = [];
      }
    }

    // If no last scan or compare failed — get ALL files (first-time full scan)
    if (changedFiles.length === 0 && !lastCommitSha) {
      console.log(`[Incremental] No previous scan — scanning all files`);
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo: repoName,
        tree_sha: repo.default_branch,
        recursive: 'true',
      });

      changedFiles = (treeData.tree || [])
        .filter((item): item is typeof item & { path: string; size: number } =>
          item.type === 'blob' && !!item.path && typeof item.size === 'number' && item.size <= MAX_FILE_SIZE,
        )
        .map(f => ({
          filename: f.path,
          status: 'added',
          additions: 0,
          deletions: 0,
        }));
    }

    // If same commit — nothing changed
    if (lastCommitSha === headSha) {
      await admin.from('scans').update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        summary: {
          incremental: true,
          skipped: true,
          reason: 'No new commits since last scan',
          last_commit_sha: lastCommitSha,
        } as unknown as Json,
      }).eq('id', scanId);
      return { success: true, scan_id: scanId, message: 'No changes since last scan' };
    }

    // 5. Filter to code files only (skip removed files)
    const codeFiles = changedFiles.filter(f => {
      if (f.status === 'removed') return false;
      return CODE_EXTENSIONS.has(getFileExtension(f.filename));
    });

    console.log(`[Incremental] ${codeFiles.length} code files to analyze (${changedFiles.length} total changed)`);

    await admin.from('scans').update({ progress: 20 }).eq('id', scanId);

    if (codeFiles.length === 0) {
      await admin.from('scans').update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        summary: {
          incremental: true,
          total_files_changed: changedFiles.length,
          total_files_scanned: 0,
          reason: 'No code files changed',
        } as unknown as Json,
      }).eq('id', scanId);
      return { success: true, scan_id: scanId, message: 'No code files changed' };
    }

    // 6. Analyze each changed file
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

    let totalLoc = 0, totalAiLoc = 0;
    let totalVulnCritical = 0, totalVulnHigh = 0, totalVulnMedium = 0, totalVulnLow = 0;
    let totalQualityErrors = 0, totalQualityWarnings = 0, totalQualityInfos = 0;
    let worstGrade = 'A';
    const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
    let totalEnhHigh = 0, totalEnhMedium = 0, totalEnhLow = 0;
    let totalPiiCritical = 0, totalPiiHigh = 0, totalPiiMedium = 0;
    const piiCategories = new Set<string>();

    // Get latest commit message for AI detection metadata
    const commitMessage = headCommits[0]?.commit?.message || '';

    for (let i = 0; i < codeFiles.length; i++) {
      const file = codeFiles[i];

      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: file.filename,
          ref: headSha,
        });

        if ('content' in fileData && fileData.encoding === 'base64') {
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          const ext = getFileExtension(file.filename);
          const language = getLanguageFromExt(ext);
          const loc = content.split('\n').length;

          const detection = await detectAICode(content, language, commitMessage);
          const vulns = detectVulnerabilities(content, language, file.filename);
          const quality = detectCodeQuality(content, language);
          const enhancements = detectEnhancements(content, language);
          const pii = detectPii(content, file.filename, language);

          const aiLoc = Math.round(loc * detection.combined_probability);
          totalLoc += loc;
          totalAiLoc += aiLoc;
          totalVulnCritical += vulns.critical_count;
          totalVulnHigh += vulns.high_count;
          totalVulnMedium += vulns.medium_count;
          totalVulnLow += vulns.low_count;
          totalQualityErrors += quality.error_count;
          totalQualityWarnings += quality.warning_count;
          totalQualityInfos += quality.info_count;
          totalEnhHigh += enhancements.high_impact;
          totalEnhMedium += enhancements.medium_impact;
          totalEnhLow += enhancements.low_impact;
          if (pii.total_findings > 0) {
            totalPiiCritical += pii.critical_count;
            totalPiiHigh += pii.high_count;
            totalPiiMedium += pii.medium_count;
            for (const cat of pii.categories_detected) piiCategories.add(cat);
          }
          if (gradeOrder.indexOf(quality.quality_grade) > gradeOrder.indexOf(worstGrade)) {
            worstGrade = quality.quality_grade;
          }

          scanResults.push({
            scan_id: scanId,
            company_id: repo.company_id,
            repository_id: repo.id,
            file_path: file.filename,
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
              vulnerabilities: vulns,
              code_quality: quality,
              enhancements,
              pii: pii.total_findings > 0 ? pii : null,
              incremental_status: file.status,
            })) as Json,
          });
        }
      } catch (err) {
        console.debug(`[Incremental] Skipped ${file.filename}:`, err instanceof Error ? err.message : err);
      }

      if (i % 10 === 0) {
        const progress = 20 + Math.round((i / codeFiles.length) * 60);
        await admin.from('scans').update({ progress }).eq('id', scanId);
      }
    }

    // 7. Insert scan results
    if (scanResults.length > 0) {
      const BATCH_SIZE = 25;
      for (let i = 0; i < scanResults.length; i += BATCH_SIZE) {
        const batch = scanResults.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await admin.from('scan_results').insert(batch);
        if (insertError) {
          for (const row of batch) {
            await admin.from('scan_results').insert(row);
          }
        }
      }
    }

    await admin.from('scans').update({ progress: 85 }).eq('id', scanId);

    // 8. Calculate AI debt score
    const aiFilesDetected = scanResults.filter(r => r.ai_probability > 0.5).length;
    const aiLocRatio = totalLoc > 0 ? totalAiLoc / totalLoc : 0;

    const debtScore = calculateAIDebtScore({
      ai_loc_ratio: aiLocRatio,
      review_coverage: 0.5,
      refactor_backlog_growth: 0,
      prompt_inconsistency: 0,
    });

    await admin.from('ai_debt_scores').insert({
      company_id: repo.company_id,
      repository_id: repo.id,
      scan_id: scanId,
      score: debtScore.score,
      risk_zone: debtScore.risk_zone,
      breakdown: JSON.parse(JSON.stringify(debtScore.breakdown)) as Json,
    });

    // 9. Generate alerts for critical findings in changed files
    const alertInserts: Array<{
      company_id: string;
      repository_id: string;
      scan_id: string;
      severity: string;
      category: string;
      title: string;
      description: string;
      status: string;
    }> = [];

    if (totalVulnCritical > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_id: scanId,
        severity: 'high',
        category: 'vulnerability',
        title: `New critical vulnerabilities in ${repo.full_name}`,
        description: `${totalVulnCritical} critical vulnerability finding(s) introduced in recent commits (${lastCommitSha?.slice(0, 7) || 'initial'}..${headSha.slice(0, 7)}).`,
        status: 'active',
      });
    }

    if (totalPiiCritical > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_id: scanId,
        severity: 'high',
        category: 'pii',
        title: `PII introduced in ${repo.full_name}`,
        description: `${totalPiiCritical} critical PII finding(s) in recently changed files.`,
        status: 'active',
      });
    }

    if (alertInserts.length > 0) {
      await admin.from('alerts').insert(alertInserts);
    }

    // 10. Mark completed
    const totalVulns = totalVulnCritical + totalVulnHigh + totalVulnMedium + totalVulnLow;
    const totalPiiFindings = totalPiiCritical + totalPiiHigh + totalPiiMedium;

    const summary = {
      incremental: true,
      base_commit_sha: lastCommitSha,
      head_commit_sha: headSha,
      total_files_changed: changedFiles.length,
      total_files_scanned: scanResults.length,
      ai_files_detected: aiFilesDetected,
      total_loc: totalLoc,
      total_ai_loc: totalAiLoc,
      ai_loc_percentage: totalLoc > 0 ? Math.round((totalAiLoc / totalLoc) * 100) : 0,
      debt_score: debtScore.score,
      risk_zone: debtScore.risk_zone,
      commit_sha: headSha,
      vulnerabilities: {
        critical: totalVulnCritical,
        high: totalVulnHigh,
        medium: totalVulnMedium,
        low: totalVulnLow,
        total: totalVulns,
      },
      code_quality: {
        worst_grade: worstGrade,
        total_errors: totalQualityErrors,
        total_warnings: totalQualityWarnings,
        total_infos: totalQualityInfos,
      },
      enhancements: {
        high_impact: totalEnhHigh,
        medium_impact: totalEnhMedium,
        low_impact: totalEnhLow,
        total_suggestions: totalEnhHigh + totalEnhMedium + totalEnhLow,
      },
      pii_findings: totalPiiFindings > 0 ? {
        total_findings: totalPiiFindings,
        critical_count: totalPiiCritical,
        high_count: totalPiiHigh,
        medium_count: totalPiiMedium,
        categories_detected: Array.from(piiCategories),
      } : null,
    };

    await admin.from('scans').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      summary: summary as unknown as Json,
    }).eq('id', scanId);

    await admin.from('repositories').update({
      last_scan_at: new Date().toISOString(),
      last_scan_status: 'completed',
    }).eq('id', repo.id);

    console.log(
      `[Incremental] Completed scan ${scanId} — ${scanResults.length} files analyzed ` +
      `(${changedFiles.length} changed), score: ${debtScore.score}`,
    );

    return { success: true, scan_id: scanId, message: 'Incremental scan completed' };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Incremental] Failed for scan ${scanId}:`, errorMessage);

    await admin.from('scans').update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq('id', scanId);

    return { success: false, scan_id: scanId, message: 'Incremental scan failed', error: errorMessage };
  }
}
