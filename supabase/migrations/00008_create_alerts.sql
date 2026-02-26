CREATE TABLE public.alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
  scan_id         UUID REFERENCES public.scans(id),
  severity        TEXT NOT NULL,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  context         JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',
  acknowledged_by UUID REFERENCES public.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_company ON public.alerts(company_id, status, created_at DESC);
CREATE INDEX idx_alerts_active ON public.alerts(company_id, status) WHERE status = 'active';
CREATE INDEX idx_alerts_severity ON public.alerts(company_id, severity) WHERE status = 'active';
