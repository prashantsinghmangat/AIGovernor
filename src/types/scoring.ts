export interface DebtScoreInput {
  ai_loc_ratio: number;
  review_coverage: number;
  refactor_backlog_growth: number;
  prompt_inconsistency: number;
}

export interface DebtScoreResult {
  score: number;
  risk_zone: 'healthy' | 'caution' | 'critical';
  breakdown: DebtScoreInput & { weights: Record<string, number> };
}

export interface TeamMemberScore {
  ai_usage_level: 'high' | 'medium' | 'low';
  review_quality: 'strong' | 'moderate' | 'weak';
  risk_index: 'high' | 'medium' | 'low';
  governance_score: number;
}
