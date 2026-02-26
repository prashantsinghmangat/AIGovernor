CREATE TABLE public.scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES public.users(id),
  scan_type       TEXT NOT NULL DEFAULT 'full',
  status          TEXT NOT NULL DEFAULT 'pending',
  progress        INT NOT NULL DEFAULT 0,
  scan_from       TIMESTAMPTZ,
  scan_to         TIMESTAMPTZ,
  summary         JSONB DEFAULT '{}',
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scans_company ON public.scans(company_id);
CREATE INDEX idx_scans_repo ON public.scans(repository_id);
CREATE INDEX idx_scans_status ON public.scans(status) WHERE status IN ('pending', 'queued', 'running');
CREATE INDEX idx_scans_latest ON public.scans(repository_id, completed_at DESC);
