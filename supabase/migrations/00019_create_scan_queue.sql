CREATE TABLE public.scan_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  repository_id UUID NOT NULL REFERENCES repositories(id),
  scan_type   TEXT NOT NULL DEFAULT 'full',
  priority    INT NOT NULL DEFAULT 5,
  status      TEXT NOT NULL DEFAULT 'pending',
  attempts    INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_pending ON scan_queue(status, priority, created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.claim_next_scan_job()
RETURNS scan_queue AS $$
DECLARE
  claimed scan_queue;
BEGIN
  UPDATE scan_queue
  SET status = 'running', started_at = now(), attempts = attempts + 1
  WHERE id = (
    SELECT id FROM scan_queue
    WHERE status = 'pending' AND attempts < max_attempts
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed;
  RETURN claimed;
END;
$$ LANGUAGE plpgsql;
