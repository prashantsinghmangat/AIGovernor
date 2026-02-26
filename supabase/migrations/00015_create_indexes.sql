CREATE INDEX idx_scan_results_company_risk
  ON public.scan_results(company_id, risk_level, ai_probability DESC);

CREATE INDEX idx_prs_company_time
  ON public.pull_requests(company_id, pr_merged_at DESC)
  WHERE state = 'merged';

CREATE INDEX idx_debt_scores_company_latest
  ON public.ai_debt_scores(company_id, repository_id, calculated_at DESC);

CREATE INDEX idx_alerts_company_active_time
  ON public.alerts(company_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX idx_alerts_search
  ON public.alerts USING gin(to_tsvector('english', title || ' ' || description));
