/**
 * Common code quality rules applicable to all languages.
 *
 * Covers: function length, nesting depth, magic numbers, commented-out code,
 * broad exception catches, parameter count, empty bodies, nested ternaries,
 * TODO comments, console logging, long lines, and unreachable code.
 */
import type { CodeQualityRule } from '../types';

export const COMMON_QUALITY_RULES: CodeQualityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-001',
    severity: 'warning',
    category: 'complexity',
    title: 'Function Over 50 Lines',
    description:
      'Long functions are harder to understand, test, and maintain. Functions exceeding 50 lines likely have too many responsibilities.',
    suggestion: 'Extract into smaller focused functions',
    pattern: /(?:function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/,
    languages: '*',
  },
  {
    id: 'CQ-002',
    severity: 'warning',
    category: 'complexity',
    title: 'Excessive Nesting Depth (>4 Levels)',
    description:
      'Code nested more than 4 levels deep is difficult to follow and indicates overly complex logic.',
    suggestion: 'Use early returns or extract helper functions',
    pattern: /^(?:\t{5,}|[ ]{20,})\S/,
    languages: '*',
  },
  {
    id: 'CQ-004',
    severity: 'warning',
    category: 'maintainability',
    title: 'Commented-Out Code',
    description:
      'Commented-out code clutters the codebase and creates confusion about what is active. Version control preserves history.',
    suggestion: 'Remove dead code; use version control for history',
    pattern: /^\s*(?:\/\/|#|\/\*)\s*(?:function |if\s*\(|for\s*\(|return\s|const\s|let\s|var\s|import\s)/,
    languages: '*',
  },
  {
    id: 'CQ-007',
    severity: 'warning',
    category: 'complexity',
    title: 'Too Many Function Parameters (>5)',
    description:
      'Functions with more than 5 parameters are hard to call correctly and indicate the function does too much.',
    suggestion: 'Use an options object parameter',
    pattern: /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?function)\s*\(\s*\w+\s*(?::[^,)]+)?\s*,\s*\w+\s*(?::[^,)]+)?\s*,\s*\w+\s*(?::[^,)]+)?\s*,\s*\w+\s*(?::[^,)]+)?\s*,\s*\w+\s*(?::[^,)]+)?\s*,\s*\w+/,
    languages: '*',
  },
  {
    id: 'CQ-009',
    severity: 'warning',
    category: 'readability',
    title: 'Nested Ternary Operator',
    description:
      'Nested ternary expressions are notoriously hard to read and maintain, especially for developers unfamiliar with the logic.',
    suggestion: 'Replace with if/else or switch for readability',
    pattern: /\?[^?:]*:[^?:]*\?[^?:]*:/,
    languages: '*',
  },
  {
    id: 'CQ-010',
    severity: 'warning',
    category: 'maintainability',
    title: 'TODO/FIXME/HACK Comment',
    description:
      'TODO, FIXME, and HACK comments indicate unfinished work or known issues that should be tracked and resolved.',
    suggestion: 'Track in issue tracker and resolve',
    pattern: /(?:\/\/|#|\/\*|<!--)\s*(?:TODO|FIXME|HACK)\b/i,
    languages: '*',
  },
  {
    id: 'CQ-012',
    severity: 'warning',
    category: 'readability',
    title: 'Long Line (>200 Characters)',
    description:
      'Lines exceeding 200 characters are difficult to read, review, and diff. They often indicate complex expressions that should be broken up.',
    suggestion: 'Break into multiple lines for readability',
    pattern: /^.{201,}$/,
    languages: '*',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-006',
    severity: 'error',
    category: 'error-handling',
    title: 'Broad Exception Catch',
    description:
      'Catching all exceptions without specifying a type hides bugs and makes debugging extremely difficult.',
    suggestion: 'Catch specific error types and handle appropriately',
    pattern: /catch\s*\(\s*(?:e|err|error|ex|exception)?\s*\)\s*\{\s*\}/,
    languages: '*',
  },
  {
    id: 'CQ-013',
    severity: 'error',
    category: 'correctness',
    title: 'Unreachable Code After Return',
    description:
      'Code after a return statement in the same block will never execute. This usually indicates a logic error or leftover code.',
    suggestion: 'Remove unreachable code',
    pattern: /^\s*return\s+[^;]*;\s*\n\s*(?!\s*\}|$)\S/,
    languages: '*',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-003',
    severity: 'info',
    category: 'readability',
    title: 'Magic Number',
    description:
      'Standalone numeric literals in assignments and comparisons make code harder to understand. Named constants clarify intent.',
    suggestion: 'Extract to a named constant',
    pattern: /(?:===?|!==?|<=?|>=?|=)\s*(?!0\b|1\b|-1\b|100\b|200\b|404\b|500\b)\d{2,}/,
    languages: '*',
  },
  {
    id: 'CQ-008',
    severity: 'info',
    category: 'maintainability',
    title: 'Empty Function/Method Body',
    description:
      'Empty function bodies may indicate incomplete implementation or missing logic that was intended to be filled in.',
    suggestion: 'Add implementation or remove placeholder',
    pattern: /(?:function\s+\w+\s*\([^)]*\)|=>\s*)\s*\{\s*\}/,
    languages: '*',
  },
  {
    id: 'CQ-011',
    severity: 'info',
    category: 'production-readiness',
    title: 'Console Log/Debug Statement',
    description:
      'Console logging in production code clutters output and may inadvertently expose internal details.',
    suggestion: 'Use a structured logging library',
    pattern: /\bconsole\.(?:log|debug)\s*\(/,
    languages: '*',
  },
];
