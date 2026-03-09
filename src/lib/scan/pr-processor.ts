import { createAdminSupabase } from '@/lib/supabase/admin';
import { createGitHubClient } from '@/lib/github/client';
import { decrypt } from '@/lib/utils/encryption';
import { analyzePRDiff } from '@/lib/github/pr-analyzer';
import { postPRReview, hasExistingReview } from '@/lib/github/pr-comments';
import type { Json } from '@/types/database';

interface PRMetadata {
  pr_number: number;
  pr_id: number;
  title: string;
  author: string;
  state: string;
  head_sha: string;
  base_sha: string;
  head_ref: string;
  base_ref: string;
  created_at: string;
  action: string;
}

/**
 * Process a PR-type scan. Instead of scanning the entire repo, this:
 * 1. Fetches only the files changed in the PR
 * 2. Runs all detectors on those files
 * 3. Posts findings as a GitHub PR review with inline comments
 * 4. Saves analysis to the pull_requests table
 */
export async function processPRScan(scanId: string): Promise<{
  success: boolean;
  scan_id: string;
  message: string;
  error?: string;
}> {
  const admin = createAdminSupabase();

  // Fetch the scan record with repository info
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
    default_branch: string;
  };

  const prMetadata = scan.pr_metadata as unknown as PRMetadata | null;

  if (!prMetadata?.pr_number) {
    // No PR metadata — fall back to regular scan
    return { success: false, scan_id: scanId, message: 'No PR metadata found, cannot run PR scan' };
  }

  // Mark scan as running
  await admin.from('scans').update({
    status: 'running',
    started_at: new Date().toISOString(),
    progress: 5,
  }).eq('id', scanId);

  console.log(`[PR Processor] Started PR scan ${scanId} for ${repo.full_name}#${prMetadata.pr_number}`);

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

    await admin.from('scans').update({ progress: 10 }).eq('id', scanId);

    // 2. Check if we already reviewed this commit (prevent duplicates)
    const alreadyReviewed = await hasExistingReview(
      octokit, owner, repoName, prMetadata.pr_number, prMetadata.head_sha,
    );

    if (alreadyReviewed) {
      console.log(`[PR Processor] Already reviewed ${repo.full_name}#${prMetadata.pr_number} @ ${prMetadata.head_sha.slice(0, 7)}`);
      await admin.from('scans').update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        summary: { skipped: true, reason: 'Already reviewed this commit' } as unknown as Json,
      }).eq('id', scanId);
      return { success: true, scan_id: scanId, message: 'Already reviewed — skipped' };
    }

    await admin.from('scans').update({ progress: 20 }).eq('id', scanId);

    // 3. Analyze the PR diff
    const analysis = await analyzePRDiff(
      octokit, owner, repoName,
      prMetadata.pr_number,
      prMetadata.head_sha,
      prMetadata.base_sha,
      prMetadata.title,
    );

    await admin.from('scans').update({ progress: 70 }).eq('id', scanId);

    console.log(
      `[PR Processor] Analyzed ${analysis.files_analyzed}/${analysis.total_files_changed} files for PR #${prMetadata.pr_number}`,
    );

    // 4. Post GitHub PR review with inline comments
    let reviewId = 0;
    let commentsPosted = 0;

    try {
      const reviewResult = await postPRReview(
        octokit, owner, repoName, prMetadata.pr_number, analysis,
      );
      reviewId = reviewResult.review_id;
      commentsPosted = reviewResult.comments_posted;
      console.log(`[PR Processor] Posted review ${reviewId} with ${commentsPosted} inline comments`);
    } catch (reviewErr) {
      console.error(`[PR Processor] Failed to post review:`, reviewErr instanceof Error ? reviewErr.message : reviewErr);
      // Continue — we still save analysis results even if posting fails
    }

    await admin.from('scans').update({ progress: 85 }).eq('id', scanId);

    // 5. Upsert pull_requests record
    const aiGenerated = analysis.summary.avg_ai_probability > 0.5;
    const { data: existingPR } = await admin
      .from('pull_requests')
      .select('id')
      .eq('repository_id', repo.id)
      .eq('github_pr_id', prMetadata.pr_id)
      .single();

    const prRecord = {
      company_id: repo.company_id,
      repository_id: repo.id,
      github_pr_number: prMetadata.pr_number,
      github_pr_id: prMetadata.pr_id,
      title: prMetadata.title,
      author: prMetadata.author,
      state: prMetadata.state,
      ai_generated: aiGenerated,
      ai_probability: analysis.summary.avg_ai_probability,
      ai_loc_added: analysis.summary.total_ai_loc,
      total_loc_added: analysis.total_additions,
      files_changed: analysis.total_files_changed,
      scan_id: scanId,
      findings_posted: reviewId > 0 || commentsPosted >= 0,
      findings_summary: JSON.parse(JSON.stringify(analysis.summary)) as Json,
      analyzed_at: new Date().toISOString(),
      pr_created_at: prMetadata.created_at || null,
    };

    if (existingPR) {
      await admin.from('pull_requests').update(prRecord).eq('id', existingPR.id);
    } else {
      await admin.from('pull_requests').insert(prRecord);
    }

    // 6. Generate alerts for critical findings
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

    if (analysis.summary.total_vulnerabilities.critical > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_id: scanId,
        severity: 'high',
        category: 'pr_vulnerability',
        title: `Critical vulnerabilities in PR #${prMetadata.pr_number}: ${prMetadata.title}`,
        description: `${analysis.summary.total_vulnerabilities.critical} critical vulnerability finding(s) detected in PR by ${prMetadata.author}. Review required before merge.`,
        status: 'active',
      });
    }

    if (analysis.summary.pii_findings > 0) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_id: scanId,
        severity: 'high',
        category: 'pr_pii',
        title: `PII detected in PR #${prMetadata.pr_number}: ${prMetadata.title}`,
        description: `${analysis.summary.pii_findings} PII finding(s) in PR by ${prMetadata.author}. May violate compliance requirements.`,
        status: 'active',
      });
    }

    if (aiGenerated && analysis.summary.ai_loc_percentage > 70) {
      alertInserts.push({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_id: scanId,
        severity: 'medium',
        category: 'pr_ai_code',
        title: `High AI code ratio in PR #${prMetadata.pr_number}`,
        description: `${analysis.summary.ai_loc_percentage}% AI-generated code by ${prMetadata.author}. Human review recommended.`,
        status: 'active',
      });
    }

    if (alertInserts.length > 0) {
      await admin.from('alerts').insert(alertInserts);
    }

    // 7. Save scan results
    const summary = {
      scan_type: 'pr_scan',
      pr_number: prMetadata.pr_number,
      pr_title: prMetadata.title,
      pr_author: prMetadata.author,
      head_sha: prMetadata.head_sha,
      base_sha: prMetadata.base_sha,
      total_files_changed: analysis.total_files_changed,
      files_analyzed: analysis.files_analyzed,
      total_additions: analysis.total_additions,
      total_deletions: analysis.total_deletions,
      review_id: reviewId,
      comments_posted: commentsPosted,
      findings_posted: reviewId > 0,
      ...analysis.summary,
    };

    await admin.from('scans').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      commit_sha: prMetadata.head_sha,
      summary: summary as unknown as Json,
    }).eq('id', scanId);

    // 8. Insert per-file scan results for detailed view
    const scanResults = analysis.file_findings.map(f => ({
      scan_id: scanId,
      company_id: repo.company_id,
      repository_id: repo.id,
      file_path: f.file_path,
      language: f.language,
      total_loc: f.total_loc,
      ai_loc: f.ai_loc,
      ai_probability: f.ai_probability,
      risk_level: f.risk_level,
      detection_signals: JSON.parse(JSON.stringify({
        vulnerabilities: f.vulnerabilities,
        code_quality: f.code_quality,
        enhancements: f.enhancements,
        pii: f.pii,
        pr_file_status: f.status,
        pr_additions: f.additions,
        pr_deletions: f.deletions,
      })) as Json,
    }));

    if (scanResults.length > 0) {
      const BATCH_SIZE = 25;
      for (let i = 0; i < scanResults.length; i += BATCH_SIZE) {
        const batch = scanResults.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await admin.from('scan_results').insert(batch);
        if (insertError) {
          console.error(`[PR Processor] Batch insert error:`, insertError.message);
          for (const row of batch) {
            await admin.from('scan_results').insert(row);
          }
        }
      }
    }

    console.log(`[PR Processor] Completed PR scan ${scanId} — ${analysis.files_analyzed} files analyzed`);

    // 9. Send PR analysis notifications
    try {
      const { notifyPRAnalysis } = await import('@/lib/notifications/service');
      await notifyPRAnalysis(repo.company_id, repo.full_name, prMetadata.pr_number, prMetadata.title, {
        vulnerabilities_total: analysis.summary.total_vulnerabilities.total,
        ai_loc_percentage: analysis.summary.ai_loc_percentage,
        pii_findings: analysis.summary.pii_findings,
      });
    } catch (notifErr) {
      console.log(`[PR Processor] Notification error:`, notifErr instanceof Error ? notifErr.message : 'unknown');
    }

    return { success: true, scan_id: scanId, message: 'PR scan completed' };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PR Processor] Failed for scan ${scanId}:`, errorMessage);

    await admin.from('scans').update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq('id', scanId);

    return { success: false, scan_id: scanId, message: 'PR scan failed', error: errorMessage };
  }
}
