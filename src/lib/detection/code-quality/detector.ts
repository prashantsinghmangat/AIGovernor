/**
 * Code quality detector.
 *
 * Runs pattern-based rules and complexity analysis to produce a quality grade
 * and actionable findings with fix suggestions.
 */

import type { CodeQualityFinding, CodeQualityResult, CodeQualityRule, QualityGrade } from './types';
import {
  calculateCyclomaticComplexity,
  estimateMaxFunctionLength,
  estimateMaxNestingDepth,
} from './complexity';

import { COMMON_QUALITY_RULES } from './rules/common-quality';
import { JS_TS_QUALITY_RULES } from './rules/js-ts-quality';
import { PYTHON_QUALITY_RULES } from './rules/python-quality';
import { JAVA_QUALITY_RULES } from './rules/java-quality';
import { GO_QUALITY_RULES } from './rules/go-quality';

// ---------------------------------------------------------------------------
// All quality rules
// ---------------------------------------------------------------------------

const ALL_QUALITY_RULES: CodeQualityRule[] = [
  ...COMMON_QUALITY_RULES,
  ...JS_TS_QUALITY_RULES,
  ...PYTHON_QUALITY_RULES,
  ...JAVA_QUALITY_RULES,
  ...GO_QUALITY_RULES,
];

// ---------------------------------------------------------------------------
// Grade calculation
// ---------------------------------------------------------------------------

function calculateGrade(
  errorCount: number,
  warningCount: number,
  complexity: number,
  maxFunctionLength: number,
): QualityGrade {
  // Weighted penalty score
  let penalty = errorCount * 10 + warningCount * 3;

  // Complexity penalties
  if (complexity > 50) penalty += 15;
  else if (complexity > 30) penalty += 8;
  else if (complexity > 20) penalty += 3;

  // Function length penalties
  if (maxFunctionLength > 100) penalty += 10;
  else if (maxFunctionLength > 50) penalty += 5;

  if (penalty === 0) return 'A';
  if (penalty <= 10) return 'B';
  if (penalty <= 25) return 'C';
  if (penalty <= 50) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

export function detectCodeQuality(
  code: string,
  language: string,
): CodeQualityResult {
  const findings: CodeQualityFinding[] = [];
  const lines = code.split('\n');

  // Run pattern-based rules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    for (const rule of ALL_QUALITY_RULES) {
      // Language filter
      if (rule.languages !== '*' && !rule.languages.includes(language)) continue;

      const match = line.match(rule.pattern);
      if (match) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          description: rule.description,
          suggestion: rule.suggestion,
          line: i + 1,
          matchedText: match[0].substring(0, 80),
        });
      }
    }
  }

  // Complexity analysis
  const complexity = calculateCyclomaticComplexity(code);
  const maxFunctionLength = estimateMaxFunctionLength(code);
  const maxNestingDepth = estimateMaxNestingDepth(code);

  // Add complexity-based findings
  if (complexity > 30) {
    findings.push({
      id: 'CQ-COMPLEXITY',
      severity: 'warning',
      category: 'complexity',
      title: 'High Cyclomatic Complexity',
      description: `File has cyclomatic complexity of ${complexity}. Highly complex code is harder to test and maintain.`,
      suggestion: 'Break complex logic into smaller functions with single responsibilities.',
    });
  }

  if (maxFunctionLength > 50) {
    findings.push({
      id: 'CQ-FUNC-LENGTH',
      severity: 'warning',
      category: 'complexity',
      title: 'Long Function Detected',
      description: `A function in this file spans ~${maxFunctionLength} lines. Long functions are hard to understand and test.`,
      suggestion: 'Extract logical sections into smaller helper functions.',
    });
  }

  if (maxNestingDepth > 5) {
    findings.push({
      id: 'CQ-NESTING',
      severity: 'warning',
      category: 'complexity',
      title: 'Deep Nesting Detected',
      description: `Code has a nesting depth of ${maxNestingDepth}. Deeply nested code is hard to follow.`,
      suggestion: 'Use early returns, guard clauses, or extract nested blocks into functions.',
    });
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  return {
    quality_grade: calculateGrade(errorCount, warningCount, complexity, maxFunctionLength),
    total_findings: findings.length,
    error_count: errorCount,
    warning_count: warningCount,
    info_count: infoCount,
    cyclomatic_complexity: complexity,
    max_function_length: maxFunctionLength,
    max_nesting_depth: maxNestingDepth,
    findings,
    scanned: true,
  };
}
