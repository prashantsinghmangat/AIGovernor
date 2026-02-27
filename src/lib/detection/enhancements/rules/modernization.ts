import type { EnhancementRule } from '../types';

/**
 * Modernization enhancement rules.
 *
 * These rules detect outdated language patterns, deprecated APIs, and legacy
 * library usage, then recommend modern replacements that improve readability,
 * performance, and long-term maintainability.
 *
 * Rules are grouped by impact level: HIGH → MEDIUM → LOW.
 */

// ---------------------------------------------------------------------------
// HIGH IMPACT
// ---------------------------------------------------------------------------

const highImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-001',
    category: 'modernization',
    impact: 'high',
    title: 'Replace var with const/let',
    description:
      'The var keyword has function-level scoping and is hoisted, which can lead to subtle bugs such as unintentional variable sharing inside loops and closures. Block-scoped declarations (const/let) introduced in ES2015 eliminate these issues and make intent clearer.',
    recommendation:
      'Replace var with const for values that are never reassigned, or let when reassignment is necessary. This improves readability and prevents accidental mutation.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
    pattern: /\bvar\s+\w+/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-002',
    category: 'modernization',
    impact: 'high',
    title: 'Replace require() with ES module import',
    description:
      'CommonJS require() is synchronous and does not support static analysis, preventing tree-shaking and other build-time optimizations. ES module import/export is the standard module system supported natively by modern runtimes and bundlers.',
    recommendation:
      'Convert require() calls to ES module import statements (e.g., import foo from "foo"). This enables tree-shaking, better IDE support, and aligns with the ECMAScript standard.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import',
    pattern: /\brequire\s*\(\s*['"]/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-007',
    category: 'modernization',
    impact: 'high',
    title: 'Replace Python 2 print statement with print()',
    description:
      'The bare print statement without parentheses is Python 2 syntax and will cause a SyntaxError in Python 3. Even in mixed-version code bases, using the function form ensures forward compatibility.',
    recommendation:
      'Use the print() function instead of the print statement (e.g., print("hello") instead of print "hello"). Add "from __future__ import print_function" if Python 2 support is still required.',
    link: 'https://docs.python.org/3/whatsnew/3.0.html#print-is-a-function',
    pattern: /^print\s+['"\w]/,
    languages: ['python'],
  },
];

// ---------------------------------------------------------------------------
// MEDIUM IMPACT
// ---------------------------------------------------------------------------

const mediumImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-003',
    category: 'modernization',
    impact: 'medium',
    title: 'Replace .then() chains with async/await',
    description:
      'Deeply nested .then() chains make asynchronous code harder to read, debug, and maintain. The async/await syntax, available since ES2017, provides a synchronous-looking control flow that simplifies error handling with try/catch.',
    recommendation:
      'Refactor .then()/.catch() chains into async functions using await. Wrap await calls in try/catch blocks for error handling. This produces flatter, more readable asynchronous code.',
    link: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises#async_and_await',
    pattern: /\.then\s*\(\s*(?:function|\(|async)/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-004',
    category: 'modernization',
    impact: 'medium',
    title: 'Replace moment.js with a modern date library',
    description:
      'Moment.js is in maintenance mode, is not tree-shakeable, and adds significant bundle weight (~300 kB minified). Modern alternatives are smaller, immutable by default, and offer better performance.',
    recommendation:
      'Migrate to date-fns for a modular, tree-shakeable approach, or use the native Intl API and the upcoming Temporal API for formatting and date arithmetic. This significantly reduces bundle size.',
    link: 'https://momentjs.com/docs/#/-project-status/',
    pattern: /(?:require\s*\(\s*['"]moment['"]\)|from\s+['"]moment['"])/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-006',
    category: 'modernization',
    impact: 'medium',
    title: 'Convert React class component to functional component',
    description:
      'React class components are more verbose and cannot leverage hooks, which are the recommended way to manage state, effects, and context in modern React. Functional components with hooks produce simpler, more composable code.',
    recommendation:
      'Rewrite the class component as a function component. Replace this.state/this.setState with useState, lifecycle methods with useEffect, and this.context with useContext.',
    link: 'https://react.dev/reference/react/Component#alternatives',
    pattern: /class\s+\w+\s+extends\s+(?:React\.)?(?:Component|PureComponent)/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-008',
    category: 'modernization',
    impact: 'medium',
    title: 'Replace %-formatting with f-strings',
    description:
      'The old % string formatting operator is less readable and more error-prone than modern alternatives. Python 3.6+ f-strings are faster at runtime, more concise, and allow inline expressions.',
    recommendation:
      'Replace "Hello %s" % name with f"Hello {name}". For complex expressions, f-strings support arbitrary Python expressions inside the braces, improving both readability and performance.',
    link: 'https://docs.python.org/3/reference/lexical_analysis.html#f-strings',
    pattern: /['"][^'"]*%[sd].*['"]\s*%\s*/,
    languages: ['python'],
  },
  {
    id: 'ENH-009',
    category: 'modernization',
    impact: 'medium',
    title: 'Replace os.path with pathlib.Path',
    description:
      'The os.path module uses string-based path manipulation, which is error-prone and platform-dependent. The pathlib module (Python 3.4+) provides an object-oriented interface that is more readable and handles cross-platform paths correctly.',
    recommendation:
      'Replace os.path calls with pathlib.Path methods (e.g., Path(dir) / "file.txt" instead of os.path.join(dir, "file.txt")). Most standard library functions now accept Path objects directly.',
    link: 'https://docs.python.org/3/library/pathlib.html',
    pattern: /\bos\.path\.\w+/,
    languages: ['python'],
  },
  {
    id: 'ENH-011',
    category: 'modernization',
    impact: 'medium',
    title: 'Replace XMLHttpRequest with fetch API',
    description:
      'XMLHttpRequest is a legacy API with a verbose, callback-based interface. The Fetch API, available in all modern browsers and Node.js 18+, offers a cleaner promise-based interface with better streaming and error handling support.',
    recommendation:
      'Replace new XMLHttpRequest() with fetch(). Use the Response methods (.json(), .text(), .blob()) for parsing and AbortController for request cancellation.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
    pattern: /new\s+XMLHttpRequest/,
    languages: '*',
  },
];

// ---------------------------------------------------------------------------
// LOW IMPACT
// ---------------------------------------------------------------------------

const lowImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-005',
    category: 'modernization',
    impact: 'low',
    title: 'Replace lodash with native Array/Object methods',
    description:
      'Importing the full lodash library adds unnecessary bundle weight when many of its utility functions (map, filter, reduce, assign, keys, values) have native equivalents in modern JavaScript. Tree-shaking the full lodash package is not straightforward.',
    recommendation:
      'Replace lodash calls with native methods where possible (e.g., Array.prototype.map, Object.keys, Object.assign, structuredClone). If specific lodash utilities are still needed, import them individually from lodash-es or lodash/methodName.',
    link: 'https://youmightnotneed.com/lodash',
    pattern: /(?:require\s*\(\s*['"]lodash['"]\)|from\s+['"]lodash['"])/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-010',
    category: 'modernization',
    impact: 'low',
    title: 'Use try-with-resources for automatic resource management',
    description:
      'Manually managing resources such as streams, connections, and readers is error-prone — resources may leak if an exception occurs before the close() call. Java 7+ try-with-resources automatically closes AutoCloseable resources, even when exceptions are thrown.',
    recommendation:
      'Wrap resource creation in a try-with-resources block (e.g., try (var reader = new BufferedReader(...)) { ... }). This guarantees cleanup and reduces boilerplate.',
    link: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html',
    pattern: /\b(?:FileInputStream|FileOutputStream|BufferedReader|Connection)\b.*=\s*new\b/,
    languages: ['java'],
  },
  {
    id: 'ENH-012',
    category: 'modernization',
    impact: 'low',
    title: 'Replace arguments keyword with rest parameters',
    description:
      'The arguments object is not a real Array, does not work in arrow functions, and obscures the intended function signature. Rest parameters (...args) produce a true Array and make the function signature self-documenting.',
    recommendation:
      'Replace usage of arguments[i] with a rest parameter (e.g., function foo(...args) { }). This provides a real Array with full access to array methods and works consistently in all function types.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters',
    pattern: /\barguments\s*\[/,
    languages: ['javascript', 'typescript'],
  },
];

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export const MODERNIZATION_RULES: EnhancementRule[] = [
  ...highImpactRules,
  ...mediumImpactRules,
  ...lowImpactRules,
];
