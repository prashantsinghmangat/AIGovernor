/**
 * Java & Kotlin specific code quality rules.
 *
 * Covers: System.out usage, raw types, instanceof chains, @SuppressWarnings,
 * field injection, catching NullPointerException, string concatenation with +=,
 * and magic string comparisons.
 */
import type { CodeQualityRule } from '../types';

export const JAVA_QUALITY_RULES: CodeQualityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-065',
    severity: 'error',
    category: 'error-handling',
    title: 'Catching NullPointerException',
    description:
      'Catching NullPointerException is almost always a code smell. It masks the root cause and makes the real bug harder to find.',
    suggestion: 'Add null checks instead of catching NPE',
    pattern: /catch\s*\(\s*NullPointerException/,
    languages: ['Java', 'Kotlin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-060',
    severity: 'warning',
    category: 'production-readiness',
    title: 'System.out/err Print Statement',
    description:
      'System.out and System.err bypass logging frameworks, lack log levels and formatting, and cannot be configured at runtime.',
    suggestion: 'Use SLF4J or Log4j2 logging framework',
    pattern: /System\.\s*(?:out|err)\.\s*print/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'CQ-061',
    severity: 'warning',
    category: 'type-safety',
    title: 'Raw Type Usage (Missing Generics)',
    description:
      'Using raw types like ArrayList or HashMap without type parameters disables compile-time type checking and can cause ClassCastExceptions at runtime.',
    suggestion: 'Use parameterized types (generics)',
    pattern: /new\s+(?:ArrayList|HashMap|HashSet|LinkedList|TreeMap|TreeSet|LinkedHashMap|LinkedHashSet|Vector|Hashtable)\s*\(\s*\)(?!\s*;?\s*\/\/\s*diamond)/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'CQ-062',
    severity: 'warning',
    category: 'design',
    title: 'instanceof Check',
    description:
      'Chains of instanceof checks often indicate a missing polymorphic design. They become a maintenance burden as new types are added.',
    suggestion: 'Consider using polymorphism or pattern matching',
    pattern: /instanceof\s+\w+/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'CQ-064',
    severity: 'warning',
    category: 'design',
    title: 'Field Injection (@Autowired on Field)',
    description:
      'Field injection via @Autowired hides dependencies, makes testing harder, and prevents the class from being used outside the DI container.',
    suggestion: 'Use constructor injection instead of field injection',
    pattern: /@Autowired\s*$/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'CQ-066',
    severity: 'warning',
    category: 'performance',
    title: 'String Concatenation with +=',
    description:
      'Using += to concatenate strings in a loop creates a new String object on each iteration, resulting in O(n^2) performance.',
    suggestion: 'Use StringBuilder for string concatenation in loops',
    pattern: /\+=\s*["']/,
    languages: ['Java', 'Kotlin'],
  },
  {
    id: 'CQ-067',
    severity: 'warning',
    category: 'maintainability',
    title: 'Magic String in .equals() Comparison',
    description:
      'Comparing against inline string literals scattered throughout the code makes refactoring error-prone and typos hard to catch.',
    suggestion: 'Extract string literals to constants',
    pattern: /\.equals\s*\(\s*"/,
    languages: ['Java', 'Kotlin'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'CQ-063',
    severity: 'info',
    category: 'maintainability',
    title: '@SuppressWarnings Usage',
    description:
      'Suppressing compiler warnings hides potential issues. The underlying warning should be investigated and properly resolved.',
    suggestion: 'Fix the underlying warning instead of suppressing',
    pattern: /@SuppressWarnings/,
    languages: ['Java', 'Kotlin'],
  },
];
