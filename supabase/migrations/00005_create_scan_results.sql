CREATE TABLE public.scan_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  language        TEXT,
  total_loc       INT NOT NULL DEFAULT 0,
  ai_loc          INT NOT NULL DEFAULT 0,
  ai_probability  FLOAT NOT NULL DEFAULT 0,
  risk_level      TEXT NOT NULL DEFAULT 'low',
  detection_signals JSONB DEFAULT '{}',
  ai_code_snippet TEXT,
  snippet_start_line INT,
  snippet_end_line INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_results_scan ON public.scan_results(scan_id);
CREATE INDEX idx_scan_results_repo ON public.scan_results(repository_id);
CREATE INDEX idx_scan_results_risk ON public.scan_results(company_id, risk_level);
