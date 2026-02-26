CREATE TABLE public.team_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  ai_usage_level  TEXT NOT NULL DEFAULT 'low',
  review_quality  TEXT NOT NULL DEFAULT 'moderate',
  risk_index      TEXT NOT NULL DEFAULT 'low',
  governance_score INT NOT NULL DEFAULT 50 CHECK (governance_score >= 0 AND governance_score <= 100),
  total_prs       INT NOT NULL DEFAULT 0,
  ai_prs          INT NOT NULL DEFAULT 0,
  prs_reviewed    INT NOT NULL DEFAULT 0,
  ai_loc_authored INT NOT NULL DEFAULT 0,
  coaching_suggestions JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_company ON public.team_metrics(company_id, period_end DESC);
CREATE UNIQUE INDEX idx_team_unique ON public.team_metrics(company_id, github_username, period_start, period_end);
