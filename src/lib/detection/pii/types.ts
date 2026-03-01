export type PiiCategory =
  | 'credit-card'
  | 'ssn'
  | 'phone'
  | 'email'
  | 'date-of-birth'
  | 'passport'
  | 'iban'
  | 'health-id'
  | 'ip-address';

export type PiiSeverity = 'critical' | 'high' | 'medium';

export interface PiiFinding {
  category: PiiCategory;
  severity: PiiSeverity;
  title: string;
  description: string;
  remediation: string;
  file_path: string;
  line: number;
  /** Redacted match — never store actual PII */
  sample: string;
}

export interface PiiResult {
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  findings: PiiFinding[];
  categories_detected: PiiCategory[];
}
