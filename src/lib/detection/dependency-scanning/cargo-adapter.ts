/**
 * Rust / Cargo dependency adapter.
 *
 * Handles Cargo.toml manifest files, mapping crate dependencies to known
 * RustSec and CVE advisories.
 */

import type { Advisory, DependencyAdapter } from './types';

// ---------------------------------------------------------------------------
// Manifest parsing
// ---------------------------------------------------------------------------

/**
 * Parse a Cargo.toml file's `[dependencies]` section (as well as
 * `[dev-dependencies]` and `[build-dependencies]`).
 *
 * Supports the two most common formats:
 *
 * ```toml
 * [dependencies]
 * serde = "1.0"
 * tokio = { version = "1.18", features = ["full"] }
 * ```
 */
function parseCargoToml(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Split into lines for stateful section parsing.
  const lines = content.split('\n');

  let inDepsSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Detect section headers
    if (/^\[.*\]/.test(line)) {
      // We care about [dependencies], [dev-dependencies], [build-dependencies]
      // as well as target-specific variants like
      // [target.'cfg(unix)'.dependencies]
      inDepsSection = /\b(?:dev-)?(?:build-)?dependencies\]$/i.test(line);
      continue;
    }

    if (!inDepsSection) continue;

    // Skip blank lines and comments
    if (line === '' || line.startsWith('#')) continue;

    // Format 1: name = "version"
    const simpleMatch = line.match(
      /^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/
    );
    if (simpleMatch) {
      deps.set(simpleMatch[1], simpleMatch[2]);
      continue;
    }

    // Format 2: name = { version = "version", ... }
    const tableMatch = line.match(
      /^([a-zA-Z0-9_-]+)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"[^}]*\}/
    );
    if (tableMatch) {
      deps.set(tableMatch[1], tableMatch[2]);
      continue;
    }
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Advisory database
// ---------------------------------------------------------------------------

function buildAdvisories(): Record<string, Advisory[]> {
  return {
    hyper: [
      {
        id: 'CARGO-001',
        severity: 'high',
        title: 'hyper HTTP/2 Denial of Service',
        description:
          'hyper before 1.0.0 is vulnerable to a denial of service attack where an HTTP/2 peer can cause excessive CPU usage by sending an unbounded number of CONTINUATION frames, leading to resource exhaustion.',
        vulnerable_range: '<1.0.0',
        patched_version: '1.0.0',
        cve: 'CVE-2023-26964',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-26964',
      },
    ],

    tokio: [
      {
        id: 'CARGO-002',
        severity: 'medium',
        title: 'Tokio ReDoS via JoinHandle Abort',
        description:
          'Tokio before 1.18.6 is susceptible to a denial of service condition. When aborting a task with JoinHandle::abort, the task may be scheduled to run on a worker thread even after the JoinHandle has been dropped, consuming resources.',
        vulnerable_range: '<1.18.6',
        patched_version: '1.18.6',
        cve: 'CVE-2023-22466',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-22466',
      },
    ],

    regex: [
      {
        id: 'CARGO-003',
        severity: 'high',
        title: 'regex ReDoS in Regex Parsing',
        description:
          'The regex crate before 1.5.5 has an issue where a specially crafted regex pattern can cause exponential time complexity during parsing, leading to a denial of service.',
        vulnerable_range: '<1.5.5',
        patched_version: '1.5.5',
        cve: 'CVE-2022-24713',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-24713',
      },
    ],

    serde_json: [
      {
        id: 'CARGO-004',
        severity: 'medium',
        title: 'serde_json Stack Overflow on Deeply Nested Input',
        description:
          'serde_json before 1.0.60 can trigger a stack overflow when deserializing deeply nested JSON input, which an attacker could exploit to crash applications that process untrusted JSON.',
        vulnerable_range: '<1.0.60',
        patched_version: '1.0.60',
        cve: undefined,
        url: 'https://rustsec.org/advisories/RUSTSEC-2019-0032.html',
      },
    ],

    ring: [
      {
        id: 'CARGO-005',
        severity: 'medium',
        title: 'ring Timing Side-Channel in RSA',
        description:
          'Versions of ring before 0.17.0 contain a timing side-channel in the RSA implementation that could allow an attacker to recover private key information through carefully timed observations.',
        vulnerable_range: '<0.17.0',
        patched_version: '0.17.0',
        cve: undefined,
        url: 'https://rustsec.org/advisories/RUSTSEC-2023-0065.html',
      },
    ],

    rustls: [
      {
        id: 'CARGO-006',
        severity: 'high',
        title: 'rustls TLS Denial of Service',
        description:
          'rustls before 0.21.11 is vulnerable to a denial of service attack where a malicious client or server can send a large number of TLS records with a small payload, causing excessive memory allocation and CPU usage.',
        vulnerable_range: '<0.21.11',
        patched_version: '0.21.11',
        cve: 'CVE-2024-32650',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-32650',
      },
    ],

    axum: [
      {
        id: 'CARGO-007',
        severity: 'high',
        title: 'axum DoS via Multipart Parsing',
        description:
          'axum before 0.7.0 is susceptible to a denial of service when handling multipart form data. A specially crafted multipart request can cause unbounded memory allocation, allowing an attacker to exhaust server resources.',
        vulnerable_range: '<0.7.0',
        patched_version: '0.7.0',
        cve: 'CVE-2023-5168',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-5168',
      },
    ],

    chrono: [
      {
        id: 'CARGO-008',
        severity: 'medium',
        title: 'chrono localtime_r Unsoundness',
        description:
          'chrono before 0.4.20 calls localtime_r on Unix platforms, which is not thread-safe in all cases. On certain platforms this can lead to data races and undefined behavior in multi-threaded programs.',
        vulnerable_range: '<0.4.20',
        patched_version: '0.4.20',
        cve: undefined,
        url: 'https://rustsec.org/advisories/RUSTSEC-2020-0159.html',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const cargoAdapter: DependencyAdapter = {
  ecosystem: 'cargo',
  manifestFiles: ['Cargo.toml'],

  parseManifest(content: string): Map<string, string> {
    return parseCargoToml(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return buildAdvisories();
  },
};
