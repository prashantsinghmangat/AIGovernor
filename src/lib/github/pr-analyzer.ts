import type { Octokit } from '@octokit/rest';
import { detectAICode } from '@/lib/detection/combined-scorer';
import { detectVulnerabilities } from '@/lib/detection/vulnerability-detector';
import { detectCodeQuality } from '@/lib/detection/code-quality/detector';
import { detectEnhancements } from '@/lib/detection/enhancements/detector';
import { detectPii } from '@/lib/detection/pii/detector';

// File extensions we analyze
const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'rb',
  'php', 'cs', 'cpp', 'c', 'h', 'hpp', 'swift', 'kt', 'scala',
  'vue', 'svelte', 'dart', 'lua', 'sh', 'bash', 'sql',
]);

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

/** A single file changed in a PR */
export interface PRChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

/** Finding from analyzing a single PR file */
export interface PRFileFinding {
  file_path: string;
  language: string;
  status: string;
  additions: number;
  deletions: number;
  total_loc: number;
  ai_probability: number;
  ai_loc: number;
  risk_level: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    findings: Array<{
      rule_id: string;
      severity: string;
      message: string;
      line?: number;
      category: string;
      cwe?: string;
    }>;
  };
  code_quality: {
    grade: string;
    errors: number;
    warnings: number;
    infos: number;
    findings: Array<{
      rule_id: string;
      severity: string;
      message: string;
      line?: number;
      category: string;
    }>;
  };
  enhancements: {
    high_impact: number;
    medium_impact: number;
    low_impact: number;
    suggestions: Array<{
      rule_id: string;
      impact: string;
      title: string;
      recommendation: string;
      category: string;
    }>;
  };
  pii: {
    total: number;
    findings: Array<{
      type: string;
      severity: string;
      line?: number;
      message: string;
    }>;
  } | null;
}

/** Full PR analysis result */
export interface PRAnalysisResult {
  pr_number: number;
  head_sha: string;
  base_sha: string;
  total_files_changed: number;
  files_analyzed: number;
  total_additions: number;
  total_deletions: number;
  file_findings: PRFileFinding[];
  summary: {
    total_vulnerabilities: { critical: number; high: number; medium: number; low: number; total: number };
    total_quality_issues: { errors: number; warnings: number; infos: number; worst_grade: string };
    total_enhancements: { high: number; medium: number; low: number; total: number };
    total_ai_loc: number;
    total_loc_analyzed: number;
    ai_loc_percentage: number;
    avg_ai_probability: number;
    pii_findings: number;
    risk_files: number; // files with high risk
  };
}

/**
 * Fetch the list of files changed in a PR
 */
export async function fetchPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRChangedFile[]> {
  const files: PRChangedFile[] = [];
  let page = 1;

  // Paginate to get all files (GitHub returns max 30 per page by default)
  while (true) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const f of data) {
      files.push({
        filename: f.filename,
        status: f.status as PRChangedFile['status'],
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
        previous_filename: f.previous_filename,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return files;
}

/**
 * Fetch the content of a file at a specific ref (commit SHA or branch)
 */
async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if ('content' in data && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Analyze all changed files in a PR.
 * Only analyzes code files (not removed/binary/config files).
 */
export async function analyzePRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  baseSha: string,
  prTitle: string = '',
): Promise<PRAnalysisResult> {
  const changedFiles = await fetchPRFiles(octokit, owner, repo, prNumber);

  const fileFindings: PRFileFinding[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  // Aggregate counters
  let totalVulnCritical = 0, totalVulnHigh = 0, totalVulnMedium = 0, totalVulnLow = 0;
  let totalQualityErrors = 0, totalQualityWarnings = 0, totalQualityInfos = 0;
  let worstGrade = 'A';
  const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
  let totalEnhHigh = 0, totalEnhMedium = 0, totalEnhLow = 0;
  let totalAiLoc = 0, totalLoc = 0;
  let totalPiiFindings = 0;
  let riskFiles = 0;
  let aiProbSum = 0;
  let analyzedCount = 0;

  for (const file of changedFiles) {
    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    // Skip removed files — nothing to analyze
    if (file.status === 'removed') continue;

    const ext = getFileExtension(file.filename);
    if (!CODE_EXTENSIONS.has(ext)) continue;

    // Fetch the HEAD version of the file (what the PR wants to merge)
    const content = await fetchFileContent(octokit, owner, repo, file.filename, headSha);
    if (!content) continue;

    const language = getLanguageFromExt(ext);
    const loc = content.split('\n').length;

    // Run all detectors on the file
    const detection = await detectAICode(content, language, prTitle);
    const vulns = detectVulnerabilities(content, language, file.filename);
    const quality = detectCodeQuality(content, language);
    const enhancements = detectEnhancements(content, language);
    const pii = detectPii(content, file.filename, language);

    const aiLoc = Math.round(loc * detection.combined_probability);

    // Aggregate
    totalVulnCritical += vulns.critical_count;
    totalVulnHigh += vulns.high_count;
    totalVulnMedium += vulns.medium_count;
    totalVulnLow += vulns.low_count;
    totalQualityErrors += quality.error_count;
    totalQualityWarnings += quality.warning_count;
    totalQualityInfos += quality.info_count;
    if (gradeOrder.indexOf(quality.quality_grade) > gradeOrder.indexOf(worstGrade)) {
      worstGrade = quality.quality_grade;
    }
    totalEnhHigh += enhancements.high_impact;
    totalEnhMedium += enhancements.medium_impact;
    totalEnhLow += enhancements.low_impact;
    totalAiLoc += aiLoc;
    totalLoc += loc;
    aiProbSum += detection.combined_probability;
    analyzedCount++;
    if (pii.total_findings > 0) totalPiiFindings += pii.total_findings;
    if (detection.risk_level === 'high') riskFiles++;

    fileFindings.push({
      file_path: file.filename,
      language,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      total_loc: loc,
      ai_probability: detection.combined_probability,
      ai_loc: aiLoc,
      risk_level: detection.risk_level,
      vulnerabilities: {
        critical: vulns.critical_count,
        high: vulns.high_count,
        medium: vulns.medium_count,
        low: vulns.low_count,
        findings: vulns.findings.map(f => ({
          rule_id: f.id,
          severity: f.severity,
          message: f.title,
          line: f.line,
          category: f.category,
          cwe: f.cwe,
        })),
      },
      code_quality: {
        grade: quality.quality_grade,
        errors: quality.error_count,
        warnings: quality.warning_count,
        infos: quality.info_count,
        findings: quality.findings.map(f => ({
          rule_id: f.id,
          severity: f.severity,
          message: f.title,
          line: f.line,
          category: f.category,
        })),
      },
      enhancements: {
        high_impact: enhancements.high_impact,
        medium_impact: enhancements.medium_impact,
        low_impact: enhancements.low_impact,
        suggestions: enhancements.suggestions.map(s => ({
          rule_id: s.id,
          impact: s.impact,
          title: s.title,
          recommendation: s.recommendation,
          category: s.category,
        })),
      },
      pii: pii.total_findings > 0 ? {
        total: pii.total_findings,
        findings: pii.findings.map(f => ({
          type: f.category,
          severity: f.severity,
          line: f.line,
          message: f.title,
        })),
      } : null,
    });
  }

  const totalVulns = totalVulnCritical + totalVulnHigh + totalVulnMedium + totalVulnLow;

  return {
    pr_number: prNumber,
    head_sha: headSha,
    base_sha: baseSha,
    total_files_changed: changedFiles.length,
    files_analyzed: analyzedCount,
    total_additions: totalAdditions,
    total_deletions: totalDeletions,
    file_findings: fileFindings,
    summary: {
      total_vulnerabilities: {
        critical: totalVulnCritical,
        high: totalVulnHigh,
        medium: totalVulnMedium,
        low: totalVulnLow,
        total: totalVulns,
      },
      total_quality_issues: {
        errors: totalQualityErrors,
        warnings: totalQualityWarnings,
        infos: totalQualityInfos,
        worst_grade: worstGrade,
      },
      total_enhancements: {
        high: totalEnhHigh,
        medium: totalEnhMedium,
        low: totalEnhLow,
        total: totalEnhHigh + totalEnhMedium + totalEnhLow,
      },
      total_ai_loc: totalAiLoc,
      total_loc_analyzed: totalLoc,
      ai_loc_percentage: totalLoc > 0 ? Math.round((totalAiLoc / totalLoc) * 100) : 0,
      avg_ai_probability: analyzedCount > 0 ? Math.round((aiProbSum / analyzedCount) * 100) / 100 : 0,
      pii_findings: totalPiiFindings,
      risk_files: riskFiles,
    },
  };
}
