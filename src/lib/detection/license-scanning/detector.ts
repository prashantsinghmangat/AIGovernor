/**
 * License compliance scanner.
 * Parses license information from package manifests and lockfiles,
 * classifies each dependency's license, and flags non-permissive ones.
 */

import type { LicenseResult, LicenseFinding, LicenseRisk } from './types';
import { classifyLicense } from './license-db';

/**
 * Scan npm dependencies for license compliance.
 *
 * @param lockfileContent  Content of package-lock.json (preferred) or package.json
 * @param isLockfile       True if content is a lockfile
 */
export function scanNpmLicenses(
  content: string,
  isLockfile: boolean,
): LicenseResult {
  const findings: LicenseFinding[] = [];
  let totalPackages = 0;
  let permissive = 0;
  let weakCopyleft = 0;
  let strongCopyleft = 0;
  let unknown = 0;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return emptyResult();
  }

  if (isLockfile) {
    // lockfileVersion 2/3: packages have "license" field
    const packages = parsed.packages as Record<string, { version?: string; license?: string | { type?: string } }> | undefined;
    if (packages) {
      for (const [key, meta] of Object.entries(packages)) {
        if (!key || !meta?.version) continue;

        // Extract package name from last node_modules/ segment
        const lastNmIdx = key.lastIndexOf('node_modules/');
        if (lastNmIdx === -1) continue;
        const pkgName = key.slice(lastNmIdx + 'node_modules/'.length);
        if (!pkgName || pkgName.startsWith('.')) continue;

        const licenseStr = typeof meta.license === 'string'
          ? meta.license
          : meta.license?.type ?? '';

        if (!licenseStr) {
          totalPackages++;
          unknown++;
          findings.push({
            package_name: pkgName,
            version: meta.version,
            license: 'UNLICENSED',
            risk: 'unknown',
            ecosystem: 'npm',
          });
          continue;
        }

        const risk = classifyLicense(licenseStr);
        totalPackages++;

        switch (risk) {
          case 'permissive': permissive++; break;
          case 'weak-copyleft': weakCopyleft++; break;
          case 'strong-copyleft': strongCopyleft++; break;
          default: unknown++; break;
        }

        // Only include non-permissive in findings
        if (risk !== 'permissive') {
          findings.push({
            package_name: pkgName,
            version: meta.version,
            license: licenseStr,
            risk,
            ecosystem: 'npm',
          });
        }
      }
    }
  } else {
    // package.json: check project license + dependency licenses (limited)
    const projectLicense = parsed.license as string | { type?: string } | undefined;
    if (projectLicense) {
      const licStr = typeof projectLicense === 'string' ? projectLicense : projectLicense.type ?? '';
      if (licStr) {
        const risk = classifyLicense(licStr);
        totalPackages++;
        if (risk === 'permissive') permissive++;
        else {
          if (risk === 'weak-copyleft') weakCopyleft++;
          else if (risk === 'strong-copyleft') strongCopyleft++;
          else unknown++;
          findings.push({
            package_name: (parsed.name as string) ?? 'project',
            version: (parsed.version as string) ?? '0.0.0',
            license: licStr,
            risk,
            ecosystem: 'npm',
          });
        }
      }
    }
  }

  return {
    total_packages: totalPackages,
    permissive_count: permissive,
    weak_copyleft_count: weakCopyleft,
    strong_copyleft_count: strongCopyleft,
    unknown_count: unknown,
    findings,
    scanned: true,
  };
}

function emptyResult(): LicenseResult {
  return {
    total_packages: 0,
    permissive_count: 0,
    weak_copyleft_count: 0,
    strong_copyleft_count: 0,
    unknown_count: 0,
    findings: [],
    scanned: false,
  };
}
