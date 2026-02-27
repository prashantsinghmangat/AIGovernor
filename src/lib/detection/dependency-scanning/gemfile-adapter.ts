/**
 * Gemfile dependency adapter for the multi-ecosystem dependency scanner.
 * Parses Ruby Gemfile manifests and provides a built-in advisory database
 * for known vulnerable RubyGems packages.
 */

import type { DependencyAdapter, Advisory } from './types';

// ---------------------------------------------------------------------------
// Advisory database — known vulnerable RubyGems packages
// ---------------------------------------------------------------------------

const ADVISORY_DB: Record<string, Advisory[]> = {
  rails: [
    {
      id: 'GEM-001',
      severity: 'high',
      title: 'Rails File Disclosure Vulnerability',
      description:
        'Versions before 7.0.8 are vulnerable to file disclosure via specially crafted requests that can expose sensitive file contents.',
      vulnerable_range: '<7.0.8',
      patched_version: '7.0.8',
      cve: 'CVE-2023-38037',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-38037',
    },
  ],
  devise: [
    {
      id: 'GEM-002',
      severity: 'medium',
      title: 'Devise Open Redirect on Sign-In',
      description:
        'Versions before 4.9.3 are vulnerable to open redirect attacks during the sign-in flow, allowing attackers to redirect users to malicious sites.',
      vulnerable_range: '<4.9.3',
      patched_version: '4.9.3',
      cve: 'CVE-2023-49960',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-49960',
    },
  ],
  nokogiri: [
    {
      id: 'GEM-003',
      severity: 'high',
      title: 'Nokogiri XXE / Memory Issues',
      description:
        'Versions before 1.15.6 are vulnerable to XML External Entity (XXE) injection and memory-related issues via crafted XML documents.',
      vulnerable_range: '<1.15.6',
      patched_version: '1.15.6',
      cve: 'CVE-2024-34459',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-34459',
    },
  ],
  puma: [
    {
      id: 'GEM-004',
      severity: 'critical',
      title: 'Puma HTTP Request Smuggling',
      description:
        'Versions before 6.4.2 are vulnerable to HTTP request smuggling via inconsistent interpretation of chunked transfer encoding.',
      vulnerable_range: '<6.4.2',
      patched_version: '6.4.2',
      cve: 'CVE-2024-21647',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21647',
    },
  ],
  rack: [
    {
      id: 'GEM-005',
      severity: 'medium',
      title: 'Rack ReDoS in Content-Type Parsing',
      description:
        'Versions before 3.0.9 are vulnerable to Regular Expression Denial of Service (ReDoS) via crafted Content-Type headers.',
      vulnerable_range: '<3.0.9',
      patched_version: '3.0.9',
      cve: 'CVE-2024-25126',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-25126',
    },
  ],
  actionpack: [
    {
      id: 'GEM-006',
      severity: 'high',
      title: 'Action Pack ReDoS Vulnerability',
      description:
        'Versions before 7.0.8 are vulnerable to Regular Expression Denial of Service (ReDoS) via crafted HTTP accept headers.',
      vulnerable_range: '<7.0.8',
      patched_version: '7.0.8',
      cve: 'CVE-2023-22799',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-22799',
    },
  ],
  activesupport: [
    {
      id: 'GEM-007',
      severity: 'high',
      title: 'Active Support File Disclosure',
      description:
        'Versions before 7.0.8 are vulnerable to file disclosure via crafted requests that exploit Active Support utilities.',
      vulnerable_range: '<7.0.8',
      patched_version: '7.0.8',
      cve: 'CVE-2023-38037',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-38037',
    },
  ],
  activerecord: [
    {
      id: 'GEM-008',
      severity: 'high',
      title: 'Active Record ReDoS Vulnerability',
      description:
        'Versions before 7.0.8 are vulnerable to Regular Expression Denial of Service (ReDoS) via crafted input in query construction.',
      vulnerable_range: '<7.0.8',
      patched_version: '7.0.8',
      cve: 'CVE-2023-22796',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-22796',
    },
  ],
  sidekiq: [
    {
      id: 'GEM-009',
      severity: 'medium',
      title: 'Sidekiq Reflected XSS',
      description:
        'Versions before 7.1.3 are vulnerable to reflected cross-site scripting (XSS) via the Sidekiq web UI dashboard.',
      vulnerable_range: '<7.1.3',
      patched_version: '7.1.3',
      cve: 'CVE-2023-26141',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-26141',
    },
  ],
  loofah: [
    {
      id: 'GEM-010',
      severity: 'medium',
      title: 'Loofah XSS Sanitization Bypass',
      description:
        'Versions before 2.22.0 are vulnerable to cross-site scripting (XSS) via crafted HTML that bypasses the sanitization logic.',
      vulnerable_range: '<2.22.0',
      patched_version: '2.22.0',
      cve: 'CVE-2023-47627',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-47627',
    },
  ],
};

// ---------------------------------------------------------------------------
// Gemfile parser
// ---------------------------------------------------------------------------

/**
 * Parse a Gemfile and extract gem names with their version constraints.
 *
 * Handles common Gemfile patterns:
 *   gem 'rails', '~> 7.0'
 *   gem "devise", ">= 4.8"
 *   gem 'nokogiri'               (no version — stored as '*')
 *   gem 'puma', '~> 6.0', '>= 6.0.2'  (takes first constraint)
 *
 * Lines that are comments or do not match `gem '...'` are ignored.
 */
function parseGemfile(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match: gem 'name' or gem "name", optionally followed by a version string
    const match = trimmed.match(
      /^gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?/
    );
    if (!match) continue;

    const name = match[1];
    const version = match[2] || '*';
    deps.set(name, version);
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const gemfileAdapter: DependencyAdapter = {
  ecosystem: 'rubygems',
  manifestFiles: ['Gemfile'],

  parseManifest(content: string): Map<string, string> {
    return parseGemfile(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return ADVISORY_DB;
  },
};
