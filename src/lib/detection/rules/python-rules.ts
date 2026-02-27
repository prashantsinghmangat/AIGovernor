/**
 * Python-specific vulnerability rules.
 *
 * 15 rules covering:
 * - Unsafe deserialization (pickle, yaml)
 * - Command / code injection (subprocess, os.system, exec, compile)
 * - Insecure framework configuration (Flask, Django)
 * - SQL injection (SQLAlchemy)
 * - Disabled SSL verification (requests)
 * - Weak assert-based validation
 * - XSS via Django mark_safe
 * - Temp-file race conditions
 * - Weak hash algorithms
 * - Debug print statements
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const PYTHON_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL (5 rules) — Immediate remediation required
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-110',
    severity: 'critical',
    category: 'deserialization',
    title: 'Unsafe Pickle Deserialization',
    description:
      'pickle.load() and pickle.loads() can execute arbitrary code when deserializing untrusted data. ' +
      'Use safer formats such as JSON, or validate the source rigorously before unpickling.',
    pattern: /\bpickle\.loads?\s*\(/,
    languages: ['Python'],
    cwe: 'CWE-502',
  },
  {
    id: 'VULN-111',
    severity: 'critical',
    category: 'command-injection',
    title: 'Subprocess with shell=True',
    description:
      'subprocess.call(), subprocess.run(), and subprocess.Popen() with shell=True pass the command ' +
      'through the system shell, enabling injection when arguments contain user input. ' +
      'Use a list of arguments without shell=True instead.',
    pattern: /\bsubprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/,
    languages: ['Python'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-112',
    severity: 'critical',
    category: 'command-injection',
    title: 'os.system() with Dynamic Input',
    description:
      'os.system() with dynamically constructed strings (f-strings, .format(), %, or concatenation) ' +
      'allows command injection. Use subprocess with a list of arguments instead.',
    pattern: /\bos\.system\s*\(\s*(?:f['"`]|[^)]*\.format\s*\(|[^)]*%\s|[^)]*\+\s)/,
    languages: ['Python'],
    cwe: 'CWE-78',
  },
  {
    id: 'VULN-113',
    severity: 'critical',
    category: 'deserialization',
    title: 'Unsafe YAML Load',
    description:
      'yaml.load() without Loader=SafeLoader (or yaml.safe_load) can execute arbitrary Python objects ' +
      'embedded in the YAML document. Always use yaml.safe_load() or specify Loader=SafeLoader.',
    pattern: /\byaml\.load\s*\([^)]*\)(?!.*Loader\s*=\s*SafeLoader)/,
    languages: ['Python'],
    cwe: 'CWE-502',
  },
  {
    id: 'VULN-114',
    severity: 'critical',
    category: 'code-injection',
    title: 'exec() or compile() with Variable Input',
    description:
      'exec() and compile() with non-literal input allow arbitrary code execution. ' +
      'Avoid dynamic code evaluation; use safe alternatives such as AST parsing or sandboxed environments.',
    pattern: /\b(?:exec|compile)\s*\(\s*(?!['"`])(?!\s*\))/,
    languages: ['Python'],
    cwe: 'CWE-95',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH (8 rules) — Fix in current sprint
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-115',
    severity: 'high',
    category: 'insecure-config',
    title: 'Flask Debug Mode Enabled',
    description:
      'app.run(debug=True) exposes the Werkzeug debugger, which allows arbitrary code execution ' +
      'via the interactive console. Never enable debug mode in production.',
    pattern: /\bapp\.run\s*\([^)]*debug\s*=\s*True/,
    languages: ['Python'],
    cwe: 'CWE-489',
  },
  {
    id: 'VULN-116',
    severity: 'high',
    category: 'insecure-config',
    title: 'Django DEBUG Mode Enabled',
    description:
      'DEBUG = True in Django settings exposes detailed error pages with stack traces, local variables, ' +
      'and settings to users. Set DEBUG = False in production.',
    pattern: /\bDEBUG\s*=\s*True\b/,
    languages: ['Python'],
    cwe: 'CWE-489',
  },
  {
    id: 'VULN-117',
    severity: 'high',
    category: 'insecure-config',
    title: 'Django ALLOWED_HOSTS Misconfiguration',
    description:
      "ALLOWED_HOSTS = ['*'] or ALLOWED_HOSTS = [] in Django settings allows Host header attacks " +
      'and cache-poisoning. Restrict to specific domain names.',
    pattern: /\bALLOWED_HOSTS\s*=\s*\[\s*(?:['"]\*['"]|\s*)\]/,
    languages: ['Python'],
    cwe: 'CWE-942',
  },
  {
    id: 'VULN-118',
    severity: 'high',
    category: 'sql-injection',
    title: 'SQLAlchemy Raw SQL with F-String',
    description:
      'Using f-string interpolation inside SQLAlchemy text() creates SQL injection vulnerabilities. ' +
      'Use bound parameters (e.g., text(":param")) with .bindparams() instead.',
    pattern: /\btext\s*\(\s*f['"`]/,
    languages: ['Python'],
    cwe: 'CWE-89',
  },
  {
    id: 'VULN-119',
    severity: 'high',
    category: 'insecure-config',
    title: 'SSL Verification Disabled (requests)',
    description:
      'Setting verify=False in requests.get/post/put/delete disables TLS certificate validation, ' +
      'enabling man-in-the-middle attacks. Always verify certificates in production.',
    pattern: /\brequests\.(?:get|post|put|delete|patch|head|options|request)\s*\([^)]*verify\s*=\s*False/,
    languages: ['Python'],
    cwe: 'CWE-295',
  },
  {
    id: 'VULN-120',
    severity: 'high',
    category: 'insecure-validation',
    title: 'Assert Used for Security/Input Validation',
    description:
      'assert statements are removed when Python runs with optimization (-O flag), silently ' +
      'disabling validation. Use explicit if/raise for input validation and security checks.',
    pattern: /\bassert\s+(?:request\.|user\.|session\.|token\b|is_authenticated|is_admin|has_perm|check_|validate_|verify_)/,
    languages: ['Python'],
    cwe: 'CWE-617',
  },
  {
    id: 'VULN-121',
    severity: 'high',
    category: 'xss',
    title: 'Django mark_safe() with Variable Input',
    description:
      'mark_safe() tells Django to skip HTML escaping. Passing variable (non-literal) content creates ' +
      'XSS vulnerabilities. Use format_html() for safe interpolation, or sanitize with bleach.',
    pattern: /\bmark_safe\s*\(\s*(?!['"`])(?!\s*\))/,
    languages: ['Python'],
    cwe: 'CWE-79',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM (2 rules) — Schedule for remediation
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-122',
    severity: 'medium',
    category: 'race-condition',
    title: 'Insecure Temporary File (mktemp)',
    description:
      'tempfile.mktemp() returns a filename but does not create the file, creating a TOCTOU race condition. ' +
      'Use tempfile.mkstemp() or tempfile.NamedTemporaryFile() instead.',
    pattern: /\btempfile\.mktemp\s*\(/,
    languages: ['Python'],
    cwe: 'CWE-377',
  },
  {
    id: 'VULN-123',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'Weak Hash Algorithm (hashlib.new)',
    description:
      "hashlib.new('md5') and hashlib.new('sha1') use cryptographically broken algorithms. " +
      "Use hashlib.new('sha256') or stronger for integrity and security purposes.",
    pattern: /\bhashlib\.new\s*\(\s*['"](?:md5|sha1)['"]/i,
    languages: ['Python'],
    cwe: 'CWE-328',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW (1 rule) — Best practice / informational
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'VULN-124',
    severity: 'low',
    category: 'production-readiness',
    title: 'Print Statement in Production Code',
    description:
      'print() statements may leak sensitive data to stdout/logs and should be replaced with a ' +
      'proper logging framework (e.g., logging.info/debug). Ignored in test files.',
    pattern: /\bprint\s*\(\s*(?!.*#\s*noqa)/,
    languages: ['Python'],
    cwe: 'CWE-489',
  },
];
