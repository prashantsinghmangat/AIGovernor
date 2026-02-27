/**
 * PHP-specific vulnerability rules.
 * Covers eval, command injection, SQL injection, deserialization,
 * SSRF, extract, deprecated APIs, weak crypto, error display, and XSS.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const PHP_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-170',
    severity: 'critical',
    category: 'code-injection',
    title: 'eval() with Dynamic Input',
    description:
      'eval() executes arbitrary PHP code. If user input reaches eval(), an attacker can run any code on the server. Remove eval() or use a safe alternative.',
    pattern: /\beval\s*\(\s*\$/,
    languages: ['PHP'],
    cwe: 'CWE-95',
  },
  {
    id: 'VULN-171',
    severity: 'critical',
    category: 'command-injection',
    title: 'OS Command Execution Function',
    description:
      'system(), exec(), shell_exec(), and passthru() execute OS commands. If user input is included, attackers can run arbitrary commands. Use escapeshellarg() and escapeshellcmd().',
    pattern: /\b(?:system|exec|shell_exec|passthru|popen|proc_open)\s*\(\s*\$/,
    languages: ['PHP'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-172',
    severity: 'critical',
    category: 'sql-injection',
    title: 'Superglobal Used Directly in SQL Query',
    description:
      'Using $_GET, $_POST, or $_REQUEST directly in SQL queries enables SQL injection. Use prepared statements with PDO or MySQLi.',
    pattern: /(?:query|execute|mysql_query|mysqli_query)\s*\([^)]*\$_(?:GET|POST|REQUEST)\b/,
    languages: ['PHP'],
    cwe: 'CWE-89',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-173',
    severity: 'high',
    category: 'deserialization',
    title: 'Unsafe unserialize() with User Input',
    description:
      'unserialize() on untrusted data can trigger arbitrary object instantiation and magic methods, leading to remote code execution. Use json_decode() or specify allowed_classes.',
    pattern: /\bunserialize\s*\(\s*\$/,
    languages: ['PHP'],
    cwe: 'CWE-502',
  },
  {
    id: 'VULN-174',
    severity: 'high',
    category: 'ssrf',
    title: 'file_get_contents() with User-Controlled URL',
    description:
      'Passing user input to file_get_contents() allows SSRF — an attacker can read internal network resources. Validate URLs against an allowlist.',
    pattern: /file_get_contents\s*\(\s*\$/,
    languages: ['PHP'],
    cwe: 'CWE-918',
  },
  {
    id: 'VULN-175',
    severity: 'high',
    category: 'variable-injection',
    title: 'extract() on Superglobals',
    description:
      'extract($_GET), extract($_POST), or extract($_REQUEST) overwrites local variables with user-controlled values, enabling security bypasses.',
    pattern: /\bextract\s*\(\s*\$_(?:GET|POST|REQUEST)\b/,
    languages: ['PHP'],
    cwe: 'CWE-621',
  },
  {
    id: 'VULN-176',
    severity: 'high',
    category: 'deprecated-api',
    title: 'Deprecated mysql_query() Function',
    description:
      'mysql_query() is deprecated and removed in PHP 7+. It does not support parameterized queries, making SQL injection likely. Migrate to PDO or MySQLi.',
    pattern: /\bmysql_query\s*\(/,
    languages: ['PHP'],
    cwe: 'CWE-89',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-177',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'md5() Used for Password Hashing',
    description:
      'md5() is fast and collision-prone, making it unsuitable for password hashing. Use password_hash() with PASSWORD_BCRYPT or PASSWORD_ARGON2ID.',
    pattern: /\bmd5\s*\(\s*\$(?:pass|password|pwd)/i,
    languages: ['PHP'],
    cwe: 'CWE-328',
  },
  {
    id: 'VULN-178',
    severity: 'medium',
    category: 'info-exposure',
    title: 'Display Errors Enabled',
    description:
      'display_errors = On or ini_set("display_errors", "1") leaks stack traces, file paths, and database details to end users. Disable in production and log errors to a file.',
    pattern: /(?:display_errors\s*=\s*(?:On|1|true)|ini_set\s*\(\s*['"]display_errors['"]\s*,\s*['"]1['"])/i,
    languages: ['PHP'],
    cwe: 'CWE-209',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-179',
    severity: 'low',
    category: 'xss',
    title: 'Echo Output Without htmlspecialchars()',
    description:
      'Echoing variables without htmlspecialchars() or htmlentities() can lead to reflected XSS. Wrap all user-facing output in htmlspecialchars($var, ENT_QUOTES, "UTF-8").',
    pattern: /\becho\s+['"]?<[^>]*\$[a-zA-Z_]/,
    languages: ['PHP'],
    cwe: 'CWE-79',
  },
];
