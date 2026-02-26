export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SCAN_IN_PROGRESS'
  | 'PLAN_LIMIT'
  | 'GITHUB_ERROR'
  | 'INTERNAL_ERROR';

export interface DashboardData {
  debt_score: {
    score: number;
    risk_zone: string;
    change: number;
    trend: Array<{ month: string; score: number }>;
  };
  metrics: {
    ai_loc_percentage: number;
    ai_loc_change: string;
    review_coverage: number;
    review_change: string;
    unreviewed_merges: number;
    unreviewed_change: string;
    refactor_backlog_growth: number;
  };
  ai_usage_trend: Array<{ week: string; ai_loc: number; human_loc: number }>;
  repo_risk: Array<{
    repo: string;
    risk_score: number;
    risk_level: string;
    ai_loc: number;
    review_coverage: number;
  }>;
  recent_alerts: Array<{
    id: string;
    severity: string;
    title: string;
    time: string;
  }>;
  last_scan: string;
  repos_monitored: number;
}

export interface ScoreData {
  current_score: {
    score: number;
    risk_zone: 'healthy' | 'caution' | 'critical';
    change: number;
    breakdown: {
      ai_loc_ratio: number;
      review_coverage: number;
      refactor_backlog_growth: number;
      prompt_inconsistency: number;
    };
  };
  trend: Array<{ date: string; score: number; risk_zone: string }>;
  by_repository: Array<{
    repository_id: string;
    repository_name: string;
    score: number;
    risk_zone: string;
    ai_loc_percentage: number;
    review_coverage: number;
  }>;
}
