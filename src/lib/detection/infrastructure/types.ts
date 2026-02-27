export type InfraSeverity = 'critical' | 'high' | 'medium' | 'low';
export type InfraFileType = 'dockerfile' | 'github-actions' | 'docker-compose';

export interface InfraRule {
  id: string;
  severity: InfraSeverity;
  fileType: InfraFileType;
  title: string;
  description: string;
  remediation: string;
  pattern: RegExp;
  /** If true, the rule triggers when the pattern is NOT found in the file */
  negativeMatch?: boolean;
}

export interface InfraFinding {
  id: string;
  severity: InfraSeverity;
  fileType: InfraFileType;
  title: string;
  description: string;
  remediation: string;
  file_path: string;
  line?: number;
  matchedText?: string;
}

export interface InfraResult {
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  findings: InfraFinding[];
  scanned: boolean;
}
