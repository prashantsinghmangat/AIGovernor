CREATE TABLE public.ai_debt_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  scan_id         UUID REFERENCES public.scans(id),
  score           INT NOT NULL CHECK (score >= 0 AND score <= 100),
  previous_score  INT,
  score_change    INT,
  risk_zone       TEXT NOT NULL,
  breakdown       JSONB NOT NULL DEFAULT '{}',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_scores_company ON public.ai_debt_scores(company_id, calculated_at DESC);
CREATE INDEX idx_debt_scores_repo ON public.ai_debt_scores(repository_id, calculated_at DESC);
