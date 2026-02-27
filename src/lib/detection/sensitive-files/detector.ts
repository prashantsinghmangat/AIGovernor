/**
 * Sensitive file detector — scans file paths for files that should not be
 * committed to repositories (env files, private keys, credential files, etc.).
 */

import type { SensitiveFileResult } from './types';
import { SENSITIVE_FILE_PATTERNS } from './patterns';

/**
 * Detect sensitive files from a list of file paths.
 * Uses path-based pattern matching (no content inspection needed).
 */
export function detectSensitiveFiles(
  filePaths: string[],
): SensitiveFileResult {
  const findings: SensitiveFileResult['findings'] = [];
  const seen = new Set<string>(); // Deduplicate by file path

  for (const filePath of filePaths) {
    if (seen.has(filePath)) continue;

    for (const pattern of SENSITIVE_FILE_PATTERNS) {
      if (pattern.pattern.test(filePath)) {
        seen.add(filePath);
        findings.push({
          file_path: filePath,
          severity: pattern.severity,
          category: pattern.category,
          title: pattern.title,
          description: pattern.description,
          remediation: pattern.remediation,
        });
        break; // One match per file is enough
      }
    }
  }

  return {
    total_findings: findings.length,
    critical_count: findings.filter((f) => f.severity === 'critical').length,
    high_count: findings.filter((f) => f.severity === 'high').length,
    medium_count: findings.filter((f) => f.severity === 'medium').length,
    low_count: findings.filter((f) => f.severity === 'low').length,
    findings,
    scanned: true,
  };
}
