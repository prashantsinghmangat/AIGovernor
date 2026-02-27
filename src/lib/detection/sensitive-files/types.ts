export type SensitiveFileSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SensitiveFileFinding {
  file_path: string;
  severity: SensitiveFileSeverity;
  category: string;
  title: string;
  description: string;
  remediation: string;
}

export interface SensitiveFileResult {
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  findings: SensitiveFileFinding[];
  scanned: boolean;
}
