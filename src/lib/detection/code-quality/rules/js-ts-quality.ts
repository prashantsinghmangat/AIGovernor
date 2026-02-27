/**
 * JavaScript & TypeScript specific code quality rules.
 *
 * Covers: var usage, any types, callback chains, loose equality, require(),
 * nested callbacks, browser dialogs, direct DOM manipulation, and
 * console.error patterns.
 */
import type { CodeQualityRule } from '../types';

export const JS_TS_QUALITY_RULES: CodeQualityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-020',
    severity: 'error',
    category: 'modernization',
    title: 'var Usage',
    description:
      'var has function-level scoping and hoisting behavior that leads to subtle bugs. It has been superseded by const and let.',
    suggestion: 'Use const or let instead of var',
    pattern: /\bvar\s+\w/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-023',
    severity: 'error',
    category: 'correctness',
    title: 'Loose Equality (== instead of ===)',
    description:
      'The == operator performs type coercion, which can cause unexpected truthy/falsy comparisons and hard-to-find bugs.',
    suggestion: 'Use strict equality (===) to avoid type coercion',
    pattern: /[^!=!><]==[^=]/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-027',
    severity: 'error',
    category: 'production-readiness',
    title: 'Browser Dialog (alert/confirm/prompt)',
    description:
      'Browser dialog functions block the main thread and provide a poor user experience. They should never appear in production code.',
    suggestion: 'Use a toast notification or modal component instead',
    pattern: /\b(?:alert|confirm|prompt)\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-021',
    severity: 'warning',
    category: 'type-safety',
    title: 'any Type Annotation',
    description:
      'Using the any type defeats the purpose of TypeScript by opting out of type checking. It propagates unsafety throughout the codebase.',
    suggestion: 'Use a specific type or unknown',
    pattern: /(?::\s*any\b|as\s+any\b|<any>)/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-022',
    severity: 'warning',
    category: 'readability',
    title: '.then() Callback Chain',
    description:
      'Chaining multiple .then() callbacks creates deeply nested code that is harder to read and debug than async/await.',
    suggestion: 'Use async/await instead',
    pattern: /\.then\s*\([^)]*\)\s*\.then/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-024',
    severity: 'warning',
    category: 'correctness',
    title: 'Unhandled Promise (Missing await)',
    description:
      'Calling Promise.all, Promise.allSettled, Promise.race, or Promise.any without await means errors are silently dropped.',
    suggestion: 'Add await or handle the returned Promise',
    pattern: /(?<!await\s)Promise\.(?:all|allSettled|race|any)\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-026',
    severity: 'warning',
    category: 'readability',
    title: 'Deeply Nested Callback',
    description:
      'Passing function expressions as trailing arguments to other callbacks creates "callback hell" that is hard to follow.',
    suggestion: 'Refactor to async/await or extract named functions',
    pattern: /\}\s*,\s*function\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-028',
    severity: 'warning',
    category: 'framework-mismatch',
    title: 'Direct DOM Manipulation',
    description:
      'Directly accessing the DOM via getElementById or querySelector bypasses the virtual DOM in React/Vue and can cause subtle bugs.',
    suggestion: 'Use refs or framework-provided DOM access patterns',
    pattern: /document\.(?:getElementById|querySelector|getElementsBy)\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-025',
    severity: 'info',
    category: 'modernization',
    title: 'CommonJS require() Usage',
    description:
      'require() is the CommonJS module system. ES module imports provide static analysis, tree-shaking, and better tooling support.',
    suggestion: 'Use ES module imports instead of require()',
    pattern: /\brequire\s*\(\s*['"`]/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'CQ-029',
    severity: 'info',
    category: 'error-handling',
    title: 'console.error Without Context Message',
    description:
      'Passing only the error object to console.error lacks context about where and why the error occurred, making debugging harder.',
    suggestion: 'Add a descriptive message before the error object',
    pattern: /console\.error\s*\(\s*(?:err|error|e)\s*\)/,
    languages: ['JavaScript', 'TypeScript'],
  },
];
