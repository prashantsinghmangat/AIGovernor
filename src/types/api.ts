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
    description?: string;
    repository_id?: string | null;
    repository_name?: string | null;
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

// GitHub connection status
export interface GitHubStatusData {
  connected: boolean;
  github_username: string | null;
}

// Enriched repository for list view (includes latest score/scan data)
export interface RepositoryWithStats {
  id: string;
  company_id: string;
  github_id: number | null;
  name: string;
  full_name: string;
  source?: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  is_private: boolean;
  is_active: boolean;
  last_scan_at: string | null;
  last_scan_status: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  // Enriched from joins
  debt_score: number | null;
  risk_zone: string | null;
  latest_scan_at: string | null;
  latest_scan_status: string | null;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  } | null;
}

// Full repository detail response
export interface RepositoryDetail {
  repository: {
    id: string;
    company_id: string;
    github_id: number | null;
    name: string;
    full_name: string;
    description: string | null;
    default_branch: string;
    language: string | null;
    is_private: boolean;
    is_active: boolean;
    source?: string;
    last_scan_at: string | null;
    last_scan_status: string | null;
    created_at: string;
    updated_at: string;
  };
  latest_score: {
    score: number;
    risk_zone: string;
    breakdown: Record<string, number>;
    calculated_at: string;
  } | null;
  latest_scan: {
    id: string;
    status: string;
    summary: Record<string, unknown> | null;
    completed_at: string | null;
  } | null;
  scan_history: Array<{
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    summary: Record<string, unknown> | null;
    commit_sha: string | null;
  }>;
  score_trend: Array<{
    date: string;
    score: number;
    risk_zone: string;
  }>;
  stats: {
    files_scanned: number;
    ai_files_detected: number;
    active_alerts: number;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      total: number;
    } | null;
    code_quality: {
      worst_grade: string;
      total_errors: number;
      total_warnings: number;
      total_infos: number;
      total_findings: number;
    } | null;
    enhancements: {
      high_impact: number;
      medium_impact: number;
      low_impact: number;
      total_suggestions: number;
    } | null;
  };
}

// GitHub repo shape from /api/github/repos
export interface GitHubRepoItem {
  github_id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language: string | null;
  is_private: boolean;
}
