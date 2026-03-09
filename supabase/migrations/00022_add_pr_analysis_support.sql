-- Add PR metadata to scans table for PR-type scans
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS pr_metadata JSONB DEFAULT NULL;

-- Add scan_id reference to pull_requests for linking PR analysis to scan
ALTER TABLE public.pull_requests ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL;

-- Add findings_posted flag to track if GitHub comments were posted
ALTER TABLE public.pull_requests ADD COLUMN IF NOT EXISTS findings_posted BOOLEAN NOT NULL DEFAULT false;

-- Add findings_summary JSONB for storing analysis breakdown per PR
ALTER TABLE public.pull_requests ADD COLUMN IF NOT EXISTS findings_summary JSONB DEFAULT '{}';

-- Index for looking up PRs by scan
CREATE INDEX IF NOT EXISTS idx_prs_scan ON public.pull_requests(scan_id);

-- Index for looking up open PRs needing analysis
CREATE INDEX IF NOT EXISTS idx_prs_pending_analysis ON public.pull_requests(repository_id, state)
  WHERE state = 'open' AND findings_posted = false;
