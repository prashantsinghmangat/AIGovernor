/**
 * Java-specific vulnerability rules.
 * 15 rules covering SQL injection, command injection, deserialization,
 * Log4Shell, weak crypto, CORS, XXE, insecure randomness, certificate
 * validation, path traversal, exception handling, LDAP injection, and
 * debug logging.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const JAVA_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL (4 rules) — Immediate remediation required
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-130',
    severity: 'critical',
    category: 'sql-injection',
    title: 'SQL Injection via String Concatenation',
    description:
      'Building SQL queries with string concatenation allows injection attacks. Use PreparedStatement with parameterized queries instead.',
    pattern:
      /(?:executeQuery|executeUpdate|execute)\s*\(\s*(?:[a-zA-Z_]\w*\s*\+|"[^"]*"\s*\+\s*[a-zA-Z_])/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-131',
    severity: 'critical',
    category: 'command-injection',
    title: 'OS Command Injection via Runtime.exec()',
    description:
      'Passing variable strings to Runtime.getRuntime().exec() allows command injection. Use ProcessBuilder with explicit argument lists and validate all inputs.',
    pattern:
      /Runtime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec\s*\(\s*(?!["'])[a-zA-Z_]/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-132',
    severity: 'critical',
    category: 'deserialization',
    title: 'Unsafe Java Object Deserialization',
    description:
      'ObjectInputStream.readObject() deserializes arbitrary objects, enabling remote code execution if untrusted data is processed. Use allowlists or safer formats like JSON.',
    pattern: /ObjectInputStream[\s\S]{0,60}\.readObject\s*\(/,
    languages: ['Java'],
    cwe: 'CWE-502',
  },
  {
    id: 'VULN-133',
    severity: 'critical',
    category: 'code-injection',
    title: 'Log4j JNDI Injection (Log4Shell)',
    description:
      'The ${jndi: pattern in log messages triggers JNDI lookups in vulnerable Log4j versions (< 2.17.0), allowing remote code execution. Upgrade Log4j and sanitize log inputs.',
    pattern: /\$\{jndi:/i,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-917',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH (7 rules) — Fix in current sprint
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-134',
    severity: 'high',
    category: 'weak-crypto',
    title: 'Weak Hash Algorithm (MD5 / SHA-1)',
    description:
      'MD5 and SHA-1 are cryptographically broken and vulnerable to collision attacks. Use MessageDigest.getInstance("SHA-256") or stronger.',
    pattern: /MessageDigest\s*\.\s*getInstance\s*\(\s*"(?:MD5|SHA-1)"\s*\)/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-328',
  },
  {
    id: 'VULN-135',
    severity: 'high',
    category: 'insecure-config',
    title: 'Spring CORS Wildcard Origin',
    description:
      'Using @CrossOrigin("*") allows any website to make authenticated cross-origin requests. Restrict to specific trusted origins.',
    pattern: /@CrossOrigin\s*\(\s*(?:"[*]"|origins\s*=\s*"[*]")/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-942',
  },
  {
    id: 'VULN-136',
    severity: 'high',
    category: 'xxe',
    title: 'XML External Entity (XXE) via DocumentBuilderFactory',
    description:
      'DocumentBuilderFactory without disabling external entities is vulnerable to XXE attacks. Call setFeature to disable DOCTYPE declarations and external entities.',
    pattern:
      /DocumentBuilderFactory\s*\.\s*newInstance\s*\(\s*\)(?![\s\S]{0,200}setFeature)/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-611',
  },
  {
    id: 'VULN-137',
    severity: 'high',
    category: 'weak-crypto',
    title: 'Insecure Random Number Generator',
    description:
      'java.util.Random is not cryptographically secure. Use java.security.SecureRandom for tokens, keys, passwords, and other security-sensitive values.',
    pattern: /new\s+Random\s*\(\s*\)(?=[\s\S]{0,100}(?:token|key|secret|password|session|nonce|salt|otp|pin|code|auth|crypt))/i,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-330',
  },
  {
    id: 'VULN-138',
    severity: 'high',
    category: 'insecure-config',
    title: 'Custom TrustManager Disabling Certificate Validation',
    description:
      'A TrustManager that does not validate certificates allows man-in-the-middle attacks. Use the default TrustManager or properly validate certificate chains.',
    pattern:
      /X509TrustManager[\s\S]{0,300}(?:checkServerTrusted|checkClientTrusted)[\s\S]{0,80}\{\s*\}/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-139',
    severity: 'high',
    category: 'sql-injection',
    title: 'Spring Request Parameter in SQL Concatenation',
    description:
      'Concatenating @RequestParam or @PathVariable values directly into SQL strings allows injection. Use parameterized queries or Spring Data JPA.',
    pattern:
      /(?:@RequestParam|@PathVariable)[\s\S]{0,100}(?:executeQuery|executeUpdate|execute|createQuery|nativeQuery)\s*\(\s*(?:"[^"]*"\s*\+|[a-zA-Z_]\w*\s*\+)/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-140',
    severity: 'high',
    category: 'path-traversal',
    title: 'Path Traversal via User Input in File Constructor',
    description:
      'Passing request parameters or user input directly to new File() allows directory traversal attacks. Validate and canonicalize paths before use.',
    pattern:
      /new\s+File\s*\(\s*(?:request\s*\.\s*getParameter|req\s*\.\s*getParameter|params\s*\.\s*get|@PathVariable|@RequestParam)/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-22',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM (3 rules) — Schedule for remediation
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-141',
    severity: 'medium',
    category: 'error-handling',
    title: 'Overly Broad Exception Catch',
    description:
      'Catching Exception or Throwable broadly can mask security-relevant errors and unexpected conditions. Catch specific exception types instead.',
    pattern: /catch\s*\(\s*(?:Exception|Throwable)\s+\w+\s*\)/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-396',
  },
  {
    id: 'VULN-142',
    severity: 'medium',
    category: 'error-handling',
    title: 'Empty Catch Block',
    description:
      'Empty catch blocks silently swallow exceptions, hiding errors that could indicate security issues or data corruption. Log or handle exceptions explicitly.',
    pattern: /catch\s*\(\s*\w+\s+\w+\s*\)\s*\{\s*\}/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-390',
  },
  {
    id: 'VULN-143',
    severity: 'medium',
    category: 'ldap-injection',
    title: 'LDAP Injection via String Concatenation',
    description:
      'Building LDAP search filters with string concatenation allows injection attacks. Use parameterized LDAP queries or escape special characters.',
    pattern:
      /(?:search|lookup)\s*\(\s*(?:[a-zA-Z_]\w*\s*\+|"[^"]*"\s*\+)[\s\S]{0,60}(?:filter|cn=|uid=|ou=|dc=)/i,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-90',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW (1 rule) — Best practices / informational
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-144',
    severity: 'low',
    category: 'production-readiness',
    title: 'Console Output in Production Code',
    description:
      'System.out.println and System.err.println are not suitable for production logging. Use a logging framework (SLF4J, Log4j2, java.util.logging) for proper log levels and output control.',
    pattern: /System\s*\.\s*(?:out|err)\s*\.\s*println\s*\(/,
    languages: ['Java', 'Kotlin'],
    cwe: 'CWE-489',
  },
];
