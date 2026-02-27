/**
 * Performance enhancement rules (ENH-020 through ENH-029).
 *
 * Detects common performance anti-patterns such as N+1 queries,
 * synchronous I/O in async contexts, unnecessary object copies, and
 * un-cached expensive operations.
 */

import type { EnhancementRule } from '../types';

// ===========================================================================
// HIGH IMPACT
// ===========================================================================

const highImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-020',
    category: 'performance',
    impact: 'high',
    title: 'Potential N+1 query pattern detected',
    description:
      'Django ORM calls such as .objects.get(), .objects.filter(), or .objects.all() ' +
      'can trigger an N+1 query problem when executed inside a loop. Each iteration ' +
      'issues a separate database round-trip, leading to latency that scales linearly ' +
      'with the number of records.',
    recommendation:
      'Use select_related() or prefetch_related() to eagerly load related objects in a ' +
      'single query. Alternatively, fetch all required records before the loop with a ' +
      'bulk query and index them in a dictionary for O(1) lookups.',
    link: 'https://docs.djangoproject.com/en/stable/ref/models/querysets/#prefetch-related',
    pattern: /\.objects\.(?:get|filter|all)\s*\(/,
    languages: ['Python'],
  },
  {
    id: 'ENH-021',
    category: 'performance',
    impact: 'high',
    title: 'Synchronous file I/O used in potentially async context',
    description:
      'Synchronous fs methods (readFileSync, writeFileSync, appendFileSync, mkdirSync, ' +
      'readdirSync) block the Node.js event loop until the operation completes. In ' +
      'server-side request handlers or async workflows this stalls all concurrent ' +
      'connections, severely degrading throughput under load.',
    recommendation:
      'Replace synchronous calls with their async counterparts (fs.promises.readFile, ' +
      'fs.promises.writeFile, etc.) and await the result. If top-level synchronous ' +
      'initialization is truly required, add an explanatory comment to suppress this ' +
      'warning.',
    link: 'https://nodejs.org/api/fs.html#promise-example',
    pattern: /\bfs\.(?:readFileSync|writeFileSync|appendFileSync|mkdirSync|readdirSync)\b/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'ENH-026',
    category: 'performance',
    impact: 'high',
    title: 'Regex compiled inside potential hot path',
    description:
      'Creating a RegExp object with `new RegExp(...)` inside a loop or frequently ' +
      'called function compiles the expression on every invocation. Regular expression ' +
      'compilation is expensive and the result should be reused when the pattern does ' +
      'not change between calls.',
    recommendation:
      'Move the RegExp instantiation to module scope or a one-time initialization block ' +
      'so the compiled pattern is reused. If the pattern truly varies at runtime, ' +
      'consider caching compiled expressions in a Map keyed by the pattern string.',
    pattern: /new\s+RegExp\s*\(/,
    languages: '*',
  },
];

// ===========================================================================
// MEDIUM IMPACT
// ===========================================================================

const mediumImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-022',
    category: 'performance',
    impact: 'medium',
    title: 'String concatenation with += in loop',
    description:
      'Concatenating strings with the += operator inside a loop creates a new String ' +
      'object on every iteration. In Java and Kotlin, strings are immutable so each ' +
      'concatenation copies the entire accumulated string, resulting in O(n\u00B2) time ' +
      'complexity for n iterations.',
    recommendation:
      'Use StringBuilder (Java) or buildString {} (Kotlin) to accumulate text ' +
      'efficiently. StringBuilder appends in amortized O(1) per operation, reducing ' +
      'overall complexity to O(n).',
    link: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html',
    pattern: /\w+\s*\+=\s*["']/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'ENH-023',
    category: 'performance',
    impact: 'medium',
    title: 'Array transformation may benefit from memoization',
    description:
      'Inline .map(), .filter(), or .reduce() calls recompute on every render in React ' +
      'components. When the source array is large or the transformation is expensive, ' +
      'this causes unnecessary CPU work and can trigger cascading re-renders of child ' +
      'components that receive the new array reference.',
    recommendation:
      'Wrap the transformation in useMemo() with appropriate dependencies so the derived ' +
      'array is only recalculated when its inputs change. For components that receive ' +
      'transformed data as props, consider wrapping the child in React.memo().',
    link: 'https://react.dev/reference/react/useMemo',
    pattern: /(?:\.map|\.filter|\.reduce)\s*\(\s*\w/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'ENH-024',
    category: 'performance',
    impact: 'medium',
    title: 'Unbounded collection growth detected',
    description:
      'Appending to an array or list (push, append, add) without a size guard can cause ' +
      'unbounded memory growth. In long-running processes such as servers or workers, ' +
      'this eventually leads to out-of-memory crashes or excessive garbage collection ' +
      'pauses.',
    recommendation:
      'Enforce a maximum size with a check before appending, use a ring buffer or fixed- ' +
      'capacity data structure, or periodically flush/persist the collected items. For ' +
      'logging, consider streaming writes instead of in-memory accumulation.',
    pattern: /\.(?:push|append|add)\s*\(/,
    languages: '*',
  },
  {
    id: 'ENH-025',
    category: 'performance',
    impact: 'medium',
    title: 'Deep clone via JSON round-trip',
    description:
      'Using JSON.parse(JSON.stringify(...)) to deep-clone objects is significantly ' +
      'slower than purpose-built alternatives. It also silently drops undefined values, ' +
      'functions, Symbols, Dates (converted to strings), and any non-JSON-serializable ' +
      'data, leading to subtle bugs.',
    recommendation:
      'Use the built-in structuredClone() (available in Node 17+ and all modern ' +
      'browsers) for a correct and faster deep clone. For shallow copies, spread syntax ' +
      'or Object.assign() are sufficient.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/API/structuredClone',
    pattern: /JSON\.parse\s*\(\s*JSON\.stringify\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    id: 'ENH-029',
    category: 'performance',
    impact: 'medium',
    title: 'DOM query inside potential loop or hot path',
    description:
      'Calls to document.querySelector() or document.querySelectorAll() trigger DOM ' +
      'traversal each time they execute. When placed inside loops, event handlers that ' +
      'fire rapidly (scroll, mousemove), or animation frames, repeated DOM queries ' +
      'become a significant performance bottleneck.',
    recommendation:
      'Cache the query result in a variable outside the loop or at the top of the ' +
      'function scope. For elements that change dynamically, use MutationObserver or ' +
      'event delegation instead of repeated queries.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector',
    pattern: /document\.querySelector(?:All)?\s*\(/,
    languages: ['JavaScript', 'TypeScript'],
  },
];

// ===========================================================================
// LOW IMPACT
// ===========================================================================

const lowImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-027',
    category: 'performance',
    impact: 'low',
    title: 'Blocking sleep in request handler',
    description:
      'time.sleep() blocks the current thread entirely. In synchronous web frameworks ' +
      '(Flask, Django) this ties up a worker thread/process for the duration of the ' +
      'sleep, reducing the server\'s capacity to handle concurrent requests.',
    recommendation:
      'In async frameworks (FastAPI, aiohttp) use `await asyncio.sleep()`. For ' +
      'synchronous frameworks, offload long waits to a background task queue (Celery, ' +
      'RQ) so the worker can serve other requests immediately.',
    pattern: /\btime\.sleep\s*\(/,
    languages: ['Python'],
  },
  {
    id: 'ENH-028',
    category: 'performance',
    impact: 'low',
    title: 'String concatenation with += in Go',
    description:
      'Go strings are immutable. Using += to build a string in a loop allocates a new ' +
      'backing array and copies all previously accumulated bytes on every iteration, ' +
      'resulting in O(n\u00B2) time and memory usage for n concatenations.',
    recommendation:
      'Use strings.Builder for efficient string assembly. Call builder.WriteString() in ' +
      'the loop and builder.String() when done. For joining a slice of strings, ' +
      'strings.Join() is also efficient.',
    link: 'https://pkg.go.dev/strings#Builder',
    pattern: /\w+\s*\+=\s*"/,
    languages: ['Go'],
  },
];

// ===========================================================================
// Export
// ===========================================================================

export const PERFORMANCE_RULES: EnhancementRule[] = [
  ...highImpactRules,
  ...mediumImpactRules,
  ...lowImpactRules,
];
