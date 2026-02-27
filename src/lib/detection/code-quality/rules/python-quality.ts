/**
 * Python specific code quality rules.
 *
 * Covers: mutable default arguments, bare except, star imports, global state,
 * sys.exit in libraries, Python 2 print syntax, %-formatting, file handling,
 * and type comparison anti-patterns.
 */
import type { CodeQualityRule } from '../types';

export const PYTHON_QUALITY_RULES: CodeQualityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-040',
    severity: 'error',
    category: 'correctness',
    title: 'Mutable Default Argument',
    description:
      'Default mutable arguments ([], {}, set()) are shared across all calls to the function, causing unexpected side effects.',
    suggestion: 'Use None as default and create inside function',
    pattern: /def\s+\w+\s*\(.*=\s*(?:\[\]|\{\}|set\(\))/,
    languages: ['Python'],
  },
  {
    id: 'CQ-041',
    severity: 'error',
    category: 'error-handling',
    title: 'Bare Except Clause',
    description:
      'A bare except clause catches all exceptions including SystemExit and KeyboardInterrupt, making it impossible to stop the program gracefully.',
    suggestion: 'Catch specific exception types',
    pattern: /except\s*:/,
    languages: ['Python'],
  },
  {
    id: 'CQ-045',
    severity: 'error',
    category: 'design',
    title: 'sys.exit() in Library Code',
    description:
      'Calling sys.exit() in library code terminates the entire process instead of letting the caller decide how to handle errors.',
    suggestion: 'Raise an exception instead of exiting',
    pattern: /\bsys\.exit\s*\(/,
    languages: ['Python'],
  },
  {
    id: 'CQ-048',
    severity: 'error',
    category: 'resource-management',
    title: 'Open File Without Context Manager',
    description:
      'Assigning open() to a variable without a with-statement risks leaving the file handle open if an exception occurs.',
    suggestion: 'Use with statement for automatic resource cleanup',
    pattern: /\w+\s*=\s*open\s*\(/,
    languages: ['Python'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-042',
    severity: 'warning',
    category: 'maintainability',
    title: 'Star Import',
    description:
      'Wildcard imports (from x import *) pollute the namespace, making it unclear where names originate and causing potential collisions.',
    suggestion: 'Import specific names to avoid namespace pollution',
    pattern: /from\s+\w+\s+import\s+\*/,
    languages: ['Python'],
  },
  {
    id: 'CQ-044',
    severity: 'warning',
    category: 'design',
    title: 'Global Variable Mutation',
    description:
      'The global keyword promotes shared mutable state, which makes code harder to reason about, test, and parallelize.',
    suggestion: 'Avoid global state; use function parameters or classes',
    pattern: /\bglobal\s+\w+/,
    languages: ['Python'],
  },
  {
    id: 'CQ-047',
    severity: 'warning',
    category: 'modernization',
    title: 'Old-Style String Formatting (%)',
    description:
      'The % operator for string formatting is error-prone and less readable than f-strings or .format().',
    suggestion: 'Use f-strings or .format() for modern Python',
    pattern: /['"].*%[sd].*['"]\s*%\s*\(/,
    languages: ['Python'],
  },
  {
    id: 'CQ-049',
    severity: 'warning',
    category: 'correctness',
    title: 'Type Comparison with type()',
    description:
      'Comparing types with type() fails for subclasses. isinstance() is the idiomatic and correct way to check types in Python.',
    suggestion: 'Use isinstance() for proper subclass handling',
    pattern: /type\(\w+\)\s*(?:==|!=|is)\s*/,
    languages: ['Python'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-046',
    severity: 'info',
    category: 'modernization',
    title: 'Python 2 Print Statement',
    description:
      'Using print without parentheses is Python 2 syntax and will cause a SyntaxError in Python 3.',
    suggestion: 'Use print() function (Python 3 syntax)',
    pattern: /\bprint\s+[^(]/,
    languages: ['Python'],
  },
];
