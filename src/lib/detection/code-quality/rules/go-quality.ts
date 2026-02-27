import type { CodeQualityRule } from '../types';

/**
 * Go-specific code quality rules.
 *
 * Rule IDs: CQ-080 through CQ-087
 */
export const GO_QUALITY_RULES: CodeQualityRule[] = [
  {
    id: 'CQ-080',
    severity: 'error',
    category: 'error-handling',
    title: 'Ignored error return value',
    description:
      'Assigning an error return value to the blank identifier discards potentially critical error information.',
    suggestion: 'Always check and handle error return values',
    pattern: /\b_\s*=\s*\w+\.?\w*\s*\(/,
    languages: ['go'],
  },
  {
    id: 'CQ-081',
    severity: 'warning',
    category: 'code-smell',
    title: 'init() function with side effects',
    description:
      'init() functions run automatically at package load time, making dependencies implicit and testing harder.',
    suggestion: 'Minimize init() usage; prefer explicit initialization',
    pattern: /\bfunc\s+init\s*\(\s*\)/,
    languages: ['go'],
  },
  {
    id: 'CQ-082',
    severity: 'error',
    category: 'error-handling',
    title: 'panic() in library code',
    description:
      'Using panic() in library code forces callers to recover or crash, violating Go error-handling conventions.',
    suggestion: 'Return errors instead of panicking in library code',
    pattern: /\bpanic\s*\(/,
    languages: ['go'],
  },
  {
    id: 'CQ-083',
    severity: 'warning',
    category: 'type-safety',
    title: 'interface{} / any overuse',
    description:
      'Using the empty interface (interface{}) erases type information, reducing compile-time safety.',
    suggestion: 'Use specific interfaces or type constraints',
    pattern: /\binterface\s*\{\s*\}/,
    languages: ['go'],
  },
  {
    id: 'CQ-084',
    severity: 'warning',
    category: 'concurrency',
    title: 'Goroutine without synchronization',
    description:
      'Launching a goroutine with an anonymous function without visible synchronization can lead to races or leaks.',
    suggestion:
      'Ensure goroutines are properly synchronized (WaitGroup, channels, context)',
    pattern: /\bgo\s+func\s*\(/,
    languages: ['go'],
  },
  {
    id: 'CQ-085',
    severity: 'info',
    category: 'performance',
    title: 'fmt.Sprintf for simple concatenation',
    description:
      'Using fmt.Sprintf with only %s verbs is slower than plain string concatenation or strings.Builder.',
    suggestion:
      'Use string concatenation or strings.Builder for simple cases',
    pattern: /fmt\.Sprintf\s*\(\s*"%s/,
    languages: ['go'],
  },
  {
    id: 'CQ-086',
    severity: 'warning',
    category: 'readability',
    title: 'Naked return in function with named results',
    description:
      'Bare return statements in functions with named return values reduce readability and can introduce subtle bugs.',
    suggestion: 'Use explicit return values for clarity',
    pattern: /\breturn\s*$/,
    languages: ['go'],
  },
  {
    id: 'CQ-087',
    severity: 'info',
    category: 'resource-management',
    title: 'Defer Close may leak in loop',
    description:
      'Deferring Close() on a resource opened inside a loop delays cleanup until the function exits, potentially leaking resources.',
    suggestion: 'Verify defer in loops does not leak resources',
    pattern: /\bdefer\s+\w+\.Close\s*\(\s*\)/,
    languages: ['go'],
  },
];
