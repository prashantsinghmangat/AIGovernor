CREATE OR REPLACE FUNCTION public.calculate_ai_debt_score(
  p_company_id UUID,
  p_repository_id UUID DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_ai_loc_ratio FLOAT;
  v_review_coverage FLOAT;
  v_refactor_growth FLOAT;
  v_prompt_inconsistency FLOAT;
  v_score INT;
  v_w1 FLOAT := 0.30;
  v_w2 FLOAT := 0.30;
  v_w3 FLOAT := 0.20;
  v_w4 FLOAT := 0.20;
BEGIN
  SELECT COALESCE(AVG((summary->>'ai_loc_percentage')::float / 100), 0)
  INTO v_ai_loc_ratio
  FROM public.scans
  WHERE company_id = p_company_id
    AND (p_repository_id IS NULL OR repository_id = p_repository_id)
    AND status = 'completed'
    AND completed_at > now() - interval '7 days';

  SELECT COALESCE(
    COUNT(CASE WHEN human_reviewed AND ai_generated THEN 1 END)::float /
    NULLIF(COUNT(CASE WHEN ai_generated THEN 1 END), 0),
    0.5
  )
  INTO v_review_coverage
  FROM public.pull_requests
  WHERE company_id = p_company_id
    AND (p_repository_id IS NULL OR repository_id = p_repository_id)
    AND pr_merged_at > now() - interval '30 days';

  v_refactor_growth := LEAST(v_ai_loc_ratio * 0.3, 1.0);

  v_prompt_inconsistency := CASE
    WHEN v_ai_loc_ratio > 0.5 THEN 0.6
    WHEN v_ai_loc_ratio > 0.3 THEN 0.4
    ELSE 0.2
  END;

  v_score := GREATEST(0, LEAST(100,
    ROUND(100 - (
      v_w1 * v_ai_loc_ratio * 100 +
      v_w2 * (1 - v_review_coverage) * 100 +
      v_w3 * v_refactor_growth * 100 +
      v_w4 * v_prompt_inconsistency * 100
    ))::int
  ));

  INSERT INTO public.ai_debt_scores (company_id, repository_id, score, risk_zone, breakdown)
  VALUES (
    p_company_id,
    p_repository_id,
    v_score,
    CASE WHEN v_score >= 80 THEN 'healthy' WHEN v_score >= 60 THEN 'caution' ELSE 'critical' END,
    jsonb_build_object(
      'ai_loc_ratio', ROUND(v_ai_loc_ratio::numeric, 3),
      'review_coverage', ROUND(v_review_coverage::numeric, 3),
      'refactor_backlog_growth', ROUND(v_refactor_growth::numeric, 3),
      'prompt_inconsistency', ROUND(v_prompt_inconsistency::numeric, 3),
      'weights', jsonb_build_object('w1', v_w1, 'w2', v_w2, 'w3', v_w3, 'w4', v_w4),
      'final_score', v_score
    )
  );

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_company_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_repo_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
