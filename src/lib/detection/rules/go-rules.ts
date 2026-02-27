/**
 * Go-specific vulnerability rules.
 * Covers SQL injection via fmt.Sprintf, command injection, TLS misconfig,
 * weak hashing, SSRF, template injection, temp files, error handling, and debug logging.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const GO_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-150',
    severity: 'critical',
    category: 'sql-injection',
    title: 'fmt.Sprintf Used in SQL Query Construction',
    description:
      'Building SQL queries with fmt.Sprintf allows injection attacks. Use parameterized queries with database/sql placeholder syntax ($1, ?).',
    pattern: /fmt\.Sprintf\s*\(\s*['"](?:SELECT|INSERT|UPDATE|DELETE)\b/i,
    languages: ['Go'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-151',
    severity: 'critical',
    category: 'command-injection',
    title: 'exec.Command with Variable Input',
    description:
      'Passing variable or user-controlled strings to exec.Command enables OS command injection. Validate and sanitize all inputs, or use a fixed command with argument arrays.',
    pattern: /exec\.Command\s*\(\s*(?!")[a-zA-Z_]/,
    languages: ['Go'],
    cwe: 'CWE-78',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-152',
    severity: 'high',
    category: 'insecure-config',
    title: 'HTTP Server Without TLS',
    description:
      'http.ListenAndServe starts an unencrypted HTTP server. Use http.ListenAndServeTLS or terminate TLS at a reverse proxy.',
    pattern: /http\.ListenAndServe\s*\(/,
    languages: ['Go'],
    cwe: 'CWE-319',
  },
  {
    id: 'VULN-153',
    severity: 'high',
    category: 'insecure-config',
    title: 'TLS Certificate Verification Disabled',
    description:
      'Setting InsecureSkipVerify to true disables TLS certificate validation, enabling man-in-the-middle attacks.',
    pattern: /InsecureSkipVerify\s*:\s*true/,
    languages: ['Go'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-154',
    severity: 'high',
    category: 'weak-crypto',
    title: 'Weak Hash Algorithm (MD5 or SHA1)',
    description:
      'MD5 and SHA1 are cryptographically broken and vulnerable to collision attacks. Use sha256.New() or sha512.New() from crypto/sha256 or crypto/sha512.',
    pattern: /(?:md5|sha1)\.New\s*\(\s*\)/,
    languages: ['Go'],
    cwe: 'CWE-328',
  },
  {
    id: 'VULN-155',
    severity: 'high',
    category: 'ssrf',
    title: 'HTTP Request with Variable URL (SSRF)',
    description:
      'Passing a variable directly to http.Get or http.Post can enable Server-Side Request Forgery. Validate the URL against an allowlist of trusted hosts.',
    pattern: /http\.(?:Get|Post|PostForm|Head)\s*\(\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*[,)]/,
    languages: ['Go'],
    cwe: 'CWE-918',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-156',
    severity: 'medium',
    category: 'xss',
    title: 'text/template Used Instead of html/template',
    description:
      'The text/template package does not escape HTML output, leading to XSS when rendering web pages. Use html/template for any output served to browsers.',
    pattern: /["']text\/template["']/,
    languages: ['Go'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-157',
    severity: 'medium',
    category: 'insecure-temp',
    title: 'Predictable Temporary File Name',
    description:
      'Using os.TempDir() with a predictable filename allows symlink attacks. Use os.CreateTemp() (Go 1.16+) or ioutil.TempFile() for safe temp file creation.',
    pattern: /os\.TempDir\s*\(\s*\)\s*\+\s*["'\/]/,
    languages: ['Go'],
    cwe: 'CWE-377',
  },
  {
    id: 'VULN-158',
    severity: 'medium',
    category: 'error-handling',
    title: 'Ignored Error Return Value',
    description:
      'Assigning an error to _ or not checking the error return value can hide critical failures including security-relevant errors. Always handle errors explicitly.',
    pattern: /(?:_\s*,\s*)?_\s*(?::)?=\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\([^)]*\)\s*$/,
    languages: ['Go'],
    cwe: 'CWE-391',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-159',
    severity: 'low',
    category: 'production-readiness',
    title: 'Debug Print Statement (fmt.Println/Printf)',
    description:
      'fmt.Println and fmt.Printf are commonly used for debugging. Use a structured logging library (e.g., log/slog, zap, zerolog) in production code.',
    pattern: /fmt\.Print(?:ln|f)\s*\(/,
    languages: ['Go'],
    cwe: 'CWE-489',
  },
];
