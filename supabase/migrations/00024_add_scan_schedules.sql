-- Scan schedules for automated periodic scanning
CREATE TABLE public.scan_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  schedule_type   TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
  cron_expression TEXT, -- Optional: custom cron (e.g., '0 2 * * 1' = 2am every Monday)
  scan_type       TEXT NOT NULL DEFAULT 'full', -- 'full', 'incremental'
  enabled         BOOLEAN NOT NULL DEFAULT true,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  run_count       INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scan_schedules_repo ON public.scan_schedules(repository_id)
  WHERE enabled = true;
CREATE INDEX idx_scan_schedules_next_run ON public.scan_schedules(next_run_at)
  WHERE enabled = true;
CREATE INDEX idx_scan_schedules_company ON public.scan_schedules(company_id);

-- Enable RLS
ALTER TABLE public.scan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company scan schedules"
  ON public.scan_schedules FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage scan schedules"
  ON public.scan_schedules FOR ALL
  USING (company_id = get_user_company_id() AND is_company_admin());
