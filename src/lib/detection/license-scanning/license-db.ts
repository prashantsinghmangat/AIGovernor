import type { LicenseRisk } from './types';

/**
 * License risk classifications based on SPDX identifiers.
 * Permissive: no restrictions on use in proprietary software.
 * Weak copyleft: copyleft applies only to modifications of the library itself.
 * Strong copyleft: derivative works must also be open-sourced.
 */
export const LICENSE_CLASSIFICATIONS: Record<string, LicenseRisk> = {
  // Permissive
  'MIT': 'permissive',
  'ISC': 'permissive',
  'BSD-2-Clause': 'permissive',
  'BSD-3-Clause': 'permissive',
  'Apache-2.0': 'permissive',
  '0BSD': 'permissive',
  'Unlicense': 'permissive',
  'CC0-1.0': 'permissive',
  'CC-BY-4.0': 'permissive',
  'CC-BY-3.0': 'permissive',
  'Zlib': 'permissive',
  'BlueOak-1.0.0': 'permissive',
  'Python-2.0': 'permissive',
  'PSF-2.0': 'permissive',
  'Artistic-2.0': 'permissive',
  'WTFPL': 'permissive',

  // Weak copyleft
  'LGPL-2.0': 'weak-copyleft',
  'LGPL-2.1': 'weak-copyleft',
  'LGPL-3.0': 'weak-copyleft',
  'LGPL-2.0-only': 'weak-copyleft',
  'LGPL-2.1-only': 'weak-copyleft',
  'LGPL-3.0-only': 'weak-copyleft',
  'LGPL-2.0-or-later': 'weak-copyleft',
  'LGPL-2.1-or-later': 'weak-copyleft',
  'LGPL-3.0-or-later': 'weak-copyleft',
  'MPL-2.0': 'weak-copyleft',
  'EPL-1.0': 'weak-copyleft',
  'EPL-2.0': 'weak-copyleft',
  'CDDL-1.0': 'weak-copyleft',
  'CDDL-1.1': 'weak-copyleft',

  // Strong copyleft
  'GPL-2.0': 'strong-copyleft',
  'GPL-3.0': 'strong-copyleft',
  'GPL-2.0-only': 'strong-copyleft',
  'GPL-3.0-only': 'strong-copyleft',
  'GPL-2.0-or-later': 'strong-copyleft',
  'GPL-3.0-or-later': 'strong-copyleft',
  'AGPL-3.0': 'strong-copyleft',
  'AGPL-3.0-only': 'strong-copyleft',
  'AGPL-3.0-or-later': 'strong-copyleft',
  'SSPL-1.0': 'strong-copyleft',
  'EUPL-1.2': 'strong-copyleft',
  'OSL-3.0': 'strong-copyleft',
};

/**
 * Normalize a license string to an SPDX-like identifier.
 * Handles common variations found in package.json files.
 */
export function normalizeLicense(raw: string): string {
  const trimmed = raw.trim();

  // Handle SPDX expression: "(MIT OR Apache-2.0)" → take first
  const orMatch = trimmed.match(/^\(?([^)]+?)\s+OR\s+/i);
  if (orMatch) return normalizeLicense(orMatch[1]);

  // Strip trailing "+" for "or later" style
  const cleaned = trimmed.replace(/\+$/, '');

  // Common aliases
  const aliases: Record<string, string> = {
    'Apache 2.0': 'Apache-2.0',
    'Apache License 2.0': 'Apache-2.0',
    'Apache-2': 'Apache-2.0',
    'BSD': 'BSD-2-Clause',
    'BSD-2': 'BSD-2-Clause',
    'BSD-3': 'BSD-3-Clause',
    'GPLv2': 'GPL-2.0',
    'GPLv3': 'GPL-3.0',
    'LGPLv2': 'LGPL-2.0',
    'LGPLv2.1': 'LGPL-2.1',
    'LGPLv3': 'LGPL-3.0',
    'AGPLv3': 'AGPL-3.0',
    'Public Domain': 'Unlicense',
  };

  return aliases[cleaned] ?? cleaned;
}

/**
 * Classify a license string into a risk category.
 */
export function classifyLicense(raw: string): LicenseRisk {
  const normalized = normalizeLicense(raw);
  return LICENSE_CLASSIFICATIONS[normalized] ?? 'unknown';
}
