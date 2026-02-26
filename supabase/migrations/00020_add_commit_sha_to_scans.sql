-- Add commit_sha column to scans table to track which commit each scan ran against
ALTER TABLE public.scans ADD COLUMN commit_sha TEXT;

-- Index for looking up scans by commit
CREATE INDEX idx_scans_commit_sha ON public.scans(commit_sha) WHERE commit_sha IS NOT NULL;
