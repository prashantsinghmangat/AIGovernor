CREATE TABLE public.companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  domain          TEXT,
  plan            TEXT NOT NULL DEFAULT 'starter',
  plan_status     TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at   TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  settings        JSONB NOT NULL DEFAULT '{
    "scoring_sensitivity": "medium",
    "risk_threshold": 60,
    "notification_frequency": "daily",
    "ai_merge_blocking": false,
    "auto_scan_enabled": true,
    "scan_interval_hours": 24
  }'::jsonb,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  max_repos       INT NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g'));
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_company_slug
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION generate_slug();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
