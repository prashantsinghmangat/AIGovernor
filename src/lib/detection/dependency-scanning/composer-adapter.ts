/**
 * Composer (PHP) dependency adapter for the multi-ecosystem dependency scanner.
 * Parses composer.json manifests and provides a built-in advisory database
 * for known vulnerable Packagist packages.
 */

import type { DependencyAdapter, Advisory } from './types';

// ---------------------------------------------------------------------------
// Advisory database — known vulnerable Composer/Packagist packages
// ---------------------------------------------------------------------------

const ADVISORY_DB: Record<string, Advisory[]> = {
  'laravel/framework': [
    {
      id: 'COMP-001',
      severity: 'high',
      title: 'Laravel Timing Attack on Password Reset',
      description:
        'Versions before 10.48.4 are vulnerable to timing attacks during password reset token comparison, potentially allowing attackers to guess valid tokens.',
      vulnerable_range: '<10.48.4',
      patched_version: '10.48.4',
      cve: 'CVE-2024-29291',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-29291',
    },
  ],
  'symfony/http-kernel': [
    {
      id: 'COMP-002',
      severity: 'medium',
      title: 'Symfony HTTP Kernel Debug Information Leak',
      description:
        'Versions before 6.4.4 can leak sensitive debug information in error responses, exposing internal paths, configuration, and environment details.',
      vulnerable_range: '<6.4.4',
      patched_version: '6.4.4',
      cve: 'CVE-2024-25118',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-25118',
    },
  ],
  'symfony/security-http': [
    {
      id: 'COMP-003',
      severity: 'high',
      title: 'Symfony Security HTTP Authentication Bypass',
      description:
        'Versions before 6.4.4 are vulnerable to authentication bypass via crafted requests that circumvent security firewall rules.',
      vulnerable_range: '<6.4.4',
      patched_version: '6.4.4',
      cve: 'CVE-2024-25117',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-25117',
    },
  ],
  'guzzlehttp/guzzle': [
    {
      id: 'COMP-004',
      severity: 'high',
      title: 'Guzzle Header Injection via Multiline Values',
      description:
        'Versions before 7.8.0 are vulnerable to header injection via multiline header values, allowing attackers to inject arbitrary HTTP headers.',
      vulnerable_range: '<7.8.0',
      patched_version: '7.8.0',
      cve: 'CVE-2023-29197',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-29197',
    },
  ],
  'guzzlehttp/psr7': [
    {
      id: 'COMP-005',
      severity: 'high',
      title: 'Guzzle PSR-7 Header Injection',
      description:
        'Versions before 2.4.5 are vulnerable to header injection via improper validation of multiline header values in PSR-7 message implementations.',
      vulnerable_range: '<2.4.5',
      patched_version: '2.4.5',
      cve: 'CVE-2023-29197',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-29197',
    },
  ],
  'monolog/monolog': [
    {
      id: 'COMP-006',
      severity: 'high',
      title: 'Monolog Arbitrary File Write via Log Injection',
      description:
        'Versions before 2.8.0 are vulnerable to arbitrary file write via crafted log messages that exploit log handler file paths.',
      vulnerable_range: '<2.8.0',
      patched_version: '2.8.0',
      cve: 'CVE-2022-23552',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-23552',
    },
  ],
  'league/flysystem': [
    {
      id: 'COMP-007',
      severity: 'critical',
      title: 'Flysystem Path Traversal',
      description:
        'Versions before 3.15.0 are vulnerable to path traversal attacks that allow reading or writing files outside the intended storage directory.',
      vulnerable_range: '<3.15.0',
      patched_version: '3.15.0',
      cve: 'CVE-2023-45311',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45311',
    },
  ],
  'phpmailer/phpmailer': [
    {
      id: 'COMP-008',
      severity: 'high',
      title: 'PHPMailer Header Injection',
      description:
        'Versions before 6.8.1 are vulnerable to email header injection via crafted sender or recipient addresses, enabling spam relay and phishing attacks.',
      vulnerable_range: '<6.8.1',
      patched_version: '6.8.1',
      cve: 'CVE-2023-6319',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-6319',
    },
  ],
};

// ---------------------------------------------------------------------------
// composer.json parser
// ---------------------------------------------------------------------------

/**
 * Parse a composer.json file and extract package names with version constraints.
 *
 * Merges both `require` and `require-dev` sections. Keys are vendor/package
 * names (e.g., "laravel/framework") and values are version constraints
 * (e.g., "^10.0").
 *
 * Non-package entries like "php" and "ext-*" are excluded.
 */
function parseComposerJson(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return deps;
  }

  const require = parsed.require as Record<string, string> | undefined;
  const requireDev = parsed['require-dev'] as Record<string, string> | undefined;

  const allDeps: Record<string, string> = {
    ...(require ?? {}),
    ...(requireDev ?? {}),
  };

  for (const [name, version] of Object.entries(allDeps)) {
    // Skip non-package entries (php version, extensions)
    if (name === 'php' || name.startsWith('ext-')) continue;
    deps.set(name, version);
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const composerAdapter: DependencyAdapter = {
  ecosystem: 'composer',
  manifestFiles: ['composer.json'],

  parseManifest(content: string): Map<string, string> {
    return parseComposerJson(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return ADVISORY_DB;
  },
};
