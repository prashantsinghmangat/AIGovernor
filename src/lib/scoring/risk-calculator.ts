export function getRiskLevel(probability: number): 'high' | 'medium' | 'low' {
  return probability >= 0.7 ? 'high' : probability >= 0.4 ? 'medium' : 'low';
}

export function getRiskZone(score: number): 'healthy' | 'caution' | 'critical' {
  return score >= 80 ? 'healthy' : score >= 60 ? 'caution' : 'critical';
}

export function getRiskColor(zone: string): string {
  switch (zone) {
    case 'healthy':
    case 'low':
    case 'strong':
      return '#22c55e';
    case 'caution':
    case 'medium':
    case 'moderate':
      return '#f59e0b';
    case 'critical':
    case 'high':
    case 'weak':
      return '#ef4444';
    default:
      return '#8892b0';
  }
}
