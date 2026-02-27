/**
 * SQL-specific vulnerability rules.
 * Covers excessive privileges, dangerous DDL/DML, dynamic execution,
 * SELECT *, default passwords, grant options, and unbounded queries.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

export const SQL_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-160',
    severity: 'critical',
    category: 'excessive-privileges',
    title: 'GRANT ALL PRIVILEGES',
    description:
      'Granting all privileges gives unrestricted access to the target. Follow the principle of least privilege and grant only the specific permissions required.',
    pattern: /GRANT\s+ALL\s+PRIVILEGES/i,
    languages: ['SQL'],
    cwe: 'CWE-250',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-161',
    severity: 'high',
    category: 'dangerous-ddl',
    title: 'DROP TABLE/DATABASE Without IF EXISTS',
    description:
      'DROP TABLE or DROP DATABASE without IF EXISTS will throw an error if the target does not exist, and may cause unintended data loss. Always guard with IF EXISTS.',
    pattern: /DROP\s+(?:TABLE|DATABASE)\s+(?!IF\s+EXISTS\b)\w/i,
    languages: ['SQL'],
    cwe: 'CWE-20',
  },
  {
    id: 'VULN-162',
    severity: 'high',
    category: 'dangerous-dml',
    title: 'UPDATE or DELETE Without WHERE Clause',
    description:
      'UPDATE or DELETE without a WHERE clause affects every row in the table, which is almost always unintentional and can cause catastrophic data loss.',
    pattern: /(?:UPDATE\s+\w+\s+SET\s+[^;]*(?:;|$)(?![\s\S]*WHERE)|DELETE\s+FROM\s+\w+\s*(?:;|$)(?![\s\S]*WHERE))/i,
    languages: ['SQL'],
    cwe: 'CWE-20',
  },
  {
    id: 'VULN-163',
    severity: 'high',
    category: 'sql-injection',
    title: 'EXECUTE IMMEDIATE with String Concatenation',
    description:
      'Using EXECUTE IMMEDIATE with concatenated strings allows SQL injection. Use bind variables or parameterized queries.',
    pattern: /EXECUTE\s+IMMEDIATE\s+[^;]*(?:\|\||CONCAT|\+)\s*/i,
    languages: ['SQL'],
    cwe: 'CWE-89',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-164',
    severity: 'medium',
    category: 'data-exposure',
    title: 'SELECT * in Production Query',
    description:
      'SELECT * returns all columns, potentially exposing sensitive data and degrading performance. Explicitly list only the columns needed.',
    pattern: /SELECT\s+\*\s+FROM\b/i,
    languages: ['SQL'],
  },
  {
    id: 'VULN-165',
    severity: 'medium',
    category: 'hardcoded-secret',
    title: 'Default Password in CREATE USER/LOGIN',
    description:
      'Hardcoded passwords in CREATE USER or CREATE LOGIN statements are stored in migration history and version control. Use runtime password injection.',
    pattern: /CREATE\s+(?:USER|LOGIN)\s+\w+.*(?:PASSWORD|IDENTIFIED\s+BY)\s*(?:=\s*)?['"][^'"]+['"]/i,
    languages: ['SQL'],
    cwe: 'CWE-798',
    truncateMatch: true,
  },
  {
    id: 'VULN-166',
    severity: 'medium',
    category: 'excessive-privileges',
    title: 'WITH GRANT OPTION — Privilege Escalation Risk',
    description:
      'WITH GRANT OPTION allows the grantee to further grant permissions to others, enabling uncontrolled privilege escalation.',
    pattern: /WITH\s+GRANT\s+OPTION/i,
    languages: ['SQL'],
    cwe: 'CWE-250',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-167',
    severity: 'low',
    category: 'performance',
    title: 'Unbounded SELECT Without LIMIT/TOP',
    description:
      'SELECT queries without LIMIT (MySQL/PostgreSQL) or TOP (SQL Server) may return millions of rows, causing memory exhaustion and slow responses.',
    pattern: /SELECT\s+(?!\*)[^;]*FROM\s+\w+(?:\s+WHERE\s+[^;]*)?\s*;?\s*$/i,
    languages: ['SQL'],
  },
];
