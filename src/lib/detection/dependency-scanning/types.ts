/**
 * Shared types for multi-ecosystem dependency scanning.
 */

export type DepVulnSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Advisory {
  id: string;
  severity: DepVulnSeverity;
  title: string;
  description: string;
  vulnerable_range: string;
  patched_version: string | null;
  cve?: string;
  ghsa?: string;
  url?: string;
}

export interface DependencyVulnerability {
  id: string;
  ecosystem: string;
  package_name: string;
  installed_version: string;
  severity: DepVulnSeverity;
  title: string;
  description: string;
  vulnerable_range: string;
  patched_version: string | null;
  cve?: string;
  ghsa?: string;
  url?: string;
}

export interface EcosystemScanResult {
  ecosystem: string;
  manifest_file: string;
  scanned: boolean;
  total_dependencies: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  findings: DependencyVulnerability[];
}

export interface MultiEcosystemScanResult {
  ecosystems_scanned: string[];
  total_dependencies: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  findings: DependencyVulnerability[];
  per_ecosystem: EcosystemScanResult[];
}

/**
 * Each ecosystem adapter implements this interface.
 */
export interface DependencyAdapter {
  ecosystem: string;
  /** File names this adapter handles (e.g., ['package.json']) */
  manifestFiles: string[];
  /** Parse a manifest file and return package→version map */
  parseManifest(content: string): Map<string, string>;
  /** Return the built-in advisory database */
  getAdvisories(): Record<string, Advisory[]>;
}
