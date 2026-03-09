import type { Octokit } from '@octokit/rest';
import type { PRAnalysisResult, PRFileFinding } from './pr-analyzer';

const COMMENT_HEADER = '## 🔍 CodeGuard AI — PR Analysis Report';
const BOT_SIGNATURE = '\n\n---\n*Automated by [CodeGuard AI](https://codeguard.ai) • AI Code Governance*';

/**
 * Severity badge emoji mapping
 */
function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
}

/**
 * Build the main PR summary comment body
 */
function buildSummaryComment(analysis: PRAnalysisResult): string {
  const { summary } = analysis;
  const lines: string[] = [COMMENT_HEADER, ''];

  // Overview stats
  lines.push(`**${analysis.total_files_changed}** files changed (${analysis.files_analyzed} analyzed) • **+${analysis.total_additions}** / **-${analysis.total_deletions}** lines`);
  lines.push('');

  // Vulnerability summary
  const { total_vulnerabilities: vulns } = summary;
  if (vulns.total > 0) {
    lines.push('### Security Vulnerabilities');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    if (vulns.critical > 0) lines.push(`| ${severityIcon('critical')} Critical | ${vulns.critical} |`);
    if (vulns.high > 0) lines.push(`| ${severityIcon('high')} High | ${vulns.high} |`);
    if (vulns.medium > 0) lines.push(`| ${severityIcon('medium')} Medium | ${vulns.medium} |`);
    if (vulns.low > 0) lines.push(`| ${severityIcon('low')} Low | ${vulns.low} |`);
    lines.push('');
  } else {
    lines.push('### ✅ No Security Vulnerabilities Detected');
    lines.push('');
  }

  // Code quality
  const { total_quality_issues: quality } = summary;
  if (quality.errors > 0 || quality.warnings > 0) {
    lines.push('### Code Quality');
    lines.push(`Worst grade: **${quality.worst_grade}** • ${quality.errors} error(s), ${quality.warnings} warning(s), ${quality.infos} info(s)`);
    lines.push('');
  }

  // AI code detection
  if (summary.ai_loc_percentage > 0) {
    lines.push('### AI-Generated Code');
    lines.push(`**${summary.ai_loc_percentage}%** of analyzed code appears AI-generated (${summary.total_ai_loc}/${summary.total_loc_analyzed} LOC)`);
    if (summary.risk_files > 0) {
      lines.push(`⚠️ **${summary.risk_files}** file(s) flagged as high-risk AI code`);
    }
    lines.push('');
  }

  // Enhancement suggestions
  if (summary.total_enhancements.total > 0) {
    lines.push('### Enhancement Suggestions');
    const parts: string[] = [];
    if (summary.total_enhancements.high > 0) parts.push(`${summary.total_enhancements.high} high-impact`);
    if (summary.total_enhancements.medium > 0) parts.push(`${summary.total_enhancements.medium} medium-impact`);
    if (summary.total_enhancements.low > 0) parts.push(`${summary.total_enhancements.low} low-impact`);
    lines.push(`${summary.total_enhancements.total} suggestion(s): ${parts.join(', ')}`);
    lines.push('');
  }

  // PII warnings
  if (summary.pii_findings > 0) {
    lines.push(`### ⚠️ PII Detected`);
    lines.push(`**${summary.pii_findings}** potential PII finding(s) in changed files. Review for GDPR/HIPAA/PCI-DSS compliance.`);
    lines.push('');
  }

  // Per-file breakdown (only files with issues)
  const filesWithIssues = analysis.file_findings.filter(f =>
    f.vulnerabilities.critical + f.vulnerabilities.high + f.vulnerabilities.medium > 0 ||
    f.code_quality.errors > 0 ||
    f.ai_probability > 0.5 ||
    (f.pii && f.pii.total > 0)
  );

  if (filesWithIssues.length > 0) {
    lines.push('<details>');
    lines.push(`<summary><strong>📁 File Details (${filesWithIssues.length} files with findings)</strong></summary>`);
    lines.push('');
    lines.push('| File | Vulns | Quality | AI % | PII |');
    lines.push('|------|-------|---------|------|-----|');
    for (const f of filesWithIssues.slice(0, 30)) {
      const vulnCount = f.vulnerabilities.critical + f.vulnerabilities.high + f.vulnerabilities.medium + f.vulnerabilities.low;
      const qualityStr = f.code_quality.errors > 0 ? `${f.code_quality.grade} (${f.code_quality.errors}E)` : f.code_quality.grade;
      const aiStr = `${Math.round(f.ai_probability * 100)}%`;
      const piiStr = f.pii ? `${f.pii.total}` : '-';
      lines.push(`| \`${f.file_path}\` | ${vulnCount > 0 ? vulnCount : '✅'} | ${qualityStr} | ${aiStr} | ${piiStr} |`);
    }
    if (filesWithIssues.length > 30) {
      lines.push(`| ... and ${filesWithIssues.length - 30} more files | | | | |`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push(BOT_SIGNATURE);
  return lines.join('\n');
}

/**
 * Build inline review comments for critical/high findings on specific lines
 */
function buildInlineComments(
  analysis: PRAnalysisResult,
  headSha: string,
): Array<{
  path: string;
  line: number;
  body: string;
  side: 'RIGHT';
}> {
  const comments: Array<{
    path: string;
    line: number;
    body: string;
    side: 'RIGHT';
  }> = [];

  for (const file of analysis.file_findings) {
    // Inline comments for critical/high vulnerabilities
    for (const vuln of file.vulnerabilities.findings) {
      if ((vuln.severity === 'critical' || vuln.severity === 'high') && vuln.line) {
        comments.push({
          path: file.file_path,
          line: vuln.line,
          body: `${severityIcon(vuln.severity)} **${vuln.severity.toUpperCase()} Vulnerability** — ${vuln.message}\n\nCategory: \`${vuln.category}\`${vuln.cwe ? ` • CWE: ${vuln.cwe}` : ''}`,
          side: 'RIGHT',
        });
      }
    }

    // Inline comments for code quality errors
    for (const q of file.code_quality.findings) {
      if (q.severity === 'error' && q.line) {
        comments.push({
          path: file.file_path,
          line: q.line,
          body: `⚠️ **Code Quality Issue** — ${q.message}\n\nCategory: \`${q.category}\``,
          side: 'RIGHT',
        });
      }
    }

    // Inline comments for PII
    if (file.pii) {
      for (const p of file.pii.findings) {
        if ((p.severity === 'critical' || p.severity === 'high') && p.line) {
          comments.push({
            path: file.file_path,
            line: p.line,
            body: `${severityIcon(p.severity)} **PII Detected** — ${p.message}\n\nType: \`${p.type}\` • Review for compliance requirements.`,
            side: 'RIGHT',
          });
        }
      }
    }
  }

  // Limit to 25 inline comments to avoid spamming
  return comments.slice(0, 25);
}

/**
 * Post PR analysis results as a review with inline comments on GitHub.
 * - Posts a summary comment as a PR review body
 * - Adds inline comments on specific lines for critical/high findings
 */
export async function postPRReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  analysis: PRAnalysisResult,
): Promise<{ review_id: number; comments_posted: number }> {
  const summaryBody = buildSummaryComment(analysis);
  const inlineComments = buildInlineComments(analysis, analysis.head_sha);

  // Determine review event based on findings
  const hasCritical = analysis.summary.total_vulnerabilities.critical > 0 ||
    analysis.summary.pii_findings > 0;
  const hasHigh = analysis.summary.total_vulnerabilities.high > 0;

  // REQUEST_CHANGES for critical issues, COMMENT for everything else
  // (We don't APPROVE — that's for humans)
  const event = hasCritical ? 'REQUEST_CHANGES' as const :
    hasHigh ? 'COMMENT' as const : 'COMMENT' as const;

  try {
    const { data: review } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: analysis.head_sha,
      body: summaryBody,
      event,
      comments: inlineComments.map(c => ({
        path: c.path,
        line: c.line,
        body: c.body,
        side: c.side,
      })),
    });

    return {
      review_id: review.id,
      comments_posted: inlineComments.length,
    };
  } catch (err) {
    // If review with inline comments fails (e.g., line not in diff),
    // fall back to just posting the summary as a regular comment
    console.warn(
      `[PR Comments] Review with inline comments failed, posting summary only:`,
      err instanceof Error ? err.message : err,
    );

    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: summaryBody,
      });

      return { review_id: 0, comments_posted: 0 };
    } catch (commentErr) {
      console.error(
        `[PR Comments] Failed to post summary comment:`,
        commentErr instanceof Error ? commentErr.message : commentErr,
      );
      throw commentErr;
    }
  }
}

/**
 * Check if CodeGuard has already posted a review on this PR for the same commit.
 * Prevents duplicate reviews on the same commit.
 */
export async function hasExistingReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  commitSha: string,
): Promise<boolean> {
  try {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return reviews.some(
      r => r.commit_id === commitSha && r.body?.includes(COMMENT_HEADER),
    );
  } catch {
    return false;
  }
}
