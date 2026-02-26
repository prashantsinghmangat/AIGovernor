CREATE MATERIALIZED VIEW public.mv_company_dashboard AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.plan,
  COUNT(DISTINCT r.id) AS repo_count,
  (SELECT score FROM public.ai_debt_scores
   WHERE company_id = c.id AND repository_id IS NULL
   ORDER BY calculated_at DESC LIMIT 1) AS debt_score,
  COALESCE(
    (SELECT ROUND(AVG((s.summary->>'ai_loc_percentage')::numeric), 1)
     FROM public.scans s
     WHERE s.company_id = c.id AND s.status = 'completed'
     AND s.completed_at > now() - interval '7 days'),
    0
  ) AS ai_loc_percentage,
  COALESCE(
    (SELECT ROUND(
      COUNT(CASE WHEN pr.human_reviewed THEN 1 END)::numeric /
      NULLIF(COUNT(CASE WHEN pr.ai_generated THEN 1 END), 0) * 100, 1)
     FROM public.pull_requests pr
     WHERE pr.company_id = c.id
     AND pr.pr_merged_at > now() - interval '7 days'),
    0
  ) AS review_coverage,
  (SELECT COUNT(*) FROM public.alerts a
   WHERE a.company_id = c.id AND a.status = 'active') AS active_alerts,
  now() AS refreshed_at
FROM public.companies c
LEFT JOIN public.repositories r ON r.company_id = c.id AND r.is_active = true
GROUP BY c.id, c.name, c.plan;

CREATE UNIQUE INDEX idx_mv_company_dashboard ON public.mv_company_dashboard(company_id);

CREATE MATERIALIZED VIEW public.mv_repo_metrics AS
SELECT
  r.id AS repository_id,
  r.company_id,
  r.name,
  r.full_name,
  r.language,
  latest_scan.summary AS latest_scan_summary,
  latest_scan.completed_at AS last_scan_at,
  (SELECT score FROM public.ai_debt_scores
   WHERE repository_id = r.id
   ORDER BY calculated_at DESC LIMIT 1) AS debt_score,
  (SELECT risk_zone FROM public.ai_debt_scores
   WHERE repository_id = r.id
   ORDER BY calculated_at DESC LIMIT 1) AS risk_zone,
  (SELECT COUNT(*) FROM public.scan_results sr
   JOIN public.scans s ON s.id = sr.scan_id
   WHERE sr.repository_id = r.id
   AND s.id = (SELECT id FROM public.scans WHERE repository_id = r.id AND status = 'completed' ORDER BY completed_at DESC LIMIT 1)
   AND sr.ai_probability > 0.5) AS ai_files_count,
  now() AS refreshed_at
FROM public.repositories r
LEFT JOIN LATERAL (
  SELECT summary, completed_at FROM public.scans
  WHERE repository_id = r.id AND status = 'completed'
  ORDER BY completed_at DESC LIMIT 1
) latest_scan ON true
WHERE r.is_active = true;

CREATE UNIQUE INDEX idx_mv_repo_metrics ON public.mv_repo_metrics(repository_id);
