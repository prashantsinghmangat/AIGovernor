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

const WEIGHTS = {
  ai_loc_ratio: 0.30,
  review_coverage: 0.30,
  refactor_backlog_growth: 0.20,
  prompt_inconsistency: 0.20,
};

export function calculateAIDebtScore(input: DebtScoreInput): DebtScoreResult {
  const penalty =
    WEIGHTS.ai_loc_ratio * input.ai_loc_ratio * 100 +
    WEIGHTS.review_coverage * (1 - input.review_coverage) * 100 +
    WEIGHTS.refactor_backlog_growth * input.refactor_backlog_growth * 100 +
    WEIGHTS.prompt_inconsistency * input.prompt_inconsistency * 100;

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    risk_zone: score >= 80 ? 'healthy' : score >= 60 ? 'caution' : 'critical',
    breakdown: { ...input, weights: WEIGHTS },
  };
}
