/**
 * Types for the enhancement suggestions module.
 */

export type EnhancementImpact = 'high' | 'medium' | 'low';

export interface EnhancementSuggestion {
  id: string;
  category: string;
  impact: EnhancementImpact;
  title: string;
  description: string;
  recommendation: string;
  link?: string;
  line?: number;
  matchedText?: string;
}

export interface EnhancementResult {
  total_suggestions: number;
  high_impact: number;
  medium_impact: number;
  low_impact: number;
  suggestions: EnhancementSuggestion[];
  scanned: boolean;
}

export interface EnhancementRule {
  id: string;
  category: string;
  impact: EnhancementImpact;
  title: string;
  description: string;
  recommendation: string;
  link?: string;
  pattern: RegExp;
  languages: string[] | '*';
}
