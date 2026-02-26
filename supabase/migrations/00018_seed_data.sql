INSERT INTO public.companies (id, name, slug, plan, plan_status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corporation',
  'acme-corp',
  'growth',
  'active',
  '{"scoring_sensitivity": "medium", "risk_threshold": 60, "notification_frequency": "daily", "ai_merge_blocking": false, "auto_scan_enabled": true, "scan_interval_hours": 24}'::jsonb
);

INSERT INTO public.repositories (id, company_id, github_id, name, full_name, language, is_active) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 100001, 'auth-api', 'acme-corp/auth-api', 'TypeScript', true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 100002, 'frontend', 'acme-corp/frontend', 'TypeScript', true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 100003, 'payments', 'acme-corp/payments', 'Python', true),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 100004, 'data-pipeline', 'acme-corp/data-pipeline', 'Python', true),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 100005, 'notifications', 'acme-corp/notifications', 'Go', true),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 100006, 'admin-panel', 'acme-corp/admin-panel', 'TypeScript', true);

INSERT INTO public.ai_debt_scores (company_id, repository_id, score, risk_zone, breakdown, calculated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 72, 'caution', '{"ai_loc_ratio": 0.32, "review_coverage": 0.70}'::jsonb, now() - interval '5 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 69, 'caution', '{"ai_loc_ratio": 0.35, "review_coverage": 0.65}'::jsonb, now() - interval '4 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 65, 'caution', '{"ai_loc_ratio": 0.38, "review_coverage": 0.60}'::jsonb, now() - interval '3 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 61, 'caution', '{"ai_loc_ratio": 0.40, "review_coverage": 0.55}'::jsonb, now() - interval '2 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 64, 'caution', '{"ai_loc_ratio": 0.41, "review_coverage": 0.58}'::jsonb, now() - interval '1 month'),
  ('00000000-0000-0000-0000-000000000001', NULL, 68, 'caution', '{"ai_loc_ratio": 0.42, "review_coverage": 0.61}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 42, 'critical', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 65, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 78, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 55, 'critical', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 70, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 35, 'critical', '{}'::jsonb, now());

INSERT INTO public.alerts (company_id, repository_id, severity, category, title, description, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'high', 'ai_debt', 'High AI-generated code in auth module', 'Auth API has 52% AI-generated LOC with only 48% review coverage. This exceeds the configured risk threshold.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'high', 'review_coverage', 'Low human review coverage in backend PRs', 'Backend repositories showing declining human review rates. 39% of AI-generated PRs merged without review this week.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'medium', 'ai_debt', 'Spike in AI refactor suggestions ignored', '12 AI-suggested refactors were dismissed without review in the past 48 hours.', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'medium', 'prompt_inconsistency', 'Prompt inconsistency detected in Frontend repo', 'Multiple AI prompting patterns found across team members. Consider standardizing prompt templates.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'low', 'team_risk', 'New team member AI governance onboarding pending', 'Vikram D. joined 3 days ago and has not completed the AI governance onboarding module.', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 'high', 'threshold_breach', 'Admin Panel repo exceeds AI debt threshold', 'AI Debt Score dropped to 35 (critical zone). Immediate review recommended.', 'active');

INSERT INTO public.team_metrics (company_id, github_username, display_name, period_start, period_end, ai_usage_level, review_quality, risk_index, governance_score, total_prs, ai_prs, prs_reviewed, ai_loc_authored, coaching_suggestions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'prashant-k', 'Prashant K.', '2026-02-17', '2026-02-23', 'high', 'strong', 'low', 88, 24, 18, 12, 1800, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'ashish-m', 'Ashish M.', '2026-02-17', '2026-02-23', 'medium', 'moderate', 'medium', 65, 19, 11, 8, 950, '[{"type": "review_quality", "priority": "medium", "message": "Consider attending the AI code review workshop and using structured review checklists."}]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'shuyeb-a', 'Shuyeb A.', '2026-02-17', '2026-02-23', 'low', 'strong', 'low', 92, 15, 4, 18, 320, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'attri-r', 'Attri R.', '2026-02-17', '2026-02-23', 'high', 'weak', 'high', 38, 28, 25, 3, 2400, '[{"type": "review_quality", "priority": "high", "message": "High AI usage but weak review quality. Recommend pair-reviewing AI-generated code with a senior engineer for the next sprint."}]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'neha-s', 'Neha S.', '2026-02-17', '2026-02-23', 'medium', 'strong', 'low', 81, 21, 12, 14, 1100, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'vikram-d', 'Vikram D.', '2026-02-17', '2026-02-23', 'high', 'moderate', 'medium', 59, 31, 26, 6, 2200, '[{"type": "review_quality", "priority": "medium", "message": "Consider establishing a personal AI code review checklist to catch common issues."}]'::jsonb);

INSERT INTO public.integrations (company_id, provider, status, config) VALUES
  ('00000000-0000-0000-0000-000000000001', 'github', 'connected', '{"org": "acme-corp"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'slack', 'connected', '{"channel_id": "C123456", "weekly_report": true, "risk_alerts": true, "merge_warnings": false}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'jira', 'disconnected', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'claude', 'connected', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'openai', 'disconnected', '{}'::jsonb);
