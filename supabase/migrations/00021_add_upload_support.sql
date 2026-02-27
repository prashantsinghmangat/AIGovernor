-- Allow repositories that come from ZIP uploads (no github_id)
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'github';

ALTER TABLE public.repositories
  ALTER COLUMN github_id DROP NOT NULL;

-- Check constraint for valid source values
ALTER TABLE public.repositories
  ADD CONSTRAINT chk_repositories_source CHECK (source IN ('github', 'upload'));

-- Drop old unique constraint and replace with partial index (GitHub repos only)
ALTER TABLE public.repositories
  DROP CONSTRAINT IF EXISTS repositories_company_id_github_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_company_github
  ON public.repositories(company_id, github_id)
  WHERE github_id IS NOT NULL;

-- Upload repos: unique on (company_id, name) where source = 'upload'
CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_company_upload_name
  ON public.repositories(company_id, name)
  WHERE source = 'upload';

-- Storage bucket for extracted ZIP contents (service-role access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-uploads', 'scan-uploads', false)
ON CONFLICT (id) DO NOTHING;
