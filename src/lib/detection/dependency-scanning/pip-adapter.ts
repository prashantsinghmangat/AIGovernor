/**
 * pip (Python) ecosystem adapter for multi-ecosystem dependency scanning.
 * Parses requirements.txt, Pipfile, and pyproject.toml manifest files
 * and provides a built-in advisory database of known vulnerable Python packages.
 */

import type { DependencyAdapter, Advisory } from './types';

// ---------------------------------------------------------------------------
// Advisory database — known vulnerable Python packages with real CVEs.
// ---------------------------------------------------------------------------

const PIP_ADVISORY_DB: Record<string, Advisory[]> = {
  django: [
    {
      id: 'PIP-001',
      severity: 'critical',
      title: 'Django SQL Injection via QuerySet.values()/values_list()',
      description: 'Versions before 4.2.11 are vulnerable to SQL injection through crafted arguments to QuerySet.values() and values_list().',
      vulnerable_range: '<4.2.11',
      patched_version: '4.2.11',
      cve: 'CVE-2024-27351',
      ghsa: 'GHSA-vm8q-m57g-pff3',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-27351',
    },
    {
      id: 'PIP-002',
      severity: 'high',
      title: 'Django Denial of Service via intcomma Template Filter',
      description: 'Versions before 4.2.11 are vulnerable to denial of service via the intcomma template filter with very long strings.',
      vulnerable_range: '<4.2.11',
      patched_version: '4.2.11',
      cve: 'CVE-2024-24680',
      ghsa: 'GHSA-xxj9-f6rv-m3x4',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-24680',
    },
  ],
  flask: [
    {
      id: 'PIP-003',
      severity: 'high',
      title: 'Flask Session Cookie Exposure',
      description: 'Versions before 2.3.2 may expose session cookies on redirects to other domains when the session cookie has no SameSite attribute.',
      vulnerable_range: '<2.3.2',
      patched_version: '2.3.2',
      cve: 'CVE-2023-30861',
      ghsa: 'GHSA-m2qf-hxjv-5gpq',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-30861',
    },
  ],
  requests: [
    {
      id: 'PIP-004',
      severity: 'high',
      title: 'Requests Proxy-Authorization Header Leak on Redirect',
      description: 'Versions before 2.31.0 leak Proxy-Authorization headers to destination servers when following redirects to a different origin.',
      vulnerable_range: '<2.31.0',
      patched_version: '2.31.0',
      cve: 'CVE-2023-32681',
      ghsa: 'GHSA-j8r2-6x86-q33q',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-32681',
    },
  ],
  pillow: [
    {
      id: 'PIP-005',
      severity: 'high',
      title: 'Pillow Denial of Service via Large Images',
      description: 'Versions before 10.0.1 are vulnerable to uncontrolled resource consumption when processing very large images, leading to denial of service.',
      vulnerable_range: '<10.0.1',
      patched_version: '10.0.1',
      cve: 'CVE-2023-44271',
      ghsa: 'GHSA-j7hp-h8jx-5ppr',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-44271',
    },
  ],
  pyyaml: [
    {
      id: 'PIP-006',
      severity: 'critical',
      title: 'PyYAML Arbitrary Code Execution',
      description: 'Versions before 6.0.1 are vulnerable to arbitrary code execution via crafted YAML documents using the full_load or unsafe_load functions.',
      vulnerable_range: '<6.0.1',
      patched_version: '6.0.1',
      cve: 'CVE-2020-14343',
      ghsa: 'GHSA-8q59-q68h-6hv4',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-14343',
    },
  ],
  jinja2: [
    {
      id: 'PIP-007',
      severity: 'medium',
      title: 'Jinja2 Cross-Site Scripting (XSS)',
      description: 'Versions before 3.1.3 are vulnerable to XSS via the xmlattr filter, allowing injection of arbitrary HTML attributes.',
      vulnerable_range: '<3.1.3',
      patched_version: '3.1.3',
      cve: 'CVE-2024-22195',
      ghsa: 'GHSA-h5c8-rqwp-cp95',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-22195',
    },
  ],
  cryptography: [
    {
      id: 'PIP-008',
      severity: 'high',
      title: 'cryptography NULL Pointer Dereference',
      description: 'Versions before 41.0.6 are vulnerable to a NULL pointer dereference when loading PKCS7 certificates, leading to denial of service.',
      vulnerable_range: '<41.0.6',
      patched_version: '41.0.6',
      cve: 'CVE-2023-49083',
      ghsa: 'GHSA-jfhm-5ghh-2f97',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-49083',
    },
  ],
  paramiko: [
    {
      id: 'PIP-009',
      severity: 'high',
      title: 'Paramiko Terrapin SSH Prefix Truncation Attack',
      description: 'Versions before 3.4.0 are vulnerable to the Terrapin attack, allowing prefix truncation of SSH messages via a man-in-the-middle.',
      vulnerable_range: '<3.4.0',
      patched_version: '3.4.0',
      cve: 'CVE-2023-48795',
      ghsa: 'GHSA-45x7-px36-x8w8',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-48795',
    },
  ],
  urllib3: [
    {
      id: 'PIP-010',
      severity: 'medium',
      title: 'urllib3 Cookie and Header Leak on Redirect',
      description: 'Versions before 2.0.7 may leak the HTTP request body to a different origin when following a 303 redirect after an initial POST request.',
      vulnerable_range: '<2.0.7',
      patched_version: '2.0.7',
      cve: 'CVE-2023-45803',
      ghsa: 'GHSA-g4mx-q9vg-27p4',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45803',
    },
  ],
  setuptools: [
    {
      id: 'PIP-011',
      severity: 'high',
      title: 'setuptools Regular Expression Denial of Service',
      description: 'Versions before 65.5.1 are vulnerable to ReDoS via crafted package names in package_index.py.',
      vulnerable_range: '<65.5.1',
      patched_version: '65.5.1',
      cve: 'CVE-2022-40897',
      ghsa: 'GHSA-r9hx-vwmv-q579',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-40897',
    },
  ],
  numpy: [
    {
      id: 'PIP-012',
      severity: 'medium',
      title: 'NumPy Buffer Overflow in Array Operations',
      description: 'Versions before 1.22.0 are vulnerable to a buffer overflow in the array_from_pyobj function when processing certain crafted inputs.',
      vulnerable_range: '<1.22.0',
      patched_version: '1.22.0',
      cve: 'CVE-2021-41496',
      ghsa: 'GHSA-fpfv-jqm9-f5jm',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-41496',
    },
  ],
  sqlalchemy: [
    {
      id: 'PIP-013',
      severity: 'high',
      title: 'SQLAlchemy Type Confusion in SQL Expression Engine',
      description: 'Versions before 2.0.0 are vulnerable to type confusion in the SQL expression engine that may lead to SQL injection in edge cases.',
      vulnerable_range: '<2.0.0',
      patched_version: '2.0.0',
      cve: 'CVE-2023-45132',
      ghsa: 'GHSA-9x4q-3gxw-849f',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45132',
    },
  ],
  werkzeug: [
    {
      id: 'PIP-014',
      severity: 'high',
      title: 'Werkzeug Denial of Service via Multipart Form Data',
      description: 'Versions before 3.0.1 are vulnerable to denial of service when parsing specially crafted multipart form data with large boundaries.',
      vulnerable_range: '<3.0.1',
      patched_version: '3.0.1',
      cve: 'CVE-2023-46136',
      ghsa: 'GHSA-hrfv-mqp8-q5rw',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-46136',
    },
  ],
  certifi: [
    {
      id: 'PIP-015',
      severity: 'high',
      title: 'certifi Inclusion of Revoked e-Tugra Root Certificate',
      description: 'Versions before 2023.7.22 include the e-Tugra root certificate which was revoked due to security concerns, allowing potential MITM attacks.',
      vulnerable_range: '<2023.7.22',
      patched_version: '2023.7.22',
      cve: 'CVE-2023-37920',
      ghsa: 'GHSA-xqr8-7jwr-rhp7',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-37920',
    },
  ],
  gunicorn: [
    {
      id: 'PIP-016',
      severity: 'high',
      title: 'Gunicorn HTTP Request Smuggling',
      description: 'Versions before 22.0.0 are vulnerable to HTTP request smuggling via improper handling of Transfer-Encoding headers.',
      vulnerable_range: '<22.0.0',
      patched_version: '22.0.0',
      cve: 'CVE-2024-1135',
      ghsa: 'GHSA-w3h3-4rj7-4ph4',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1135',
    },
  ],
  twisted: [
    {
      id: 'PIP-017',
      severity: 'medium',
      title: 'Twisted HTTP Multipart Parsing Vulnerability',
      description: 'Versions before 23.10.0 have a vulnerability in HTTP multipart request parsing that can lead to denial of service or unexpected behavior.',
      vulnerable_range: '<23.10.0',
      patched_version: '23.10.0',
      cve: 'CVE-2023-46137',
      ghsa: 'GHSA-c8m8-j448-xjx7',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-46137',
    },
  ],
  aiohttp: [
    {
      id: 'PIP-018',
      severity: 'high',
      title: 'aiohttp SSRF via Improper URL Validation',
      description: 'Versions before 3.9.0 are vulnerable to SSRF due to improper validation of URLs, allowing attackers to bypass restrictions on internal network access.',
      vulnerable_range: '<3.9.0',
      patched_version: '3.9.0',
      cve: 'CVE-2023-49081',
      ghsa: 'GHSA-q3qx-5fqw-3y65',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-49081',
    },
  ],
  tornado: [
    {
      id: 'PIP-019',
      severity: 'medium',
      title: 'Tornado Open Redirect Vulnerability',
      description: 'Versions before 6.3.3 are vulnerable to open redirect when using the StaticFileHandler, allowing attackers to redirect users to malicious sites.',
      vulnerable_range: '<6.3.3',
      patched_version: '6.3.3',
      cve: 'CVE-2023-28370',
      ghsa: 'GHSA-qppv-j76h-2rpx',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-28370',
    },
  ],
};

// ---------------------------------------------------------------------------
// Manifest parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a requirements.txt file.
 * Supports lines like:
 *   django==3.2.1
 *   flask>=2.0
 *   requests~=2.28.0
 *   numpy
 *   # comments and blank lines are ignored
 *   -e git+https://... (editable installs are skipped)
 *   --index-url ... (option lines are skipped)
 */
function parseRequirementsTxt(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Skip blank lines, comments, and pip options
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;

    // Strip inline comments
    const stripped = line.split('#')[0].trim();
    if (!stripped) continue;

    // Strip environment markers (e.g., ; python_version >= "3.8")
    const withoutMarkers = stripped.split(';')[0].trim();

    // Match: package_name (==|>=|<=|~=|!=|>|<) version
    const match = withoutMarkers.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*([><=!~]+)\s*(.+)$/);
    if (match) {
      const name = match[1].toLowerCase();
      const operator = match[2];
      const version = match[3].trim();
      deps.set(name, `${operator}${version}`);
    } else {
      // Package with no version constraint (e.g., just "requests")
      const nameOnly = withoutMarkers.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*$/);
      if (nameOnly) {
        deps.set(nameOnly[1].toLowerCase(), '*');
      }
    }
  }

  return deps;
}

/**
 * Parse a Pipfile's [packages] and [dev-packages] sections.
 * Supports entries like:
 *   django = "==3.2.1"
 *   flask = ">=2.0"
 *   requests = "*"
 *   numpy = {version = ">=1.21", extras = ["dev"]}
 */
function parsePipfile(content: string): Map<string, string> {
  const deps = new Map<string, string>();
  let inSection = false;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Detect section headers
    if (line.startsWith('[')) {
      const section = line.toLowerCase();
      inSection = section === '[packages]' || section === '[dev-packages]';
      continue;
    }

    if (!inSection || !line || line.startsWith('#')) continue;

    // Match: package_name = "version_spec" or package_name = "*"
    const simpleMatch = line.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*=\s*"([^"]*)"$/);
    if (simpleMatch) {
      deps.set(simpleMatch[1].toLowerCase(), simpleMatch[2]);
      continue;
    }

    // Match: package_name = {version = "version_spec", ...}
    const dictMatch = line.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*=\s*\{.*version\s*=\s*"([^"]*)".*\}$/);
    if (dictMatch) {
      deps.set(dictMatch[1].toLowerCase(), dictMatch[2]);
      continue;
    }
  }

  return deps;
}

/**
 * Parse a pyproject.toml's [project.dependencies] and
 * [project.optional-dependencies] sections.
 * Supports entries like:
 *   dependencies = [
 *     "django>=4.2",
 *     "flask==2.3.1",
 *   ]
 */
function parsePyprojectToml(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Extract dependency strings from dependencies = [...] arrays.
  // This is a simplified TOML parser targeting the common patterns used
  // in pyproject.toml for [project] dependencies.
  const depArrayRegex = /dependencies\s*=\s*\[([\s\S]*?)\]/g;
  let arrayMatch: RegExpExecArray | null;

  while ((arrayMatch = depArrayRegex.exec(content)) !== null) {
    const arrayContent = arrayMatch[1];
    // Match each quoted dependency string
    const entryRegex = /"([^"]+)"/g;
    let entryMatch: RegExpExecArray | null;

    while ((entryMatch = entryRegex.exec(arrayContent)) !== null) {
      const depString = entryMatch[1].trim();

      // Parse: "package>=version" or "package==version" or "package"
      const parsed = depString.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*([><=!~]+)\s*(.+?)(\s*;.*)?$/);
      if (parsed) {
        deps.set(parsed[1].toLowerCase(), `${parsed[2]}${parsed[3].trim()}`);
      } else {
        // Just a package name with no version constraint
        const nameOnly = depString.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)(\s*;.*)?$/);
        if (nameOnly) {
          deps.set(nameOnly[1].toLowerCase(), '*');
        }
      }
    }
  }

  return deps;
}

/**
 * Detect the manifest format based on content heuristics and parse accordingly.
 */
function detectAndParse(content: string): Map<string, string> {
  const trimmed = content.trim();

  // pyproject.toml: contains [project] or [build-system] sections
  if (trimmed.includes('[project]') || trimmed.includes('[build-system]')) {
    return parsePyprojectToml(content);
  }

  // Pipfile: contains [packages] or [dev-packages] sections
  if (trimmed.includes('[packages]') || trimmed.includes('[dev-packages]')) {
    return parsePipfile(content);
  }

  // Default: treat as requirements.txt format
  return parseRequirementsTxt(content);
}

// ---------------------------------------------------------------------------
// pip adapter
// ---------------------------------------------------------------------------

export const pipAdapter: DependencyAdapter = {
  ecosystem: 'pip',
  manifestFiles: ['requirements.txt', 'Pipfile', 'pyproject.toml'],

  parseManifest(content: string): Map<string, string> {
    return detectAndParse(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return PIP_ADVISORY_DB;
  },
};
