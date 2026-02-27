/**
 * C#-specific vulnerability rules.
 * Covers SQL injection, command injection, insecure deserialization,
 * TLS bypass, XSS, path traversal, missing auth, weak crypto, CSRF, and debug logging.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const CSHARP_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-180',
    severity: 'critical',
    category: 'sql-injection',
    title: 'SqlCommand with String Concatenation',
    description:
      'Building SQL commands with string concatenation (+ or $"") allows SQL injection. Use SqlParameter or parameterized queries with @param placeholders.',
    pattern: /new\s+SqlCommand\s*\(\s*(?:\$"|[^"]*\+\s*)/,
    languages: ['C#'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-181',
    severity: 'critical',
    category: 'command-injection',
    title: 'Process.Start() with User Input',
    description:
      'Passing user-controlled data to Process.Start() enables OS command injection. Validate inputs, use a fixed executable, and pass arguments via ProcessStartInfo.ArgumentList.',
    pattern: /Process\.Start\s*\(\s*(?!\s*["'])[a-zA-Z_]/,
    languages: ['C#'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-182',
    severity: 'critical',
    category: 'deserialization',
    title: 'BinaryFormatter.Deserialize() — Insecure Deserialization',
    description:
      'BinaryFormatter is inherently unsafe and allows remote code execution via crafted payloads. Microsoft has deprecated it. Use System.Text.Json or XmlSerializer with known types.',
    pattern: /BinaryFormatter\s*(?:\(\s*\))?\s*\.?\s*Deserialize\s*\(/,
    languages: ['C#'],
    cwe: 'CWE-502',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-183',
    severity: 'high',
    category: 'insecure-config',
    title: 'TLS Certificate Validation Bypassed',
    description:
      'Setting ServerCertificateValidationCallback to always return true disables TLS certificate verification, enabling man-in-the-middle attacks.',
    pattern: /ServerCertificateValidationCallback\s*[+=]\s*.*(?:=>\s*true|\(\s*\)\s*=>\s*true|return\s+true)/,
    languages: ['C#'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-184',
    severity: 'high',
    category: 'xss',
    title: 'Response.Write() Without Encoding',
    description:
      'Response.Write() outputs raw HTML to the browser. If user input is included without encoding, it enables XSS. Use HttpUtility.HtmlEncode() or Razor encoding.',
    pattern: /Response\.Write\s*\(\s*(?!.*(?:HtmlEncode|AntiXss|Encode))/,
    languages: ['C#'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-185',
    severity: 'high',
    category: 'path-traversal',
    title: 'File/Directory Delete with User-Controlled Path',
    description:
      'Passing user input to Directory.Delete() or File.Delete() without path validation allows attackers to delete arbitrary files. Canonicalize paths and validate against an allowed root.',
    pattern: /(?:Directory|File)\.Delete\s*\(\s*(?!\s*["'@])[a-zA-Z_]/,
    languages: ['C#'],
    cwe: 'CWE-22',
  },
  {
    id: 'VULN-186',
    severity: 'high',
    category: 'missing-auth',
    title: '[AllowAnonymous] on Sensitive Endpoint',
    description:
      'The [AllowAnonymous] attribute disables authentication on the decorated endpoint. Verify this is intentional and not applied to sensitive operations like admin or payment endpoints.',
    pattern: /\[AllowAnonymous\]/,
    languages: ['C#'],
    cwe: 'CWE-306',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-187',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'Weak Hash Algorithm (MD5 or SHA1)',
    description:
      'MD5 and SHA1 are cryptographically broken. Use SHA256.Create(), SHA384.Create(), or SHA512.Create() for hashing.',
    pattern: /(?:MD5|SHA1)\.Create\s*\(\s*\)/,
    languages: ['C#'],
    cwe: 'CWE-328',
  },
  {
    id: 'VULN-188',
    severity: 'medium',
    category: 'csrf',
    title: 'Missing [ValidateAntiForgeryToken] on POST Action',
    description:
      'ASP.NET MVC POST actions without [ValidateAntiForgeryToken] are vulnerable to Cross-Site Request Forgery. Add the attribute to all state-changing actions.',
    pattern: /\[HttpPost\](?!\s*\[ValidateAntiForgeryToken\])/,
    languages: ['C#'],
    cwe: 'CWE-352',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-189',
    severity: 'low',
    category: 'production-readiness',
    title: 'Console.WriteLine in Production Code',
    description:
      'Console.WriteLine is typically used for debugging. Use a structured logging framework (e.g., ILogger, Serilog, NLog) in production applications.',
    pattern: /Console\.Write(?:Line)?\s*\(/,
    languages: ['C#'],
    cwe: 'CWE-489',
  },
];
