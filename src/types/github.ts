export interface GitHubRepo {
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  is_private: boolean;
  metadata: { stars: number; forks: number; size: number; updated_at: string };
}

export interface FileResult {
  file_path: string;
  language: string;
  total_loc: number;
  ai_loc: number;
  ai_probability: number;
  risk_level: 'high' | 'medium' | 'low';
  detection_signals: DetectionResult;
  ai_code_snippet?: string;
  snippet_start_line?: number;
  snippet_end_line?: number;
}

export interface PRResult {
  github_pr_number: number;
  github_pr_id: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  ai_generated: boolean;
  ai_probability: number;
  human_reviewed: boolean;
  review_count: number;
  total_loc_added: number;
  ai_loc_added: number;
  files_changed: number;
  pr_created_at: string;
  pr_merged_at: string | null;
}

export interface ScanSummary {
  total_commits: number;
  total_prs: number;
  total_files_scanned: number;
  total_loc: number;
  ai_loc: number;
  ai_loc_percentage: number;
  ai_prs_detected: number;
  reviewed_ai_prs: number;
  unreviewed_ai_merges: number;
  high_risk_files: number;
  medium_risk_files: number;
  low_risk_files: number;
  file_results: FileResult[];
  pr_results: PRResult[];
  scan_duration_seconds: number;
}

export interface DetectionResult {
  combined_probability: number;
  risk_level: 'high' | 'medium' | 'low';
  metadata: MetadataResult;
  style: StyleResult;
  ml: MLResult | null;
  detection_method: string;
}

export interface MetadataResult {
  matched: boolean;
  confidence: number;
  source: string | null;
  matchedText: string | null;
}

export interface StyleSignals {
  naming_verbosity: number;
  comment_uniformity: number;
  typo_absence: number;
  indent_consistency: number;
  error_handling_ratio: number;
  boilerplate_ratio: number;
  docstring_formality: number;
  import_organization: number;
}

export interface StyleResult {
  score: number;
  signals: StyleSignals;
}

export interface MLResult {
  probability: number;
  model_version: string;
  features_used: string[];
}
