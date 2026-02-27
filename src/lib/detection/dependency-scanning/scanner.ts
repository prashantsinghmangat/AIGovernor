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
// Lightweight semver helpers (handles simple "<X.Y.Z" ranges only)
// ---------------------------------------------------------------------------

function parseVersion(v: string): [number, number, number] | null {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

/** Returns true if `version` < `target` */
export function versionLessThan(version: string, target: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(target);
  if (!a || !b) return false;
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
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
 * Check if `version` satisfies a simple vulnerable range like "<3.0.5".
 * Only supports the `<X.Y.Z` format used in our advisory DB.
 */
function isVulnerable(version: string, range: string): boolean {
  const ltMatch = range.match(/^<\s*(.+)$/);
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
        try {
          const content = await fetchFile(manifestPath);
          if (!content) continue;

          const deps = adapter.parseManifest(content);
          if (deps.size === 0) continue;

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
