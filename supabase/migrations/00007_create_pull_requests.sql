CREATE TABLE public.pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  github_pr_number INT NOT NULL,
  github_pr_id    BIGINT NOT NULL,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  state           TEXT NOT NULL,
  ai_generated    BOOLEAN NOT NULL DEFAULT false,
  ai_probability  FLOAT DEFAULT 0,
  ai_loc_added    INT NOT NULL DEFAULT 0,
  total_loc_added INT NOT NULL DEFAULT 0,
  files_changed   INT NOT NULL DEFAULT 0,
  human_reviewed  BOOLEAN NOT NULL DEFAULT false,
  review_count    INT NOT NULL DEFAULT 0,
  approved        BOOLEAN DEFAULT false,
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
