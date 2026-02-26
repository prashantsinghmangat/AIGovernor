CREATE TABLE public.governance_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type     TEXT NOT NULL DEFAULT 'weekly',
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}',
  pdf_storage_path TEXT,
  status          TEXT NOT NULL DEFAULT 'generated',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_company ON public.governance_reports(company_id, period_end DESC);
