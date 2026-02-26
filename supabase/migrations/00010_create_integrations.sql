CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'disconnected',
  access_token    TEXT,
  refresh_token   TEXT,
  webhook_url     TEXT,
  config          JSONB DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider)
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
