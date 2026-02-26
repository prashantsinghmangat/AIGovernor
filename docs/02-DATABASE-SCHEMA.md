# CodeGuard AI — Database Schema

## Document 2 of 8

---

## Database: Supabase PostgreSQL

All tables use UUID primary keys, timestamptz for dates, and JSONB for flexible fields.
Every data table has `company_id` for multi-tenant isolation via Row-Level Security (RLS).

---

## Migration 1: Companies

```sql
-- supabase/migrations/00001_create_companies.sql

CREATE TABLE public.companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  domain          TEXT,                           -- company email domain (e.g., "acme.com")
  plan            TEXT NOT NULL DEFAULT 'starter', -- starter | growth | enterprise
  plan_status     TEXT NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | canceled
  trial_ends_at   TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  settings        JSONB NOT NULL DEFAULT '{
    "scoring_sensitivity": "medium",
    "risk_threshold": 60,
    "notification_frequency": "daily",
    "ai_merge_blocking": false,
    "auto_scan_enabled": true,
    "scan_interval_hours": 24
  }'::jsonb,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  max_repos       INT NOT NULL DEFAULT 3,         -- based on plan
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g'));
    -- Handle duplicates
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_company_slug
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION generate_slug();

-- Updated_at trigger (reuse for all tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration 2: Users (Profiles)

```sql
-- supabase/migrations/00002_create_users.sql

CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member | viewer
  job_title       TEXT,                            -- CTO, VP Eng, Tech Lead, etc.
  github_username TEXT,
  github_token    TEXT,                            -- Encrypted GitHub access token
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_active_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_company ON public.users(company_id);
CREATE INDEX idx_users_email ON public.users(email);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration 3: Repositories

```sql
-- supabase/migrations/00003_create_repositories.sql

CREATE TABLE public.repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  github_id       BIGINT NOT NULL,
  name            TEXT NOT NULL,                   -- "auth-api"
  full_name       TEXT NOT NULL,                   -- "acme-corp/auth-api"
  description     TEXT,
  default_branch  TEXT NOT NULL DEFAULT 'main',
  language        TEXT,                            -- Primary language
  is_private      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,   -- User can deactivate monitoring
  webhook_id      BIGINT,                          -- GitHub webhook ID
  webhook_secret  TEXT,                            -- Webhook verification secret
  last_scan_at    TIMESTAMPTZ,
  last_scan_status TEXT,                           -- completed | failed
  metadata        JSONB DEFAULT '{}',              -- Stars, forks, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, github_id)
);

CREATE INDEX idx_repos_company ON public.repositories(company_id);
CREATE INDEX idx_repos_active ON public.repositories(company_id, is_active) WHERE is_active = true;

CREATE TRIGGER repos_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration 4: Scans

```sql
-- supabase/migrations/00004_create_scans.sql

CREATE TABLE public.scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES public.users(id),  -- NULL for automated scans
  scan_type       TEXT NOT NULL DEFAULT 'full',       -- full | incremental | pr_scan
  status          TEXT NOT NULL DEFAULT 'pending',    -- pending | queued | running | completed | failed
  progress        INT NOT NULL DEFAULT 0,             -- 0-100
  
  -- Scan window
  scan_from       TIMESTAMPTZ,                        -- Start of analysis period
  scan_to         TIMESTAMPTZ,                        -- End of analysis period
  
  -- Results summary (populated on completion)
  summary         JSONB DEFAULT '{}',
  /* summary structure:
  {
    "total_commits": 142,
    "total_prs": 28,
    "total_files_scanned": 456,
    "total_loc": 24500,
    "ai_loc": 10290,
    "ai_loc_percentage": 42.0,
    "ai_prs_detected": 17,
    "reviewed_ai_prs": 11,
    "unreviewed_ai_merges": 6,
    "high_risk_files": 12,
    "medium_risk_files": 34,
    "low_risk_files": 410,
    "scan_duration_seconds": 45
  }
  */
  
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scans_company ON public.scans(company_id);
CREATE INDEX idx_scans_repo ON public.scans(repository_id);
CREATE INDEX idx_scans_status ON public.scans(status) WHERE status IN ('pending', 'queued', 'running');
CREATE INDEX idx_scans_latest ON public.scans(repository_id, completed_at DESC);
```

---

## Migration 5: Scan Results (File-Level)

```sql
-- supabase/migrations/00005_create_scan_results.sql

CREATE TABLE public.scan_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  
  file_path       TEXT NOT NULL,                   -- "src/middleware/validate.ts"
  language        TEXT,                            -- "typescript"
  total_loc       INT NOT NULL DEFAULT 0,
  ai_loc          INT NOT NULL DEFAULT 0,
  ai_probability  FLOAT NOT NULL DEFAULT 0,        -- 0.0 to 1.0
  risk_level      TEXT NOT NULL DEFAULT 'low',     -- high | medium | low
  
  -- Detection breakdown
  detection_signals JSONB DEFAULT '{}',
  /* detection_signals structure:
  {
    "metadata_match": true,
    "metadata_source": "copilot_trailer",
    "style_score": 0.72,
    "style_signals": {
      "naming_verbosity": 0.8,
      "comment_uniformity": 0.6,
      "typo_absence": 0.9,
      "indent_consistency": 0.85,
      "error_handling_ratio": 0.7
    },
    "ml_score": null,
    "combined_probability": 0.78
  }
  */
  
  -- Code snippet for display
  ai_code_snippet TEXT,                            -- Highlighted AI section
  snippet_start_line INT,
  snippet_end_line INT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_results_scan ON public.scan_results(scan_id);
CREATE INDEX idx_scan_results_repo ON public.scan_results(repository_id);
CREATE INDEX idx_scan_results_risk ON public.scan_results(company_id, risk_level);

-- Partition by company for large datasets (enable later)
-- ALTER TABLE public.scan_results PARTITION BY LIST (company_id);
```

---

## Migration 6: AI Debt Scores

```sql
-- supabase/migrations/00006_create_ai_debt_scores.sql

CREATE TABLE public.ai_debt_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID REFERENCES public.repositories(id) ON DELETE CASCADE, -- NULL = company-wide score
  scan_id         UUID REFERENCES public.scans(id),
  
  score           INT NOT NULL CHECK (score >= 0 AND score <= 100),
  previous_score  INT,                             -- For trend calculation
  score_change    INT,                             -- score - previous_score
  risk_zone       TEXT NOT NULL,                   -- healthy | caution | critical
  
  -- Score breakdown (the formula components)
  breakdown       JSONB NOT NULL DEFAULT '{}',
  /* breakdown structure:
  {
    "ai_loc_ratio": 0.42,          -- Weight: 0.30
    "review_coverage": 0.61,       -- Weight: 0.30 (inverted: 1 - 0.61 = 0.39)
    "refactor_backlog_growth": 0.12, -- Weight: 0.20
    "prompt_inconsistency": 0.45,  -- Weight: 0.20
    "weights": { "w1": 0.30, "w2": 0.30, "w3": 0.20, "w4": 0.20 },
    "raw_penalty": 32.4,
    "final_score": 68
  }
  */
  
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_scores_company ON public.ai_debt_scores(company_id, calculated_at DESC);
CREATE INDEX idx_debt_scores_repo ON public.ai_debt_scores(repository_id, calculated_at DESC);
```

---

## Migration 7: Pull Requests

```sql
-- supabase/migrations/00007_create_pull_requests.sql

CREATE TABLE public.pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  
  github_pr_number INT NOT NULL,
  github_pr_id    BIGINT NOT NULL,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,                   -- GitHub username
  state           TEXT NOT NULL,                   -- open | closed | merged
  
  -- AI analysis
  ai_generated    BOOLEAN NOT NULL DEFAULT false,
  ai_probability  FLOAT DEFAULT 0,
  ai_loc_added    INT NOT NULL DEFAULT 0,
  total_loc_added INT NOT NULL DEFAULT 0,
  files_changed   INT NOT NULL DEFAULT 0,
  
  -- Review status
  human_reviewed  BOOLEAN NOT NULL DEFAULT false,
  review_count    INT NOT NULL DEFAULT 0,
  approved        BOOLEAN DEFAULT false,
  
  -- Timestamps
  pr_created_at   TIMESTAMPTZ,
  pr_merged_at    TIMESTAMPTZ,
  analyzed_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prs_company ON public.pull_requests(company_id);
CREATE INDEX idx_prs_repo ON public.pull_requests(repository_id);
CREATE INDEX idx_prs_unreviewed ON public.pull_requests(company_id, human_reviewed, ai_generated)
  WHERE ai_generated = true AND human_reviewed = false;

CREATE UNIQUE INDEX idx_prs_github ON public.pull_requests(repository_id, github_pr_id);
```

---

## Migration 8: Alerts

```sql
-- supabase/migrations/00008_create_alerts.sql

CREATE TABLE public.alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
  scan_id         UUID REFERENCES public.scans(id),
  
  severity        TEXT NOT NULL,                   -- high | medium | low
  category        TEXT NOT NULL,                   -- ai_debt | review_coverage | unreviewed_merge |
                                                   -- prompt_inconsistency | threshold_breach | team_risk
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  
  -- Alert data (for linking to specific items)
  context         JSONB DEFAULT '{}',
  /* context examples:
  { "file_path": "src/auth/validate.ts", "ai_probability": 0.92 }
  { "pr_number": 142, "author": "attri-r" }
  { "repo": "auth-api", "score_drop": 15 }
  */
  
  status          TEXT NOT NULL DEFAULT 'active',  -- active | acknowledged | dismissed | resolved
  acknowledged_by UUID REFERENCES public.users(id),
  acknowledged_at TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_company ON public.alerts(company_id, status, created_at DESC);
CREATE INDEX idx_alerts_active ON public.alerts(company_id, status) WHERE status = 'active';
CREATE INDEX idx_alerts_severity ON public.alerts(company_id, severity) WHERE status = 'active';
```

---

## Migration 9: Team Metrics

```sql
-- supabase/migrations/00009_create_team_metrics.sql

CREATE TABLE public.team_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  github_username TEXT NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  
  -- Period
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  -- Metrics
  ai_usage_level  TEXT NOT NULL DEFAULT 'low',     -- high | medium | low
  review_quality  TEXT NOT NULL DEFAULT 'moderate', -- strong | moderate | weak
  risk_index      TEXT NOT NULL DEFAULT 'low',     -- high | medium | low
  governance_score INT NOT NULL DEFAULT 50 CHECK (governance_score >= 0 AND governance_score <= 100),
  
  -- Raw numbers
  total_prs       INT NOT NULL DEFAULT 0,
  ai_prs          INT NOT NULL DEFAULT 0,
  prs_reviewed    INT NOT NULL DEFAULT 0,          -- PRs this person reviewed
  ai_loc_authored INT NOT NULL DEFAULT 0,
  
  -- Coaching
  coaching_suggestions JSONB DEFAULT '[]',
  /* coaching_suggestions structure:
  [
    {
      "type": "review_quality",
      "priority": "high",
      "message": "Consider pair-reviewing AI-generated code with a senior engineer."
    }
  ]
  */
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_company ON public.team_metrics(company_id, period_end DESC);
CREATE UNIQUE INDEX idx_team_unique ON public.team_metrics(company_id, github_username, period_start, period_end);
```

---

## Migration 10: Integrations

```sql
-- supabase/migrations/00010_create_integrations.sql

CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  provider        TEXT NOT NULL,                   -- github | slack | jira | claude | openai
  status          TEXT NOT NULL DEFAULT 'disconnected', -- connected | disconnected | error
  
  -- Connection details (encrypted)
  access_token    TEXT,
  refresh_token   TEXT,
  webhook_url     TEXT,
  
  -- Provider-specific config
  config          JSONB DEFAULT '{}',
  /* Examples:
  GitHub: { "installation_id": 123, "org": "acme-corp" }
  Slack:  { "channel_id": "C123", "weekly_report": true, "risk_alerts": true, "merge_warnings": false }
  Jira:   { "project_key": "ENG", "board_id": 1 }
  */
  
  last_synced_at  TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, provider)
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration 11: Audit Logs

```sql
-- supabase/migrations/00011_create_audit_logs.sql

CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id),
  
  action          TEXT NOT NULL,    -- scan.triggered | alert.dismissed | settings.updated | repo.added | ...
  resource_type   TEXT NOT NULL,    -- scan | alert | repository | settings | user | integration
  resource_id     UUID,
  
  details         JSONB DEFAULT '{}',
  ip_address      INET,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_company ON public.audit_logs(company_id, created_at DESC);
```

---

## Migration 12: Governance Reports

```sql
-- supabase/migrations/00012_create_governance_reports.sql

CREATE TABLE public.governance_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  report_type     TEXT NOT NULL DEFAULT 'weekly',  -- weekly | monthly | custom
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  -- Report content (pre-computed for fast retrieval)
  content         JSONB NOT NULL DEFAULT '{}',
  /* content structure:
  {
    "ai_usage_summary": {
      "ai_loc_percentage": 42,
      "ai_loc_change": "+4.2%",
      "ai_prs_total": 28,
      "reviewed_percentage": 61
    },
    "risk_summary": {
      "debt_score": 68,
      "debt_score_change": "+4",
      "high_risk_repos": ["auth-api", "admin-panel"],
      "new_alerts": 6
    },
    "technical_debt_signals": [
      "Refactor backlog grew 12% week-over-week",
      "15 AI-suggested refactors acknowledged, 12 dismissed"
    ],
    "recommendations": [
      "Schedule focused review session for Auth API",
      "Implement mandatory AI code review for PRs > 200 LOC"
    ],
    "team_highlights": {
      "top_reviewer": "shuyeb-a",
      "highest_risk": "attri-r",
      "most_improved": "ashish-m"
    }
  }
  */
  
  pdf_storage_path TEXT,                           -- Supabase Storage path for PDF
  status          TEXT NOT NULL DEFAULT 'generated', -- generating | generated | sent
  sent_at         TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_company ON public.governance_reports(company_id, period_end DESC);
```

---

## Migration 13: Enable RLS on All Tables

```sql
-- supabase/migrations/00013_enable_rls.sql

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_debt_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_reports ENABLE ROW LEVEL SECURITY;
```

---

## Migration 14: RLS Policies

```sql
-- supabase/migrations/00014_create_rls_policies.sql

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is admin/owner
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========== COMPANIES ==========
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "Admins can update own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id() AND public.is_company_admin());

-- ========== USERS ==========
CREATE POLICY "Users can view company members"
  ON public.users FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ========== REPOSITORIES ==========
CREATE POLICY "Users can view company repos"
  ON public.repositories FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage repos"
  ON public.repositories FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- ========== SCANS ==========
CREATE POLICY "Users can view company scans"
  ON public.scans FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Members can trigger scans"
  ON public.scans FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- ========== SCAN RESULTS ==========
CREATE POLICY "Users can view company scan results"
  ON public.scan_results FOR SELECT
  USING (company_id = public.get_user_company_id());

-- ========== AI DEBT SCORES ==========
CREATE POLICY "Users can view company scores"
  ON public.ai_debt_scores FOR SELECT
  USING (company_id = public.get_user_company_id());

-- ========== PULL REQUESTS ==========
CREATE POLICY "Users can view company PRs"
  ON public.pull_requests FOR SELECT
  USING (company_id = public.get_user_company_id());

-- ========== ALERTS ==========
CREATE POLICY "Users can view company alerts"
  ON public.alerts FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Members can update alerts"
  ON public.alerts FOR UPDATE
  USING (company_id = public.get_user_company_id());

-- ========== TEAM METRICS ==========
CREATE POLICY "Users can view company team metrics"
  ON public.team_metrics FOR SELECT
  USING (company_id = public.get_user_company_id());

-- ========== INTEGRATIONS ==========
CREATE POLICY "Users can view company integrations"
  ON public.integrations FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage integrations"
  ON public.integrations FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- ========== AUDIT LOGS ==========
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- ========== GOVERNANCE REPORTS ==========
CREATE POLICY "Users can view company reports"
  ON public.governance_reports FOR SELECT
  USING (company_id = public.get_user_company_id());
```

---

## Migration 15: Performance Indexes

```sql
-- supabase/migrations/00015_create_indexes.sql

-- Composite indexes for common dashboard queries
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

-- Full-text search on alerts
CREATE INDEX idx_alerts_search
  ON public.alerts USING gin(to_tsvector('english', title || ' ' || description));
```

---

## Migration 16: Materialized Views (Dashboard Performance)

```sql
-- supabase/migrations/00016_create_materialized_views.sql

-- Company-level dashboard metrics (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW public.mv_company_dashboard AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.plan,
  COUNT(DISTINCT r.id) AS repo_count,
  
  -- Latest company-wide AI Debt Score
  (SELECT score FROM public.ai_debt_scores
   WHERE company_id = c.id AND repository_id IS NULL
   ORDER BY calculated_at DESC LIMIT 1) AS debt_score,
  
  -- AI LOC percentage (from latest scans)
  COALESCE(
    (SELECT ROUND(AVG((s.summary->>'ai_loc_percentage')::numeric), 1)
     FROM public.scans s
     WHERE s.company_id = c.id AND s.status = 'completed'
     AND s.completed_at > now() - interval '7 days'),
    0
  ) AS ai_loc_percentage,
  
  -- Review coverage
  COALESCE(
    (SELECT ROUND(
      COUNT(CASE WHEN pr.human_reviewed THEN 1 END)::numeric /
      NULLIF(COUNT(CASE WHEN pr.ai_generated THEN 1 END), 0) * 100, 1)
     FROM public.pull_requests pr
     WHERE pr.company_id = c.id
     AND pr.pr_merged_at > now() - interval '7 days'),
    0
  ) AS review_coverage,
  
  -- Active alerts count
  (SELECT COUNT(*) FROM public.alerts a
   WHERE a.company_id = c.id AND a.status = 'active') AS active_alerts,
  
  now() AS refreshed_at
FROM public.companies c
LEFT JOIN public.repositories r ON r.company_id = c.id AND r.is_active = true
GROUP BY c.id, c.name, c.plan;

CREATE UNIQUE INDEX idx_mv_company_dashboard ON public.mv_company_dashboard(company_id);

-- Repository-level metrics
CREATE MATERIALIZED VIEW public.mv_repo_metrics AS
SELECT
  r.id AS repository_id,
  r.company_id,
  r.name,
  r.full_name,
  r.language,
  
  -- Latest scan summary
  latest_scan.summary AS latest_scan_summary,
  latest_scan.completed_at AS last_scan_at,
  
  -- Latest debt score for this repo
  (SELECT score FROM public.ai_debt_scores
   WHERE repository_id = r.id
   ORDER BY calculated_at DESC LIMIT 1) AS debt_score,
  
  -- Risk level
  (SELECT risk_zone FROM public.ai_debt_scores
   WHERE repository_id = r.id
   ORDER BY calculated_at DESC LIMIT 1) AS risk_zone,
  
  -- File count with AI code
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
```

---

## Migration 17: Database Functions

```sql
-- supabase/migrations/00017_create_functions.sql

-- Calculate AI Debt Score
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
  -- Get AI LOC ratio (0-1)
  SELECT COALESCE(AVG((summary->>'ai_loc_percentage')::float / 100), 0)
  INTO v_ai_loc_ratio
  FROM public.scans
  WHERE company_id = p_company_id
    AND (p_repository_id IS NULL OR repository_id = p_repository_id)
    AND status = 'completed'
    AND completed_at > now() - interval '7 days';

  -- Get review coverage (0-1)
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

  -- Refactor backlog growth (simulated: 0-1)
  v_refactor_growth := LEAST(v_ai_loc_ratio * 0.3, 1.0);

  -- Prompt inconsistency (simulated: 0-1)
  v_prompt_inconsistency := CASE
    WHEN v_ai_loc_ratio > 0.5 THEN 0.6
    WHEN v_ai_loc_ratio > 0.3 THEN 0.4
    ELSE 0.2
  END;

  -- Calculate score
  v_score := GREATEST(0, LEAST(100,
    ROUND(100 - (
      v_w1 * v_ai_loc_ratio * 100 +
      v_w2 * (1 - v_review_coverage) * 100 +
      v_w3 * v_refactor_growth * 100 +
      v_w4 * v_prompt_inconsistency * 100
    ))::int
  ));

  -- Store the score
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

-- Refresh materialized views (called by pg_cron)
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_company_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_repo_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule refresh every 15 minutes (enable via Supabase dashboard)
-- SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT public.refresh_dashboard_views()');
```

---

## Migration 18: Seed Data (Development)

```sql
-- supabase/migrations/00018_seed_data.sql
-- This seed data creates a realistic demo environment

-- NOTE: In production, company + user are created via the signup flow.
-- This seed is for local development and demo purposes only.

-- Insert demo company
INSERT INTO public.companies (id, name, slug, plan, plan_status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corporation',
  'acme-corp',
  'growth',
  'active',
  '{"scoring_sensitivity": "medium", "risk_threshold": 60, "notification_frequency": "daily", "ai_merge_blocking": false, "auto_scan_enabled": true, "scan_interval_hours": 24}'::jsonb
);

-- Insert demo repositories
INSERT INTO public.repositories (id, company_id, github_id, name, full_name, language, is_active) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 100001, 'auth-api', 'acme-corp/auth-api', 'TypeScript', true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 100002, 'frontend', 'acme-corp/frontend', 'TypeScript', true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 100003, 'payments', 'acme-corp/payments', 'Python', true),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 100004, 'data-pipeline', 'acme-corp/data-pipeline', 'Python', true),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 100005, 'notifications', 'acme-corp/notifications', 'Go', true),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 100006, 'admin-panel', 'acme-corp/admin-panel', 'TypeScript', true);

-- Insert demo AI Debt Scores (historical trend)
INSERT INTO public.ai_debt_scores (company_id, repository_id, score, risk_zone, breakdown, calculated_at) VALUES
  -- Company-wide scores (monthly)
  ('00000000-0000-0000-0000-000000000001', NULL, 72, 'caution', '{"ai_loc_ratio": 0.32, "review_coverage": 0.70}'::jsonb, now() - interval '5 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 69, 'caution', '{"ai_loc_ratio": 0.35, "review_coverage": 0.65}'::jsonb, now() - interval '4 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 65, 'caution', '{"ai_loc_ratio": 0.38, "review_coverage": 0.60}'::jsonb, now() - interval '3 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 61, 'caution', '{"ai_loc_ratio": 0.40, "review_coverage": 0.55}'::jsonb, now() - interval '2 months'),
  ('00000000-0000-0000-0000-000000000001', NULL, 64, 'caution', '{"ai_loc_ratio": 0.41, "review_coverage": 0.58}'::jsonb, now() - interval '1 month'),
  ('00000000-0000-0000-0000-000000000001', NULL, 68, 'caution', '{"ai_loc_ratio": 0.42, "review_coverage": 0.61}'::jsonb, now()),
  -- Per-repo scores
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 42, 'critical', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 65, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 78, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 55, 'critical', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 70, 'caution', '{}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 35, 'critical', '{}'::jsonb, now());

-- Insert demo alerts
INSERT INTO public.alerts (company_id, repository_id, severity, category, title, description, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'high', 'ai_debt', 'High AI-generated code in auth module', 'Auth API has 52% AI-generated LOC with only 48% review coverage. This exceeds the configured risk threshold.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'high', 'review_coverage', 'Low human review coverage in backend PRs', 'Backend repositories showing declining human review rates. 39% of AI-generated PRs merged without review this week.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'medium', 'ai_debt', 'Spike in AI refactor suggestions ignored', '12 AI-suggested refactors were dismissed without review in the past 48 hours.', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'medium', 'prompt_inconsistency', 'Prompt inconsistency detected in Frontend repo', 'Multiple AI prompting patterns found across team members. Consider standardizing prompt templates.', 'active'),
  ('00000000-0000-0000-0000-000000000001', NULL, 'low', 'team_risk', 'New team member AI governance onboarding pending', 'Vikram D. joined 3 days ago and has not completed the AI governance onboarding module.', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 'high', 'threshold_breach', 'Admin Panel repo exceeds AI debt threshold', 'AI Debt Score dropped to 35 (critical zone). Immediate review recommended.', 'active');

-- Insert demo team metrics
INSERT INTO public.team_metrics (company_id, github_username, display_name, period_start, period_end, ai_usage_level, review_quality, risk_index, governance_score, total_prs, ai_prs, prs_reviewed, ai_loc_authored, coaching_suggestions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'prashant-k', 'Prashant K.', '2026-02-17', '2026-02-23', 'high', 'strong', 'low', 88, 24, 18, 12, 1800, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'ashish-m', 'Ashish M.', '2026-02-17', '2026-02-23', 'medium', 'moderate', 'medium', 65, 19, 11, 8, 950, '[{"type": "review_quality", "priority": "medium", "message": "Consider attending the AI code review workshop and using structured review checklists."}]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'shuyeb-a', 'Shuyeb A.', '2026-02-17', '2026-02-23', 'low', 'strong', 'low', 92, 15, 4, 18, 320, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'attri-r', 'Attri R.', '2026-02-17', '2026-02-23', 'high', 'weak', 'high', 38, 28, 25, 3, 2400, '[{"type": "review_quality", "priority": "high", "message": "High AI usage but weak review quality. Recommend pair-reviewing AI-generated code with a senior engineer for the next sprint."}]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'neha-s', 'Neha S.', '2026-02-17', '2026-02-23', 'medium', 'strong', 'low', 81, 21, 12, 14, 1100, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'vikram-d', 'Vikram D.', '2026-02-17', '2026-02-23', 'high', 'moderate', 'medium', 59, 31, 26, 6, 2200, '[{"type": "review_quality", "priority": "medium", "message": "Consider establishing a personal AI code review checklist to catch common issues."}]'::jsonb);

-- Insert demo integrations
INSERT INTO public.integrations (company_id, provider, status, config) VALUES
  ('00000000-0000-0000-0000-000000000001', 'github', 'connected', '{"org": "acme-corp"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'slack', 'connected', '{"channel_id": "C123456", "weekly_report": true, "risk_alerts": true, "merge_warnings": false}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'jira', 'disconnected', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'claude', 'connected', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'openai', 'disconnected', '{}'::jsonb);
```

---

## Type Generation

After running all migrations, generate TypeScript types:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

This auto-generates types for all tables, which are used throughout the application for type-safe queries.
