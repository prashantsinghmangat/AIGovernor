import { createAdminSupabase } from '@/lib/supabase/admin';
import { createGitHubClient } from '@/lib/github/client';
import { decrypt } from '@/lib/utils/encryption';
import { detectAICode } from '@/lib/detection/combined-scorer';
import { detectVulnerabilities } from '@/lib/detection/vulnerability-detector';
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
    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        per_page: 5,
      });
      latestCommitMessage = commits.map(c => c.commit.message).join('\n');
      if (commits.length > 0) {
        commitSha = commits[0].sha;
      }
    } catch {
      console.log(`[Scan Processor] Could not fetch commits for ${repo.full_name} (may be empty)`);
    }

    // Store commit SHA on the scan record
    if (commitSha) {
      await admin.from('scans').update({ commit_sha: commitSha }).eq('id', scanId);
    }

    // 4. Get the file tree from the default branch
    let tree: Array<{ path: string; size: number }> = [];
    try {
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo: repoName,
        tree_sha: repo.default_branch,
        recursive: 'true',
      });
      tree = (treeData.tree || []).filter(
        (item): item is typeof item & { path: string; size: number } =>
          item.type === 'blob' &&
          !!item.path &&
          typeof item.size === 'number' &&
          item.size <= MAX_FILE_SIZE &&
          CODE_EXTENSIONS.has(getFileExtension(item.path!))
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

          const aiLoc = Math.round(loc * detection.combined_probability);
          totalLoc += loc;
          totalAiLoc += aiLoc;
          totalVulnCritical += vulnerabilities.critical_count;
          totalVulnHigh += vulnerabilities.high_count;
          totalVulnMedium += vulnerabilities.medium_count;
          totalVulnLow += vulnerabilities.low_count;

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
      vulnerabilities: {
        critical: totalVulnCritical,
        high: totalVulnHigh,
        medium: totalVulnMedium,
        low: totalVulnLow,
        total: totalVulns,
      },
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
