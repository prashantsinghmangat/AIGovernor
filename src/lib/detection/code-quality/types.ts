/**
 * Types for the code quality detection module.
 */

export type QualitySeverity = 'error' | 'warning' | 'info';
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CodeQualityFinding {
  id: string;
  severity: QualitySeverity;
  category: string;
  title: string;
  description: string;
  suggestion: string;
  line?: number;
  matchedText?: string;
}

export interface CodeQualityResult {
  quality_grade: QualityGrade;
  total_findings: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  cyclomatic_complexity: number;
  max_function_length: number;
  max_nesting_depth: number;
  findings: CodeQualityFinding[];
  scanned: boolean;
}

export interface CodeQualityRule {
  id: string;
  severity: QualitySeverity;
  category: string;
  title: string;
  description: string;
  suggestion: string;
  pattern: RegExp;
  languages: string[] | '*';
}
