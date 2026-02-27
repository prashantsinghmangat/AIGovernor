/**
 * Multi-ecosystem dependency scanner orchestrator.
 *
 * Detects manifest files from the repository file tree, fetches their content,
 * and runs the appropriate ecosystem adapter against each one.
 */

import type {
  DependencyAdapter,
  DependencyVulnerability,
  EcosystemScanResult,
  MultiEcosystemScanResult,
} from './types';

import { npmAdapter } from './npm-adapter';
import { pipAdapter } from './pip-adapter';
import { mavenAdapter } from './maven-adapter';
import { goAdapter } from './go-adapter';
import { cargoAdapter } from './cargo-adapter';
import { gemfileAdapter } from './gemfile-adapter';
import { composerAdapter } from './composer-adapter';
import { nugetAdapter } from './nuget-adapter';

// ---------------------------------------------------------------------------
// Lightweight semver helpers — supports <, <=, >=, ranges, and || disjunction
// ---------------------------------------------------------------------------

function parseVersion(v: string): [number, number, number] | null {
  const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareTuples(
  a: [number, number, number],
  b: [number, number, number],
): -1 | 0 | 1 {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

/** Returns true if `version` < `target` */
export function versionLessThan(version: string, target: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(target);
  if (!a || !b) return false;
  return compareTuples(a, b) < 0;
}

/** Returns true if `version` <= `target` */
export function versionLessThanOrEqual(version: string, target: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(target);
  if (!a || !b) return false;
  return compareTuples(a, b) <= 0;
}

/** Returns true if `version` >= `target` */
export function versionGreaterThanOrEqual(version: string, target: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(target);
  if (!a || !b) return false;
  return compareTuples(a, b) >= 0;
}

/**
 * Clean version string — strip ^, ~, >=, etc. to get a bare version.
 */
export function cleanVersion(version: string): string | null {
  if (/^(workspace:|file:|git[+:]|https?:|ssh:|\*|latest)/.test(version)) return null;
  const cleaned = version.replace(/^[~^>=<|!\sv]+/, '').trim();
  const match = cleaned.match(/^(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Check if `version` satisfies a vulnerable range.
 *
 * Supported formats:
 *   "<3.0.5"                  — strictly less than
 *   "<=3.1.3"                 — less than or equal
 *   ">=1.0.0 <1.13.5"        — range (inclusive lower, exclusive upper)
 *   ">=1.0.0 <=1.13.4"       — range (inclusive both)
 *   "<=3.1.3 || >=9.0.0 <=9.0.6"  — disjunction of ranges
 */
function isVulnerable(version: string, range: string): boolean {
  // Handle || disjunction: if ANY sub-range matches, it's vulnerable
  if (range.includes('||')) {
    return range.split('||').some((sub) => isVulnerable(version, sub.trim()));
  }

  // Trim whitespace
  const r = range.trim();

  // Range: ">=X.Y.Z <A.B.C" or ">=X.Y.Z <=A.B.C"
  const rangeMatch = r.match(/^>=\s*(\S+)\s+(<=?)\s*(\S+)$/);
  if (rangeMatch) {
    const lower = rangeMatch[1];
    const op = rangeMatch[2];
    const upper = rangeMatch[3];
    const aboveLower = versionGreaterThanOrEqual(version, lower);
    const belowUpper = op === '<=' ? versionLessThanOrEqual(version, upper) : versionLessThan(version, upper);
    return aboveLower && belowUpper;
  }

  // Simple: "<=X.Y.Z"
  const lteMatch = r.match(/^<=\s*(.+)$/);
  if (lteMatch) return versionLessThanOrEqual(version, lteMatch[1]);

  // Simple: "<X.Y.Z"
  const ltMatch = r.match(/^<\s*(.+)$/);
  if (ltMatch) return versionLessThan(version, ltMatch[1]);

  return false;
}

// ---------------------------------------------------------------------------
// Registry of all ecosystem adapters
// ---------------------------------------------------------------------------

const ADAPTERS: DependencyAdapter[] = [
  npmAdapter,
  pipAdapter,
  mavenAdapter,
  goAdapter,
  cargoAdapter,
  gemfileAdapter,
  composerAdapter,
  nugetAdapter,
];

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Scan all dependencies across ecosystems.
 *
 * @param tree  The full git tree (array of { path }) — BEFORE code-extension filtering
 * @param fetchFile  Function to fetch file content by path from GitHub
 */
export async function scanAllDependencies(
  tree: Array<{ path: string }>,
  fetchFile: (path: string) => Promise<string | null>,
): Promise<MultiEcosystemScanResult> {
  const adapters = ADAPTERS;
  const results: EcosystemScanResult[] = [];

  // Build a set of all file paths (just the filename, not full path for matching)
  const filePaths = tree.map((f) => f.path);

  for (const adapter of adapters) {
    // Track directories we've already scanned for this adapter
    // (avoids scanning both package-lock.json AND package.json in same dir)
    const scannedDirs = new Set<string>();

    // Find matching manifest files in the tree
    for (const manifestName of adapter.manifestFiles) {
      // Match files at root or any depth (e.g., "package.json", "backend/requirements.txt")
      const matchingPaths = filePaths.filter((p) => {
        const filename = p.split('/').pop() || '';
        return filename === manifestName;
      });

      // For now, only scan root-level manifests (depth 0 or 1 directory)
      const rootManifests = matchingPaths.filter((p) => {
        const depth = p.split('/').length - 1;
        return depth <= 1;
      });

      for (const manifestPath of rootManifests) {
        // Skip if we already scanned a higher-priority manifest in this directory
        // (e.g., package-lock.json takes priority over package.json)
        const dir = manifestPath.split('/').slice(0, -1).join('/') || '.';
        if (scannedDirs.has(dir)) continue;
        try {
          const content = await fetchFile(manifestPath);
          if (!content) continue;

          const deps = adapter.parseManifest(content);
          if (deps.size === 0) continue;

          console.log(`[DepScanner] Scanning ${manifestPath} (${adapter.ecosystem}): ${deps.size} dependencies found`);

          const advisoryDb = adapter.getAdvisories();
          const findings: DependencyVulnerability[] = [];

          for (const [pkgName, versionSpec] of deps) {
            const advisories = advisoryDb[pkgName];
            if (!advisories) continue;

            const version = cleanVersion(versionSpec);
            if (!version) continue;

            for (const advisory of advisories) {
              if (isVulnerable(version, advisory.vulnerable_range)) {
                findings.push({
                  id: advisory.id,
                  ecosystem: adapter.ecosystem,
                  package_name: pkgName,
                  installed_version: versionSpec,
                  severity: advisory.severity,
                  title: advisory.title,
                  description: advisory.description,
                  vulnerable_range: advisory.vulnerable_range,
                  patched_version: advisory.patched_version,
                  cve: advisory.cve,
                  ghsa: advisory.ghsa,
                  url: advisory.url,
                });
              }
            }
          }

          scannedDirs.add(dir);

          results.push({
            ecosystem: adapter.ecosystem,
            manifest_file: manifestPath,
            scanned: true,
            total_dependencies: deps.size,
            total_findings: findings.length,
            critical_count: findings.filter((f) => f.severity === 'critical').length,
            high_count: findings.filter((f) => f.severity === 'high').length,
            medium_count: findings.filter((f) => f.severity === 'medium').length,
            low_count: findings.filter((f) => f.severity === 'low').length,
            findings,
          });
        } catch (err) {
          console.log(
            `[DepScanner] Error scanning ${manifestPath} (${adapter.ecosystem}):`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  }

  // Aggregate totals
  const allFindings = results.flatMap((r) => r.findings);
  return {
    ecosystems_scanned: [...new Set(results.map((r) => r.ecosystem))],
    total_dependencies: results.reduce((sum, r) => sum + r.total_dependencies, 0),
    total_findings: allFindings.length,
    critical_count: allFindings.filter((f) => f.severity === 'critical').length,
    high_count: allFindings.filter((f) => f.severity === 'high').length,
    medium_count: allFindings.filter((f) => f.severity === 'medium').length,
    low_count: allFindings.filter((f) => f.severity === 'low').length,
    findings: allFindings,
    per_ecosystem: results,
  };
}
