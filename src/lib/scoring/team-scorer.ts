export function calculateTeamMemberScore(
  aiPRs: number,
  totalPRs: number,
  reviewedByThisPerson: number,
  aiPRsWithWeakReview: number,
): {
  ai_usage_level: 'high' | 'medium' | 'low';
  review_quality: 'strong' | 'moderate' | 'weak';
  risk_index: 'high' | 'medium' | 'low';
  governance_score: number;
} {
  const aiRatio = totalPRs > 0 ? aiPRs / totalPRs : 0;
  const ai_usage_level = aiRatio > 0.6 ? 'high' : aiRatio > 0.3 ? 'medium' : 'low';

  const reviewRatio = totalPRs > 0 ? reviewedByThisPerson / totalPRs : 0;
  const review_quality = reviewRatio > 0.5 ? 'strong' : reviewRatio > 0.25 ? 'moderate' : 'weak';

  const weakRatio = aiPRs > 0 ? aiPRsWithWeakReview / aiPRs : 0;
  const risk_index = weakRatio > 0.5 ? 'high' : weakRatio > 0.25 ? 'medium' : 'low';

  const governance_score = Math.min(100, Math.round(
    (1 - weakRatio) * 50 +
    reviewRatio * 30 +
    (1 - aiRatio * 0.3) * 20
  ));

  return { ai_usage_level, review_quality, risk_index, governance_score };
}
