/**
 * Dead code & ESLint-style quality rules.
 *
 * Covers: unreachable code, empty catch, floating promises, magic numbers,
 * duplicate keys, unnecessary else-after-return, no-shadow patterns,
 * prefer-const, arrow function consistency, and more.
 */
import type { CodeQualityRule } from '../types';

export const DEAD_CODE_QUALITY_RULES: CodeQualityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR — Correctness issues that likely indicate bugs
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-050',
    severity: 'error',
    category: 'correctness',
    title: 'Unreachable Code After return',
    description:
      'Statements after a return, throw, or break are never executed. This is usually a logic error or leftover debugging code.',
    suggestion: 'Remove unreachable statements or move them before the return',
    pattern: /\breturn\s+[^;}\n]+[;]?\s*\n\s*(?!\/\/|\/\*|\*)[^\s{}()[\]]/,
    languages: ['JavaScript', 'TypeScript', 'Java', 'C#'],
  },
  {
    id: 'CQ-051',
    severity: 'error',
    category: 'error-handling',
    title: 'Empty catch Block',
    description:
      'An empty catch block silently swallows exceptions, making bugs invisible. Errors disappear without any logging or handling.',
    suggestion: 'Log the error or rethrow it; never silently swallow exceptions',
    pattern: /\}\s*catch\s*\([^)]*\)\s*\{\s*\}/,
    languages: ['JavaScript', 'TypeScript', 'Java', 'C#', 'Go'],
  },
  {
    id: 'CQ-053',
    severity: 'error',
    category: 'correctness',
    title: 'Floating Async Call (void fire-and-forget)',
    description:
      'Using void before an async call explicitly discards the returned Promise, meaning any rejection is unhandled.',
    suggestion: 'Remove void and either await the call or attach .catch(err => ...) to handle rejections',
    pattern: /\bvoid\s+\w+(?:\.\w+)*\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING — Code quality patterns
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-055',
    severity: 'warning',
    category: 'readability',
    title: 'Unnecessary else After return',
    description:
      'An else block after a return statement adds indentation without meaning — the else is unreachable if the if condition is true.',
    suggestion: 'Remove the else block and un-indent the following code',
    pattern: /\breturn\s+[^;]+;\s*\}\s*else\s*\{/,
    languages: ['JavaScript', 'TypeScript', 'Java', 'Go', 'Python'],
  },
  {
    id: 'CQ-056',
    severity: 'warning',
    category: 'maintainability',
    title: 'Magic Number',
    description:
      'A numeric literal other than 0 or 1 is used inline without explanation. Magic numbers make code hard to understand and maintain.',
    suggestion: 'Extract the number into a named constant with a descriptive name',
    // Match numeric literals not adjacent to property names, indices, or version numbers
    pattern: /(?<![.\w])(?<!['"`])(?<!\w)(?:[2-9]\d{2,}|\d{2,})(?![.\w%'"`])/,
    languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C#'],
  },
  {
    id: 'CQ-057',
    severity: 'warning',
    category: 'error-handling',
    title: 'Broad Exception Catch (catch-all)',
    description:
      'Catching all errors without differentiation can hide bugs and makes debugging harder. Use specific error types.',
    suggestion: 'Catch specific exception types and handle them appropriately',
    pattern: /catch\s*\(\s*(?:err|error|e|ex)\s*\)(?!\s*\{[^}]*instanceof)/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-058',
    severity: 'warning',
    category: 'readability',
    title: 'Nested Ternary Expression',
    description:
      'Nested ternary expressions (condition ? a ? b : c : d) are extremely hard to read and maintain. Use if/else instead.',
    suggestion: 'Rewrite as if/else or extract to a helper function',
    pattern: /\?[^:?]+ \? [^:?]+:/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-059',
    severity: 'warning',
    category: 'modernization',
    title: 'Long Argument List (>4 params)',
    description:
      'Functions with more than 4 parameters are hard to call correctly and maintain. Consider using an options object pattern.',
    suggestion: 'Refactor to accept a single options/config object parameter',
    pattern: /function\s+\w+\s*\(\s*\w[^)]*,\s*\w[^)]*,\s*\w[^)]*,\s*\w[^)]*,\s*\w[^)]*\)/,
    languages: ['JavaScript', 'TypeScript', 'Java', 'Python'],
  },
  {
    id: 'CQ-060',
    severity: 'warning',
    category: 'correctness',
    title: 'typeof Check Against Non-Standard Type',
    description:
      'Comparing typeof against a misspelled or incorrect type string always evaluates to false, causing silent logic errors.',
    suggestion: 'Check against valid typeof values: "undefined", "string", "number", "boolean", "object", "function", "symbol", "bigint"',
    pattern: /typeof\s+\w+\s*[!=]==?\s*['"](?!undefined|string|number|boolean|object|function|symbol|bigint)[^'"]+['"]/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-061',
    severity: 'warning',
    category: 'maintainability',
    title: 'TODO / FIXME Code Comment',
    description:
      'TODO and FIXME comments indicate incomplete or broken code that has been deferred. They accumulate into technical debt.',
    suggestion: 'Create a tracked issue instead of a TODO comment, then remove the comment',
    pattern: /\b(?:TODO|FIXME|HACK|XXX|TEMP|KLUDGE)\b/,
    languages: '*',
  },
  {
    id: 'CQ-062',
    severity: 'warning',
    category: 'error-handling',
    title: 'Promise Without .catch() Handler',
    description:
      'A promise chain ends without a .catch() handler. If the promise rejects, the error is silently dropped.',
    suggestion: 'Add .catch(err => { /* handle error */ }) at the end of promise chains',
    pattern: /\.then\s*\([^)]*\)\s*(?:;|\n(?!\s*\.catch))/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-063',
    severity: 'warning',
    category: 'correctness',
    title: 'Array Index Access Without Bounds Check',
    description:
      'Accessing array elements by hardcoded index without a length check can cause runtime errors when the array is shorter than expected.',
    suggestion: 'Check array.length before accessing by index, or use optional chaining: arr?.[index]',
    pattern: /\w+\[\d+\](?!\s*(?:!==?\s*(?:null|undefined|void)|===?\s*(?:null|undefined|void)|\?\.|\?\s*\.|\s*&&|\s*\|\|))/,
    languages: ['JavaScript', 'TypeScript'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO — Improvements for production readiness
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-064',
    severity: 'info',
    category: 'production-readiness',
    title: 'Hardcoded Timeout Value',
    description:
      'A hardcoded timeout value (e.g. setTimeout with a large number) should be extracted to a constant with a meaningful name.',
    suggestion: 'Extract timeout values to named constants: const REQUEST_TIMEOUT_MS = 30000',
    pattern: /setTimeout\s*\([^,]+,\s*\d{4,}\s*\)/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-065',
    severity: 'info',
    category: 'maintainability',
    title: 'Commented-Out Code Block',
    description:
      'Code that is commented out is dead code — it adds noise and may confuse future readers about intent.',
    suggestion: 'Delete commented-out code; it can be recovered from version history if needed',
    // Match lines starting with // followed by something that looks like code
    pattern: /^\s*\/\/\s*(?:const|let|var|function|return|if|for|while|class|import|export)\s+/m,
    languages: ['JavaScript', 'TypeScript', 'Java', 'Go', 'C#'],
  },
  {
    id: 'CQ-066',
    severity: 'info',
    category: 'production-readiness',
    title: 'Development localhost URL',
    description:
      'A localhost or 127.0.0.1 URL hardcoded in non-test code may cause failures in staging/production environments.',
    suggestion: 'Use environment variables for base URLs: process.env.API_URL',
    pattern: /['"`]https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/,
    languages: '*',
  },
  {
    id: 'CQ-067',
    severity: 'info',
    category: 'modernization',
    title: 'Callback-Style Error Handling (legacy pattern)',
    description:
      'The (err, result) callback convention is Node.js legacy. Async/await provides cleaner error handling and stack traces.',
    suggestion: 'Convert to async/await with try/catch for modern, readable error handling',
    pattern: /function\s*\([^)]*err(?:or)?\s*,\s*(?:result|data|res|callback)\s*\)/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-068',
    severity: 'info',
    category: 'correctness',
    title: 'Boolean Trap (boolean param without label)',
    description:
      'Passing raw true/false to a function hides the parameter intent. Boolean arguments in calls are hard to read.',
    suggestion: 'Use named parameters in an options object instead of positional booleans',
    pattern: /\w+\s*\([^)]*,\s*(?:true|false)\s*(?:,|\))/,
    languages: ['JavaScript', 'TypeScript'],
  },
];
