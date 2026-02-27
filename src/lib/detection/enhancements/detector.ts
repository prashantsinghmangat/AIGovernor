/**
 * Enhancement suggestion detector.
 *
 * Runs pattern-based rules to surface forward-looking suggestions:
 * modernization, performance, security hardening, and framework best practices.
 */

import type { EnhancementResult, EnhancementRule, EnhancementSuggestion } from './types';
import { MODERNIZATION_RULES } from './rules/modernization';
import { PERFORMANCE_RULES } from './rules/performance';
import { SECURITY_HARDENING_RULES } from './rules/security-hardening';
import { FRAMEWORK_RULES } from './rules/framework';

// ---------------------------------------------------------------------------
// All enhancement rules
// ---------------------------------------------------------------------------

const ALL_ENHANCEMENT_RULES: EnhancementRule[] = [
  ...MODERNIZATION_RULES,
  ...PERFORMANCE_RULES,
  ...SECURITY_HARDENING_RULES,
  ...FRAMEWORK_RULES,
];

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

export function detectEnhancements(
  code: string,
  language: string,
): EnhancementResult {
  const suggestions: EnhancementSuggestion[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    for (const rule of ALL_ENHANCEMENT_RULES) {
      // Language filter
      if (rule.languages !== '*' && !rule.languages.includes(language)) continue;

      const match = line.match(rule.pattern);
      if (match) {
        suggestions.push({
          id: rule.id,
          category: rule.category,
          impact: rule.impact,
          title: rule.title,
          description: rule.description,
          recommendation: rule.recommendation,
          link: rule.link,
          line: i + 1,
          matchedText: match[0].substring(0, 80),
        });
      }
    }
  }

  const highImpact = suggestions.filter((s) => s.impact === 'high').length;
  const mediumImpact = suggestions.filter((s) => s.impact === 'medium').length;
  const lowImpact = suggestions.filter((s) => s.impact === 'low').length;

  return {
    total_suggestions: suggestions.length,
    high_impact: highImpact,
    medium_impact: mediumImpact,
    low_impact: lowImpact,
    suggestions,
    scanned: true,
  };
}
