export type LicenseRisk = 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'unknown';

export interface LicenseFinding {
  package_name: string;
  version: string;
  license: string;
  risk: LicenseRisk;
  ecosystem: string;
}

export interface LicenseResult {
  total_packages: number;
  permissive_count: number;
  weak_copyleft_count: number;
  strong_copyleft_count: number;
  unknown_count: number;
  /** Only non-permissive findings (copyleft + unknown) */
  findings: LicenseFinding[];
  scanned: boolean;
}
