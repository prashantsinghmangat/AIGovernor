/**
 * Frontend framework vulnerability rules — Angular, React, Vue.
 * Covers XSS bypasses, unsafe HTML rendering, token storage,
 * missing rel attributes, infinite loops, and outdated patterns.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const FRAMEWORK_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH — Angular
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-190',
    severity: 'high',
    category: 'xss',
    title: 'Angular bypassSecurityTrustHtml — XSS Bypass',
    description:
      'bypassSecurityTrustHtml disables Angular\'s built-in XSS sanitization. If user input is passed through it, arbitrary scripts can execute. Sanitize input before bypassing.',
    pattern: /bypassSecurityTrustHtml\s*\(/,
    languages: ['TypeScript'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-191',
    severity: 'high',
    category: 'xss',
    title: 'Angular [innerHTML] Binding',
    description:
      'Binding to [innerHTML] injects raw HTML into the DOM. While Angular sanitizes some content, complex payloads may bypass it. Use text interpolation or DomSanitizer with caution.',
    pattern: /\[innerHTML\]\s*=/,
    languages: ['TypeScript'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-192',
    severity: 'high',
    category: 'xss',
    title: 'Angular DomSanitizer Disabled',
    description:
      'Calling bypassSecurityTrustResourceUrl, bypassSecurityTrustScript, or bypassSecurityTrustStyle disables Angular\'s DOM sanitization. Validate and sanitize all input before bypassing.',
    pattern: /bypassSecurityTrust(?:ResourceUrl|Script|Style)\s*\(/,
    languages: ['TypeScript'],
    cwe: 'CWE-79',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH — React / General
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-193',
    severity: 'high',
    category: 'insecure-config',
    title: 'target="_blank" Without rel="noopener"',
    description:
      'Links with target="_blank" without rel="noopener" (or rel="noreferrer") give the opened page access to window.opener, enabling tabnabbing phishing attacks.',
    pattern: /target\s*=\s*["']_blank["'](?![^>]*rel\s*=\s*["'][^"']*noopener)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-1022',
  },
  {
    id: 'VULN-194',
    severity: 'high',
    category: 'insecure-storage',
    title: 'Auth Token Stored in localStorage',
    description:
      'localStorage is accessible to all JavaScript on the page, including XSS payloads. Store authentication tokens in httpOnly cookies or use a secure token handler.',
    pattern: /localStorage\.setItem\s*\(\s*['"](?:token|auth|access_token|refresh_token|jwt|session|api_key)/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-922',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM — Vue / React
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-195',
    severity: 'medium',
    category: 'xss',
    title: 'Vue v-html Directive with Variable',
    description:
      'The v-html directive renders raw HTML and bypasses Vue\'s template escaping. If the value originates from user input, it enables XSS. Use text interpolation {{ }} instead.',
    pattern: /v-html\s*=\s*["'][^"']*[a-zA-Z_]/,
    languages: ['JavaScript', 'TypeScript', 'Vue'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-196',
    severity: 'medium',
    category: 'production-readiness',
    title: 'useEffect Without Dependency Array',
    description:
      'A useEffect call without a dependency array runs after every render, potentially causing infinite loops, excessive API calls, and performance degradation.',
    pattern: /useEffect\s*\(\s*(?:\(\)|[a-zA-Z_]\w*|\([^)]*\))\s*=>\s*\{[^}]*\}\s*\)\s*;?/,
    languages: ['JavaScript', 'TypeScript'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW — AngularJS (legacy)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-197',
    severity: 'low',
    category: 'deprecated-api',
    title: 'AngularJS $scope Usage (Outdated Framework)',
    description:
      'AngularJS (1.x) is no longer maintained and does not receive security patches. Migrate to Angular (2+) or another modern framework.',
    pattern: /\$scope\.\w+\s*=/,
    languages: ['JavaScript'],
  },
];
