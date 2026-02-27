/**
 * JavaScript & TypeScript specific vulnerability rules.
 * Extracted from the original monolithic detector.
 *
 * Covers: XSS, command injection, SQL injection, CORS, cookies, crypto,
 * prototype pollution, NoSQL injection, SSRF, CSRF, timing attacks,
 * deprecated APIs, and production-readiness.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const JS_TS_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-005',
    severity: 'critical',
    category: 'code-injection',
    title: 'Dynamic eval() Usage',
    description:
      'eval() with dynamic input allows arbitrary code execution. Use safer alternatives like JSON.parse() or AST-based evaluation.',
    pattern: /\beval\s*\(\s*(?!['"`])[^)]+\)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-95',
  },
  {
    id: 'VULN-006',
    severity: 'critical',
    category: 'sql-injection',
    title: 'Potential SQL Injection',
    description:
      'String interpolation in SQL queries allows injection attacks. Use parameterized queries or an ORM.',
    pattern: /(?:query|execute|raw)\s*\(\s*[`'"](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*\$\{/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-052',
    severity: 'critical',
    category: 'code-injection',
    title: 'Function Constructor with Dynamic Input',
    description:
      'new Function() with dynamic input is equivalent to eval() and allows arbitrary code execution.',
    pattern: /new\s+Function\s*\(\s*(?!['"`]\s*\))[^)]+\)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-95',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-010',
    severity: 'high',
    category: 'xss',
    title: 'innerHTML Assignment',
    description:
      'Setting innerHTML with untrusted data enables XSS attacks. Use textContent or a sanitization library.',
    pattern: /\.innerHTML\s*=/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-011',
    severity: 'high',
    category: 'xss',
    title: 'dangerouslySetInnerHTML Usage',
    description:
      'dangerouslySetInnerHTML bypasses React XSS protections. Sanitize input with DOMPurify or similar.',
    pattern: /dangerouslySetInnerHTML/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-012',
    severity: 'high',
    category: 'xss',
    title: 'document.write() Usage',
    description:
      'document.write() with dynamic content enables XSS. Use DOM manipulation APIs instead.',
    pattern: /document\.write\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-79',
  },
  {
    id: 'VULN-013',
    severity: 'high',
    category: 'command-injection',
    title: 'Command Injection Risk',
    description:
      'Passing dynamic strings to exec/spawn can lead to command injection. Use execFile with argument arrays.',
    pattern: /(?:exec|execSync|spawnSync)\s*\(\s*(?!['"`])/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-015',
    severity: 'high',
    category: 'insecure-config',
    title: 'CORS Wildcard Origin',
    description:
      'Access-Control-Allow-Origin: * allows any website to make requests. Restrict to specific trusted origins.',
    pattern: /(?:Access-Control-Allow-Origin|allowedOrigins?|cors.*origin)\s*[:=]\s*['"`]\*['"`]/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-942',
  },
  {
    id: 'VULN-016',
    severity: 'high',
    category: 'insecure-config',
    title: 'Disabled SSL/TLS Verification',
    description:
      'Setting rejectUnauthorized to false disables SSL certificate validation, enabling man-in-the-middle attacks.',
    pattern: /rejectUnauthorized\s*:\s*false/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-017',
    severity: 'high',
    category: 'path-traversal',
    title: 'Path Traversal Risk',
    description:
      'Concatenating user input into file paths without sanitization allows directory traversal attacks. Validate and normalize paths.',
    pattern: /(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync|unlink|unlinkSync|access|accessSync)\s*\(\s*(?!['"`])[^)]*\+/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-22',
  },
  {
    id: 'VULN-018',
    severity: 'high',
    category: 'open-redirect',
    title: 'Open Redirect',
    description:
      'Redirecting to user-controlled URLs can be used for phishing. Validate redirect targets against a whitelist.',
    pattern: /(?:res\.redirect|redirect|location\.href|window\.location)\s*(?:\(|=)\s*(?:req\.|request\.|params\.|query\.)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-601',
  },
  {
    id: 'VULN-019',
    severity: 'high',
    category: 'prototype-pollution',
    title: 'Prototype Pollution Risk',
    description:
      'Direct access to __proto__ or constructor.prototype can lead to prototype pollution attacks affecting all objects.',
    pattern: /(?:\[['"`]__proto__['"`]\]|__proto__\s*[=.]|\[['"`]constructor['"`]\]\s*\[['"`]prototype['"`]\])/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-1321',
  },
  {
    id: 'VULN-053',
    severity: 'high',
    category: 'nosql-injection',
    title: 'NoSQL Injection Risk',
    description:
      'Passing user input directly to MongoDB query operators ($where, $regex, $gt, $ne) enables NoSQL injection. Sanitize inputs.',
    pattern: /(?:find|findOne|aggregate|updateOne|deleteOne)\s*\([^)]*\$(?:where|regex|gt|ne|lt|in|nin|or|and|exists)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-943',
  },
  {
    id: 'VULN-054',
    severity: 'high',
    category: 'ssrf',
    title: 'Potential SSRF — Dynamic URL in HTTP Request',
    description:
      'Passing user-controlled strings to fetch/axios can enable Server-Side Request Forgery. Validate URLs against an allowlist.',
    pattern: /(?:fetch|axios\.(?:get|post|put|delete|patch|request)|http\.(?:get|request)|got)\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-918',
  },
  {
    id: 'VULN-055',
    severity: 'high',
    category: 'insecure-config',
    title: 'Disabled CSRF Protection',
    description:
      'Explicitly disabling CSRF protection leaves the application vulnerable to Cross-Site Request Forgery attacks.',
    pattern: /(?:csrf|xsrf)\s*[:=]\s*false/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-352',
  },
  {
    id: 'VULN-056',
    severity: 'high',
    category: 'code-injection',
    title: 'Unsafe Deserialization',
    description:
      'Deserializing untrusted data (unserialize, yaml.load without SafeLoader) can lead to remote code execution.',
    pattern: /(?:unserialize|yaml\.load)\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-502',
  },
  {
    id: 'VULN-057',
    severity: 'high',
    category: 'insecure-config',
    title: 'Disabled Security Headers (Helmet)',
    description:
      'Disabling helmet or individual security headers removes protection against common attacks.',
    pattern: /(?:contentSecurityPolicy|frameguard|hsts|xssFilter|noSniff)\s*:\s*false/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-693',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-020',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'Math.random() for Security',
    description:
      'Math.random() is not cryptographically secure. Use crypto.getRandomValues() or crypto.randomBytes() for tokens/keys.',
    pattern: /Math\.random\s*\(\s*\).*(?:token|key|secret|password|hash|salt|nonce|session)/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-330',
  },
  {
    id: 'VULN-021',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'Weak Hash Algorithm (MD5/SHA1)',
    description:
      'MD5 and SHA1 are cryptographically broken. Use SHA-256 or stronger for hashing.',
    pattern: /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-328',
  },
  {
    id: 'VULN-023',
    severity: 'medium',
    category: 'insecure-config',
    title: 'Insecure Cookie — httpOnly Disabled',
    description:
      'Cookies without httpOnly flag are accessible via JavaScript, making them vulnerable to XSS-based theft.',
    pattern: /(?:httpOnly|HttpOnly|httponly)\s*:\s*false/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-614',
  },
  {
    id: 'VULN-024',
    severity: 'medium',
    category: 'info-exposure',
    title: 'Sensitive Data in Logs',
    description:
      'Logging passwords, tokens, or secrets exposes them in log files and monitoring systems.',
    pattern: /console\.log\s*\(.*(?:password|secret|token|apiKey|api_key|credential)/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-532',
  },
  {
    id: 'VULN-025',
    severity: 'medium',
    category: 'production-readiness',
    title: 'Debugger Statement Left in Code',
    description:
      'debugger statements pause execution in production. They must be removed before deployment.',
    pattern: /^\s*debugger\s*;?\s*$/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-489',
  },
  {
    id: 'VULN-026',
    severity: 'medium',
    category: 'insecure-config',
    title: 'Disabled TLS Globally via Environment',
    description:
      'Setting NODE_TLS_REJECT_UNAUTHORIZED=0 disables SSL verification for all HTTPS requests in the process.',
    pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-027',
    severity: 'medium',
    category: 'insecure-config',
    title: 'Insecure Cookie — Secure Flag Disabled',
    description:
      'Cookies without the secure flag are sent over unencrypted HTTP, exposing session data to network attackers.',
    pattern: /(?<![A-Za-z])secure\s*:\s*false/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-614',
  },
  {
    id: 'VULN-029',
    severity: 'medium',
    category: 'info-exposure',
    title: 'Stack Trace Exposed to Client',
    description:
      'Sending full error stack traces to clients exposes internal paths, library versions, and logic. Return generic error messages.',
    pattern: /(?:res\.(?:json|send|status)\s*\(|return\s+(?:NextResponse\.json|Response\.json))\s*.*(?:\.stack|\.message|error\b)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-209',
  },
  {
    id: 'VULN-058',
    severity: 'medium',
    category: 'timing-attack',
    title: 'Non-Constant-Time String Comparison',
    description:
      'Using === to compare secrets, tokens, or hashes is vulnerable to timing attacks. Use crypto.timingSafeEqual() instead.',
    pattern: /(?:token|secret|hash|signature|hmac|digest)\s*===\s*(?:req\.|request\.|params\.|body\.|query\.)/i,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-208',
  },
  {
    id: 'VULN-059',
    severity: 'medium',
    category: 'production-readiness',
    title: 'Empty Catch Block — Silent Error Swallowing',
    description:
      'Empty catch blocks hide errors that could indicate security issues or data corruption. Log errors or handle them explicitly.',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-390',
  },
  {
    id: 'VULN-061',
    severity: 'medium',
    category: 'insecure-config',
    title: 'JWT Without Expiration',
    description:
      'JWTs without expiration (no expiresIn option) remain valid forever if compromised. Always set an expiration time.',
    pattern: /jwt\.sign\s*\([^)]*\)\s*(?!.*expiresIn)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-613',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-031',
    severity: 'low',
    category: 'deprecated-api',
    title: 'Deprecated Buffer() Constructor',
    description:
      'new Buffer() is deprecated and can cause security issues. Use Buffer.from(), Buffer.alloc(), or Buffer.allocUnsafe().',
    pattern: /new\s+Buffer\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-676',
  },
  {
    id: 'VULN-032',
    severity: 'low',
    category: 'deprecated-api',
    title: 'Deprecated escape()/unescape()',
    description:
      'Global escape() and unescape() are deprecated. Use encodeURIComponent()/decodeURIComponent().',
    pattern: /(?<![.\w])(?:escape|unescape)\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-676',
  },
  {
    id: 'VULN-033',
    severity: 'low',
    category: 'production-readiness',
    title: 'alert() Call in Code',
    description:
      'alert() dialogs block the UI thread and should not appear in production code. Use a toast/notification component.',
    pattern: /(?<![.\w])alert\s*\(\s*['"`]/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-489',
  },
  {
    id: 'VULN-034',
    severity: 'low',
    category: 'production-readiness',
    title: 'Disabled ESLint Rule (Security)',
    description:
      'Disabling ESLint security rules may hide real vulnerabilities. Review if the suppression is justified.',
    pattern: /eslint-disable.*(?:no-eval|no-implied-eval|no-script-url|no-unsafe)/i,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'VULN-037',
    severity: 'low',
    category: 'production-readiness',
    title: 'Console Error with Full Error Object',
    description:
      'Logging full error objects in production may expose stack traces and internal details in monitoring systems.',
    pattern: /console\.error\s*\(\s*(?:err|error|e)\s*\)/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-209',
  },
  {
    id: 'VULN-038',
    severity: 'low',
    category: 'deprecated-api',
    title: 'Deprecated createCipher() (No IV)',
    description:
      'crypto.createCipher() uses a derived IV and is deprecated. Use crypto.createCipheriv() with an explicit random IV.',
    pattern: /createCipher\s*\(\s*['"][^'"]+['"]\s*,/,
    languages: ['JavaScript', 'TypeScript'],
    cwe: 'CWE-327',
  },
];
