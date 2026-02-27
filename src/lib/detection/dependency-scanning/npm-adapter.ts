/**
 * npm ecosystem adapter for multi-ecosystem dependency scanning.
 * Parses package.json manifest files and provides a built-in advisory
 * database of known vulnerable npm packages.
 */

import type { DependencyAdapter, Advisory } from './types';

// ---------------------------------------------------------------------------
// Advisory database — all 45 known vulnerable npm packages.
// Mirrors the original ADVISORY_DB from dependency-scanner.ts.
// ---------------------------------------------------------------------------

const NPM_ADVISORY_DB: Record<string, Advisory[]> = {
  minimatch: [
    {
      id: 'DEP-001',
      severity: 'high',
      title: 'Minimatch ReDoS Vulnerability',
      description: 'Versions before 3.0.5 are vulnerable to Regular Expression Denial of Service (ReDoS) via crafted glob patterns.',
      vulnerable_range: '<3.0.5',
      patched_version: '3.0.5',
      cve: 'CVE-2022-3517',
      ghsa: 'GHSA-f8q6-p94x-37v3',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-3517',
    },
  ],
  'glob-parent': [
    {
      id: 'DEP-002',
      severity: 'high',
      title: 'glob-parent ReDoS Vulnerability',
      description: 'Versions before 5.1.2 are vulnerable to Regular Expression Denial of Service (ReDoS) via crafted path strings.',
      vulnerable_range: '<5.1.2',
      patched_version: '5.1.2',
      cve: 'CVE-2020-28469',
      ghsa: 'GHSA-ww39-953v-wcq6',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-28469',
    },
  ],
  lodash: [
    {
      id: 'DEP-003',
      severity: 'critical',
      title: 'Lodash Prototype Pollution',
      description: 'Versions before 4.17.21 are vulnerable to Prototype Pollution via the merge, mergeWith, and defaultsDeep functions.',
      vulnerable_range: '<4.17.21',
      patched_version: '4.17.21',
      cve: 'CVE-2021-23337',
      ghsa: 'GHSA-35jh-r3h4-6jhm',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
    },
    {
      id: 'DEP-004',
      severity: 'high',
      title: 'Lodash Command Injection',
      description: 'Versions before 4.17.21 are vulnerable to Command Injection via the template function.',
      vulnerable_range: '<4.17.21',
      patched_version: '4.17.21',
      cve: 'CVE-2021-23337',
      ghsa: 'GHSA-35jh-r3h4-6jhm',
    },
  ],
  axios: [
    {
      id: 'DEP-005',
      severity: 'high',
      title: 'Axios Server-Side Request Forgery',
      description: 'Versions before 1.6.0 are vulnerable to SSRF when following redirects, allowing attackers to access internal services.',
      vulnerable_range: '<1.6.0',
      patched_version: '1.6.0',
      cve: 'CVE-2023-45857',
      ghsa: 'GHSA-wf5p-g6vw-rhxx',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45857',
    },
  ],
  semver: [
    {
      id: 'DEP-006',
      severity: 'medium',
      title: 'semver ReDoS Vulnerability',
      description: 'Versions before 7.5.2 are vulnerable to Regular Expression Denial of Service via crafted version strings.',
      vulnerable_range: '<7.5.2',
      patched_version: '7.5.2',
      cve: 'CVE-2022-25883',
      ghsa: 'GHSA-c2qf-rxjj-qqgw',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-25883',
    },
  ],
  json5: [
    {
      id: 'DEP-007',
      severity: 'high',
      title: 'JSON5 Prototype Pollution',
      description: 'Versions before 2.2.2 (or 1.0.2 for 1.x) are vulnerable to Prototype Pollution via the parse method.',
      vulnerable_range: '<2.2.2',
      patched_version: '2.2.2',
      cve: 'CVE-2022-46175',
      ghsa: 'GHSA-9c47-m6qq-7p4h',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-46175',
    },
  ],
  'node-fetch': [
    {
      id: 'DEP-008',
      severity: 'high',
      title: 'node-fetch Exposure of Sensitive Information',
      description: 'Versions before 2.6.7 (or 3.1.1 for 3.x) may leak authorization headers to third-party hosts on redirect.',
      vulnerable_range: '<2.6.7',
      patched_version: '2.6.7',
      cve: 'CVE-2022-0235',
      ghsa: 'GHSA-r683-j2x4-v87g',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-0235',
    },
  ],
  express: [
    {
      id: 'DEP-009',
      severity: 'medium',
      title: 'Express Open Redirect',
      description: 'Versions before 4.19.2 are vulnerable to open redirect when untrusted user input is passed to the redirect() function.',
      vulnerable_range: '<4.19.2',
      patched_version: '4.19.2',
      cve: 'CVE-2024-29041',
      ghsa: 'GHSA-rv95-896h-c2vc',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-29041',
    },
  ],
  jsonwebtoken: [
    {
      id: 'DEP-010',
      severity: 'high',
      title: 'jsonwebtoken Improper Verification',
      description: 'Versions before 9.0.0 are vulnerable to algorithm confusion attacks and improper JWT signature verification.',
      vulnerable_range: '<9.0.0',
      patched_version: '9.0.0',
      cve: 'CVE-2022-23529',
      ghsa: 'GHSA-27h2-hvpr-p74q',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-23529',
    },
  ],
  qs: [
    {
      id: 'DEP-011',
      severity: 'high',
      title: 'qs Prototype Pollution',
      description: 'Versions before 6.10.3 are vulnerable to Prototype Pollution via crafted query strings.',
      vulnerable_range: '<6.10.3',
      patched_version: '6.10.3',
      cve: 'CVE-2022-24999',
      ghsa: 'GHSA-hrpp-h998-j3pp',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-24999',
    },
  ],
  'shell-quote': [
    {
      id: 'DEP-012',
      severity: 'critical',
      title: 'shell-quote Command Injection',
      description: 'Versions before 1.7.3 are vulnerable to command injection via improper input quoting.',
      vulnerable_range: '<1.7.3',
      patched_version: '1.7.3',
      cve: 'CVE-2021-42740',
      ghsa: 'GHSA-g4rg-993r-mgx7',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-42740',
    },
  ],
  tar: [
    {
      id: 'DEP-013',
      severity: 'high',
      title: 'tar Arbitrary File Overwrite',
      description: 'Versions before 6.1.9 are vulnerable to arbitrary file creation/overwrite via specially crafted tar archives.',
      vulnerable_range: '<6.1.9',
      patched_version: '6.1.9',
      cve: 'CVE-2021-37713',
      ghsa: 'GHSA-5955-9wpr-37jh',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-37713',
    },
  ],
  underscore: [
    {
      id: 'DEP-014',
      severity: 'critical',
      title: 'Underscore.js Arbitrary Code Execution',
      description: 'Versions before 1.13.6 are vulnerable to arbitrary code execution via the template function.',
      vulnerable_range: '<1.13.6',
      patched_version: '1.13.6',
      cve: 'CVE-2021-25801',
      ghsa: 'GHSA-cf4h-3jhx-xvhq',
    },
  ],
  moment: [
    {
      id: 'DEP-015',
      severity: 'medium',
      title: 'Moment.js Path Traversal',
      description: 'Versions before 2.29.4 are vulnerable to path traversal when a user-provided locale string is passed to moment.locale().',
      vulnerable_range: '<2.29.4',
      patched_version: '2.29.4',
      cve: 'CVE-2022-31129',
      ghsa: 'GHSA-wc69-rhjr-hc9g',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-31129',
    },
  ],
  got: [
    {
      id: 'DEP-016',
      severity: 'medium',
      title: 'got Open Redirect',
      description: 'Versions before 11.8.5 (or 12.1.0 for 12.x) are vulnerable to open redirect when following redirects to UNIX sockets.',
      vulnerable_range: '<11.8.5',
      patched_version: '11.8.5',
      cve: 'CVE-2022-33987',
      ghsa: 'GHSA-pfrx-2q88-qq97',
    },
  ],
  async: [
    {
      id: 'DEP-017',
      severity: 'high',
      title: 'Async Prototype Pollution',
      description: 'Versions before 3.2.2 are vulnerable to Prototype Pollution via the mapValues function.',
      vulnerable_range: '<3.2.2',
      patched_version: '3.2.2',
      cve: 'CVE-2021-43138',
      ghsa: 'GHSA-fwr7-v2mv-hh25',
    },
  ],
  'nth-check': [
    {
      id: 'DEP-018',
      severity: 'high',
      title: 'nth-check ReDoS Vulnerability',
      description: 'Versions before 2.0.1 are vulnerable to Regular Expression Denial of Service via crafted CSS selectors.',
      vulnerable_range: '<2.0.1',
      patched_version: '2.0.1',
      cve: 'CVE-2021-3803',
      ghsa: 'GHSA-rp65-9cf3-cjxr',
    },
  ],
  'ansi-regex': [
    {
      id: 'DEP-019',
      severity: 'medium',
      title: 'ansi-regex ReDoS Vulnerability',
      description: 'Versions before 6.0.1 (or 5.0.1 for 5.x) are vulnerable to Regular Expression Denial of Service.',
      vulnerable_range: '<5.0.1',
      patched_version: '5.0.1',
      cve: 'CVE-2021-3807',
      ghsa: 'GHSA-93q8-gq69-wqmw',
    },
  ],
  postcss: [
    {
      id: 'DEP-020',
      severity: 'medium',
      title: 'PostCSS Line Return Parsing Error',
      description: 'Versions before 8.4.31 are vulnerable to a line return parsing error that can expose source map data.',
      vulnerable_range: '<8.4.31',
      patched_version: '8.4.31',
      cve: 'CVE-2023-44270',
      ghsa: 'GHSA-7fh5-64p2-3v2j',
    },
  ],
  ip: [
    {
      id: 'DEP-021',
      severity: 'high',
      title: 'ip SSRF Vulnerability',
      description: 'Versions before 2.0.1 incorrectly identify some private IP addresses as public, enabling SSRF attacks.',
      vulnerable_range: '<2.0.1',
      patched_version: '2.0.1',
      cve: 'CVE-2024-29415',
      ghsa: 'GHSA-2p57-rm9w-gvfp',
    },
  ],
  braces: [
    {
      id: 'DEP-022',
      severity: 'medium',
      title: 'Braces ReDoS Vulnerability',
      description: 'Versions before 3.0.3 are vulnerable to Regular Expression Denial of Service via unbalanced braces.',
      vulnerable_range: '<3.0.3',
      patched_version: '3.0.3',
      cve: 'CVE-2024-4068',
      ghsa: 'GHSA-grv7-fg5c-xmjg',
    },
  ],
  ws: [
    {
      id: 'DEP-023',
      severity: 'high',
      title: 'ws DoS via Unrestricted Resource Consumption',
      description: 'Versions before 8.17.1 (or 7.5.10 for 7.x) are vulnerable to DoS when handling specially crafted messages.',
      vulnerable_range: '<8.17.1',
      patched_version: '8.17.1',
      cve: 'CVE-2024-37890',
      ghsa: 'GHSA-3h5v-q93c-6h6q',
    },
  ],
  'path-to-regexp': [
    {
      id: 'DEP-024',
      severity: 'high',
      title: 'path-to-regexp ReDoS Vulnerability',
      description: 'Versions before 0.1.10 (or 1.9.0 for 1.x, or 6.3.0 for 6.x) are vulnerable to Regular Expression Denial of Service.',
      vulnerable_range: '<0.1.10',
      patched_version: '0.1.10',
      cve: 'CVE-2024-45296',
      ghsa: 'GHSA-9wv6-86v2-598j',
    },
  ],
  'cross-spawn': [
    {
      id: 'DEP-025',
      severity: 'high',
      title: 'cross-spawn ReDoS Vulnerability',
      description: 'Versions before 7.0.5 are vulnerable to Regular Expression Denial of Service via crafted command arguments.',
      vulnerable_range: '<7.0.5',
      patched_version: '7.0.5',
      cve: 'CVE-2024-21538',
      ghsa: 'GHSA-3xgq-45jj-v275',
    },
  ],
  minimist: [
    {
      id: 'DEP-026',
      severity: 'critical',
      title: 'minimist Prototype Pollution',
      description: 'Versions before 1.2.6 are vulnerable to Prototype Pollution via crafted command-line arguments.',
      vulnerable_range: '<1.2.6',
      patched_version: '1.2.6',
      cve: 'CVE-2021-44906',
      ghsa: 'GHSA-xvch-5gv4-984h',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44906',
    },
  ],
  'follow-redirects': [
    {
      id: 'DEP-027',
      severity: 'high',
      title: 'follow-redirects Information Exposure',
      description: 'Versions before 1.15.4 leak authorization headers to untrusted hosts on cross-origin redirects.',
      vulnerable_range: '<1.15.4',
      patched_version: '1.15.4',
      cve: 'CVE-2023-26159',
      ghsa: 'GHSA-jchw-25xp-jwwc',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-26159',
    },
  ],
  'tough-cookie': [
    {
      id: 'DEP-028',
      severity: 'medium',
      title: 'tough-cookie Prototype Pollution',
      description: 'Versions before 4.1.3 are vulnerable to Prototype Pollution via CookieJar manipulation.',
      vulnerable_range: '<4.1.3',
      patched_version: '4.1.3',
      cve: 'CVE-2023-26136',
      ghsa: 'GHSA-72xf-g2v4-qvf3',
    },
  ],
  'node-forge': [
    {
      id: 'DEP-029',
      severity: 'high',
      title: 'node-forge Signature Verification Bypass',
      description: 'Versions before 1.3.0 are vulnerable to signature verification bypass allowing forged signatures to be accepted.',
      vulnerable_range: '<1.3.0',
      patched_version: '1.3.0',
      cve: 'CVE-2022-24771',
      ghsa: 'GHSA-cfm4-qjh2-4765',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-24771',
    },
  ],
  xml2js: [
    {
      id: 'DEP-030',
      severity: 'medium',
      title: 'xml2js Prototype Pollution',
      description: 'Versions before 0.5.0 are vulnerable to Prototype Pollution via crafted XML with __proto__ keys.',
      vulnerable_range: '<0.5.0',
      patched_version: '0.5.0',
      cve: 'CVE-2023-0842',
      ghsa: 'GHSA-776f-qx25-q3cc',
    },
  ],
  'decode-uri-component': [
    {
      id: 'DEP-031',
      severity: 'medium',
      title: 'decode-uri-component DoS',
      description: 'Versions before 0.2.1 are vulnerable to Denial of Service via crafted percent-encoded strings.',
      vulnerable_range: '<0.2.1',
      patched_version: '0.2.1',
      cve: 'CVE-2022-38900',
      ghsa: 'GHSA-w573-4hg7-7wgq',
    },
  ],
  'http-cache-semantics': [
    {
      id: 'DEP-032',
      severity: 'high',
      title: 'http-cache-semantics ReDoS',
      description: 'Versions before 4.1.1 are vulnerable to Regular Expression Denial of Service via crafted Cache-Control headers.',
      vulnerable_range: '<4.1.1',
      patched_version: '4.1.1',
      cve: 'CVE-2022-25881',
      ghsa: 'GHSA-rc47-6667-2j5j',
    },
  ],
  'word-wrap': [
    {
      id: 'DEP-033',
      severity: 'medium',
      title: 'word-wrap ReDoS',
      description: 'Versions before 1.2.4 are vulnerable to Regular Expression Denial of Service via long input strings.',
      vulnerable_range: '<1.2.4',
      patched_version: '1.2.4',
      cve: 'CVE-2023-26115',
      ghsa: 'GHSA-j8xg-fqg3-53r7',
    },
  ],
  y18n: [
    {
      id: 'DEP-034',
      severity: 'high',
      title: 'y18n Prototype Pollution',
      description: 'Versions before 5.0.5 (or 4.0.1 for 4.x) are vulnerable to Prototype Pollution via locale setters.',
      vulnerable_range: '<5.0.5',
      patched_version: '5.0.5',
      cve: 'CVE-2020-7774',
      ghsa: 'GHSA-c4w7-xm78-47vh',
    },
  ],
  'yargs-parser': [
    {
      id: 'DEP-035',
      severity: 'medium',
      title: 'yargs-parser Prototype Pollution',
      description: 'Versions before 18.1.1 (or 15.0.1 for 15.x) are vulnerable to Prototype Pollution via crafted arguments.',
      vulnerable_range: '<18.1.1',
      patched_version: '18.1.1',
      cve: 'CVE-2020-7608',
      ghsa: 'GHSA-p9pc-299p-vxgp',
    },
  ],
  'fast-xml-parser': [
    {
      id: 'DEP-036',
      severity: 'medium',
      title: 'fast-xml-parser Prototype Pollution',
      description: 'Versions before 4.2.5 are vulnerable to Prototype Pollution via crafted XML with __proto__ tags.',
      vulnerable_range: '<4.2.5',
      patched_version: '4.2.5',
      cve: 'CVE-2023-34104',
      ghsa: 'GHSA-6w63-h3fj-q4vw',
    },
  ],
  yaml: [
    {
      id: 'DEP-037',
      severity: 'high',
      title: 'yaml Code Execution via Alias Nodes',
      description: 'Versions before 2.3.0 may allow code execution via merge key and alias node processing.',
      vulnerable_range: '<2.3.0',
      patched_version: '2.3.0',
      cve: 'CVE-2023-2251',
      ghsa: 'GHSA-f9xv-q969-pqx4',
    },
  ],
  undici: [
    {
      id: 'DEP-038',
      severity: 'high',
      title: 'undici SSRF / Cookie Leak',
      description: 'Versions before 5.26.2 are vulnerable to SSRF via crafted requests and can leak cookies across origins.',
      vulnerable_range: '<5.26.2',
      patched_version: '5.26.2',
      cve: 'CVE-2023-45143',
      ghsa: 'GHSA-wqq4-5wpv-mx2g',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45143',
    },
  ],
  'socket.io-parser': [
    {
      id: 'DEP-039',
      severity: 'high',
      title: 'socket.io-parser Insufficient Validation',
      description: 'Versions before 4.2.3 are vulnerable to DoS and potential RCE via specially crafted socket messages.',
      vulnerable_range: '<4.2.3',
      patched_version: '4.2.3',
      cve: 'CVE-2023-32695',
      ghsa: 'GHSA-cqmj-92xf-r6r9',
    },
  ],
  debug: [
    {
      id: 'DEP-040',
      severity: 'low',
      title: 'debug ReDoS Vulnerability',
      description: 'Versions before 2.6.9 (or 3.1.0 for 3.x) are vulnerable to Regular Expression Denial of Service.',
      vulnerable_range: '<2.6.9',
      patched_version: '2.6.9',
      cve: 'CVE-2017-16137',
      ghsa: 'GHSA-gxpj-cx7g-858c',
    },
  ],
  nanoid: [
    {
      id: 'DEP-041',
      severity: 'medium',
      title: 'nanoid Predictable Token Generation',
      description: 'Versions before 3.1.31 may produce predictable IDs when using certain configurations, weakening token security.',
      vulnerable_range: '<3.1.31',
      patched_version: '3.1.31',
      cve: 'CVE-2021-23566',
      ghsa: 'GHSA-qrpm-p2h7-hrv2',
    },
  ],
  request: [
    {
      id: 'DEP-042',
      severity: 'medium',
      title: 'request — Deprecated Package with Multiple CVEs',
      description: 'The request package is deprecated and no longer maintained. Multiple known vulnerabilities exist with no patches. Migrate to got, axios, or node-fetch.',
      vulnerable_range: '<3.0.0',
      patched_version: null,
      cve: 'CVE-2023-28155',
      ghsa: 'GHSA-p8p7-x288-28g6',
    },
  ],
  'webpack-dev-middleware': [
    {
      id: 'DEP-043',
      severity: 'high',
      title: 'webpack-dev-middleware Path Traversal',
      description: 'Versions before 5.3.4 (or 6.1.2 for 6.x) allow path traversal to read arbitrary files from the server.',
      vulnerable_range: '<5.3.4',
      patched_version: '5.3.4',
      cve: 'CVE-2024-29180',
      ghsa: 'GHSA-wr3j-32j9-cp6v',
    },
  ],
  cookie: [
    {
      id: 'DEP-044',
      severity: 'low',
      title: 'cookie Accepts Out-of-Spec Cookies',
      description: 'Versions before 0.7.0 accept cookies with out-of-spec characters which could lead to injection in downstream systems.',
      vulnerable_range: '<0.7.0',
      patched_version: '0.7.0',
      cve: 'CVE-2024-47764',
      ghsa: 'GHSA-pxg6-pf52-xh8x',
    },
  ],
  'body-parser': [
    {
      id: 'DEP-045',
      severity: 'high',
      title: 'body-parser Asymmetric DoS',
      description: 'Versions before 1.20.3 are vulnerable to asymmetric resource consumption (DoS) via specially crafted URL-encoded payloads.',
      vulnerable_range: '<1.20.3',
      patched_version: '1.20.3',
      cve: 'CVE-2024-45590',
      ghsa: 'GHSA-qwcr-r2fm-qrc7',
    },
  ],
};

// ---------------------------------------------------------------------------
// npm adapter
// ---------------------------------------------------------------------------

export const npmAdapter: DependencyAdapter = {
  ecosystem: 'npm',
  manifestFiles: ['package.json'],

  parseManifest(content: string): Map<string, string> {
    const deps = new Map<string, string>();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return deps;
    }

    const dependencies = parsed.dependencies as Record<string, string> | undefined;
    const devDependencies = parsed.devDependencies as Record<string, string> | undefined;

    if (dependencies) {
      for (const [name, version] of Object.entries(dependencies)) {
        deps.set(name, version);
      }
    }

    if (devDependencies) {
      for (const [name, version] of Object.entries(devDependencies)) {
        deps.set(name, version);
      }
    }

    return deps;
  },

  getAdvisories(): Record<string, Advisory[]> {
    return NPM_ADVISORY_DB;
  },
};
