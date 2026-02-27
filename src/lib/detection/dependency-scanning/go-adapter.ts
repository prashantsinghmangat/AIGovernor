/**
 * Go module dependency adapter.
 *
 * Handles go.mod manifest files, mapping Go module dependencies to known
 * advisories.
 */

import type { Advisory, DependencyAdapter } from './types';

// ---------------------------------------------------------------------------
// Manifest parsing
// ---------------------------------------------------------------------------

/**
 * Parse a go.mod file.
 *
 * Supports both single-line `require module/path v1.2.3` directives and the
 * block form:
 * ```
 * require (
 *     module/path v1.2.3
 *     another/mod v0.4.0
 * )
 * ```
 *
 * The leading `v` is stripped from versions so that "v0.17.0" becomes "0.17.0".
 */
function parseGoMod(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Remove single-line and block comments
  const cleaned = content.replace(/\/\/.*$/gm, '');

  // --- Block require directives ---
  const blockRegex = /require\s*\(\s*([\s\S]*?)\)/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(cleaned)) !== null) {
    const blockBody = blockMatch[1];
    const lineRegex = /^\s*(\S+)\s+(v?\S+)/gm;
    let lineMatch: RegExpExecArray | null;

    while ((lineMatch = lineRegex.exec(blockBody)) !== null) {
      const modulePath = lineMatch[1];
      const version = lineMatch[2].replace(/^v/, '');
      deps.set(modulePath, version);
    }
  }

  // --- Single-line require directives (outside blocks) ---
  // Remove already-processed block sections so we don't double-count.
  const withoutBlocks = cleaned.replace(/require\s*\([\s\S]*?\)/g, '');
  const singleRegex = /^\s*require\s+(\S+)\s+(v?\S+)/gm;
  let singleMatch: RegExpExecArray | null;

  while ((singleMatch = singleRegex.exec(withoutBlocks)) !== null) {
    const modulePath = singleMatch[1];
    const version = singleMatch[2].replace(/^v/, '');
    deps.set(modulePath, version);
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Advisory database
// ---------------------------------------------------------------------------

function buildAdvisories(): Record<string, Advisory[]> {
  return {
    'golang.org/x/net': [
      {
        id: 'GO-001',
        severity: 'high',
        title: 'HTTP/2 Rapid Reset Denial of Service',
        description:
          'The HTTP/2 protocol allows a denial of service (server resource consumption) because request cancellation can reset many streams quickly, as exploited in the wild in August through October 2023.',
        vulnerable_range: '<0.17.0',
        patched_version: '0.17.0',
        cve: 'CVE-2023-44487',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-44487',
      },
    ],

    'golang.org/x/crypto': [
      {
        id: 'GO-002',
        severity: 'medium',
        title: 'Terrapin SSH Prefix Truncation Attack',
        description:
          'The SSH transport protocol with certain OpenSSH extensions allows remote attackers to bypass integrity checks such that some packets are omitted from the extension negotiation message, and a client and server may consequently end up with a connection for which some security features have been downgraded or disabled (Terrapin attack).',
        vulnerable_range: '<0.17.0',
        patched_version: '0.17.0',
        cve: 'CVE-2023-48795',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-48795',
      },
    ],

    'golang.org/x/text': [
      {
        id: 'GO-003',
        severity: 'high',
        title: 'ReDoS in Language Tag Parsing',
        description:
          'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse due to quadratic complexity in tag matching.',
        vulnerable_range: '<0.3.8',
        patched_version: '0.3.8',
        cve: 'CVE-2022-32149',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-32149',
      },
    ],

    'github.com/gin-gonic/gin': [
      {
        id: 'GO-004',
        severity: 'medium',
        title: 'Gin Header Injection via Redirects',
        description:
          'The Gin Web Framework before 1.9.1 allows an attacker to inject arbitrary headers into a response via a crafted redirect URL when the c.Redirect function is used.',
        vulnerable_range: '<1.9.1',
        patched_version: '1.9.1',
        cve: 'CVE-2023-29401',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-29401',
      },
    ],

    'google.golang.org/protobuf': [
      {
        id: 'GO-005',
        severity: 'medium',
        title: 'Protocol Buffers Infinite Loop',
        description:
          'The protojson.Unmarshal function can enter an infinite loop when unmarshaling certain forms of invalid JSON. This condition can occur when unmarshaling into a message which contains a google.protobuf.Any value, or when the UnmarshalOptions.DiscardUnknown option is set.',
        vulnerable_range: '<1.33.0',
        patched_version: '1.33.0',
        cve: 'CVE-2024-24786',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-24786',
      },
    ],

    'github.com/go-yaml/yaml': [
      {
        id: 'GO-006',
        severity: 'high',
        title: 'go-yaml Crash on Crafted Input',
        description:
          'An issue in the Unmarshal function in go-yaml v3 before 3.0.0 allows an attacker to cause a denial of service by providing a crafted YAML input that triggers a panic via a nil-pointer dereference.',
        vulnerable_range: '<3.0.0',
        patched_version: '3.0.0',
        cve: 'CVE-2022-28948',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-28948',
      },
    ],

    'github.com/dgrijalva/jwt-go': [
      {
        id: 'GO-007',
        severity: 'high',
        title: 'JWT Audience Validation Bypass',
        description:
          'jwt-go before 4.0.0-preview1 allows attackers to bypass intended access restrictions in situations with []string{} for m["aud"] (which is allowed by the specification). Because the meaning of audience is application-specific, the library cannot determine the correct behavior.',
        vulnerable_range: '<4.0.0',
        patched_version: null,
        cve: 'CVE-2020-26160',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-26160',
      },
    ],

    'github.com/gorilla/websocket': [
      {
        id: 'GO-008',
        severity: 'high',
        title: 'Gorilla WebSocket Integer Overflow',
        description:
          'An integer overflow vulnerability exists in the gorilla/websocket library before 1.5.1 that could allow an attacker to send specially crafted frames to cause a denial of service.',
        vulnerable_range: '<1.5.1',
        patched_version: '1.5.1',
        cve: 'CVE-2020-27813',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-27813',
      },
    ],

    'github.com/jackc/pgx': [
      {
        id: 'GO-009',
        severity: 'critical',
        title: 'pgx SQL Injection via Integer Overflow',
        description:
          'pgx before 5.5.4 is vulnerable to SQL injection when using the non-default simple protocol mode. A remote attacker can exploit integer overflow in the text format of argument values to inject arbitrary SQL.',
        vulnerable_range: '<5.5.4',
        patched_version: '5.5.4',
        cve: 'CVE-2024-27304',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-27304',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const goAdapter: DependencyAdapter = {
  ecosystem: 'go',
  manifestFiles: ['go.mod'],

  parseManifest(content: string): Map<string, string> {
    return parseGoMod(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return buildAdvisories();
  },
};
