CREATE TABLE public.repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  github_id       BIGINT NOT NULL,
  name            TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  description     TEXT,
  default_branch  TEXT NOT NULL DEFAULT 'main',
  language        TEXT,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  webhook_id      BIGINT,
  webhook_secret  TEXT,
  last_scan_at    TIMESTAMPTZ,
  last_scan_status TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, github_id)
);

CREATE INDEX idx_repos_company ON public.repositories(company_id);
CREATE INDEX idx_repos_active ON public.repositories(company_id, is_active) WHERE is_active = true;

CREATE TRIGGER repos_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
