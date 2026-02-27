/**
 * Rule registry — aggregates all per-language rule files into a single array.
 *
 * Import `ALL_RULES` in the vulnerability detector instead of maintaining
 * a monolithic rules list.
 */
import type { VulnerabilityRule } from '../vulnerability-detector';

import { COMMON_RULES } from './common-rules';
import { JS_TS_RULES } from './js-ts-rules';
import { PYTHON_RULES } from './python-rules';
import { JAVA_RULES } from './java-rules';
import { GO_RULES } from './go-rules';
import { SQL_RULES } from './sql-rules';
import { PHP_RULES } from './php-rules';
import { CSHARP_RULES } from './csharp-rules';
import { FRAMEWORK_RULES } from './framework-rules';

export const ALL_RULES: VulnerabilityRule[] = [
  ...COMMON_RULES,
  ...JS_TS_RULES,
  ...PYTHON_RULES,
  ...JAVA_RULES,
  ...GO_RULES,
  ...SQL_RULES,
  ...PHP_RULES,
  ...CSHARP_RULES,
  ...FRAMEWORK_RULES,
];

// Validate no duplicate IDs at module load time (dev safety net)
if (process.env.NODE_ENV === 'development') {
  const ids = new Set<string>();
  for (const rule of ALL_RULES) {
    if (ids.has(rule.id)) {
      console.warn(`[VulnRegistry] Duplicate rule ID: ${rule.id}`);
    }
    ids.add(rule.id);
  }
}
