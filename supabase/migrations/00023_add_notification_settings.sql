-- Notification channels and preferences per company
CREATE TABLE public.notification_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL, -- 'slack', 'email', 'webhook', 'in_app'
  enabled         BOOLEAN NOT NULL DEFAULT false,
  config          JSONB NOT NULL DEFAULT '{}',
  -- Notification triggers
  on_scan_complete       BOOLEAN NOT NULL DEFAULT true,
  on_critical_vulnerability BOOLEAN NOT NULL DEFAULT true,
  on_high_vulnerability    BOOLEAN NOT NULL DEFAULT true,
  on_pii_detected        BOOLEAN NOT NULL DEFAULT true,
  on_debt_score_drop     BOOLEAN NOT NULL DEFAULT true,
  on_pr_analysis         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_settings_unique ON public.notification_settings(company_id, channel);
CREATE INDEX idx_notification_settings_company ON public.notification_settings(company_id);

-- Notification log to track sent notifications
CREATE TABLE public.notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_company ON public.notification_log(company_id);
CREATE INDEX idx_notification_log_recent ON public.notification_log(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their company notification settings"
  ON public.notification_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings FOR ALL
  USING (company_id = get_user_company_id() AND is_company_admin());

CREATE POLICY "Users can view their company notification log"
  ON public.notification_log FOR SELECT
  USING (company_id = get_user_company_id());
