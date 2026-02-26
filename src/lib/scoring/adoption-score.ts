export interface AdoptionMetrics {
  totalTeamMembers: number;
  membersUsingAI: number;
  averageGovernanceScore: number;
  reviewCoverage: number;
}

export function calculateAdoptionScore(metrics: AdoptionMetrics): number {
  const adoptionRate = metrics.totalTeamMembers > 0
    ? metrics.membersUsingAI / metrics.totalTeamMembers
    : 0;

  const score = Math.round(
    adoptionRate * 30 +
    (metrics.averageGovernanceScore / 100) * 40 +
    metrics.reviewCoverage * 30
  );

  return Math.min(100, Math.max(0, score));
}
