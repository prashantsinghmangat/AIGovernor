# CodeGuard AI — Background Jobs & Workers

## Document 7 of 8

---

## Job Types

| Job | Trigger | Frequency | Priority |
|-----|---------|-----------|----------|
| `full_scan` | User clicks "Run Scan" or onboarding | On-demand | High |
| `incremental_scan` | GitHub push webhook | Per push event | Medium |
| `pr_analysis` | GitHub PR webhook | Per PR event | Medium |
| `calculate_scores` | After any scan completes | Post-scan | High |
| `generate_alerts` | After score calculation | Post-score | Medium |
| `weekly_report` | Cron: Monday 2 AM | Weekly | Low |
| `refresh_views` | Cron: every 15 min | Periodic | Low |
| `send_slack_digest` | Cron: Monday 9 AM | Weekly | Low |

---

## Phase 1: pg_cron + Edge Functions (Free Tier)

### Scan Queue Table

```sql
CREATE TABLE public.scan_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  repository_id UUID NOT NULL REFERENCES repositories(id),
  scan_type   TEXT NOT NULL DEFAULT 'full',
  priority    INT NOT NULL DEFAULT 5,   -- 1=highest, 10=lowest
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
```

### Supabase Edge Function: Poll & Process

```typescript
// supabase/functions/scan-repository/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Claim next pending job (atomic)
  const { data: job } = await supabase.rpc('claim_next_scan_job');
  if (!job) return new Response('No jobs', { status: 200 });

  try {
    // 2. Get repo details and GitHub token
    const { data: repo } = await supabase
      .from('repositories').select('*, company:companies(*)').eq('id', job.repository_id).single();

    const { data: user } = await supabase
      .from('users').select('github_token')
      .eq('company_id', job.company_id).eq('role', 'owner').single();

    // 3. Run the scan (calls GitHub API, detection engine)
    // ... scanning logic from Document 5 ...

    // 4. Store results
    // 5. Calculate scores
    // 6. Generate alerts if needed

    // 7. Mark job complete
    await supabase.from('scan_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);

  } catch (error) {
    await supabase.from('scan_queue')
      .update({ status: job.attempts >= job.max_attempts ? 'failed' : 'pending', error: error.message, attempts: job.attempts + 1 })
      .eq('id', job.id);
  }

  return new Response('OK', { status: 200 });
});
```

### Atomic Job Claiming (Prevents Double Processing)

```sql
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
```

### pg_cron Schedules

```sql
-- Invoke scan edge function every 30 seconds
SELECT cron.schedule('process-scan-queue', '*/1 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/scan-repository',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  )$$
);

-- Weekly report generation: Monday 2 AM UTC
SELECT cron.schedule('weekly-reports', '0 2 * * 1',
  $$SELECT net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/generate-report',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  )$$
);

-- Refresh materialized views every 15 minutes
SELECT cron.schedule('refresh-views', '*/15 * * * *',
  $$SELECT public.refresh_dashboard_views()$$
);

-- Auto-scan active repos daily at 3 AM UTC
SELECT cron.schedule('daily-auto-scan', '0 3 * * *',
  $$INSERT INTO scan_queue (company_id, repository_id, scan_type, priority)
    SELECT r.company_id, r.id, 'incremental', 7
    FROM repositories r
    JOIN companies c ON c.id = r.company_id
    WHERE r.is_active = true
      AND (c.settings->>'auto_scan_enabled')::boolean = true$$
);
```

---

## Phase 2: BullMQ + Redis (Scale)

Migrate when you have 50+ companies. The API layer changes minimally — instead of inserting into `scan_queue` table, you call `scanQueue.add()`.

### Setup

```typescript
// lib/queue/connection.ts
import { Redis } from 'ioredis';

export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

```typescript
// lib/queue/scan-queue.ts
import { Queue } from 'bullmq';
import { redis } from './connection';

export const scanQueue = new Queue('repository-scans', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 },    // Keep completed for 24h
    removeOnFail: { age: 7 * 86400 },    // Keep failed for 7d
  },
});

// Add scan job
export async function enqueueScan(
  companyId: string,
  repositoryId: string,
  scanType: 'full' | 'incremental',
) {
  return scanQueue.add('scan', {
    companyId, repositoryId, scanType,
    queuedAt: new Date().toISOString(),
  }, {
    priority: scanType === 'full' ? 1 : 5,
    jobId: `scan-${repositoryId}-${Date.now()}`,
  });
}
```

### Worker (runs on Railway/Fly.io)

```typescript
// workers/scan-worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/queue/connection';
import { scanRepository } from '../lib/github/commits';
import { calculateAIDebtScore } from '../lib/scoring/ai-debt-score';
import { createAdminSupabase } from '../lib/supabase/admin';

const worker = new Worker('repository-scans', async (job: Job) => {
  const { companyId, repositoryId, scanType } = job.data;
  const supabase = createAdminSupabase();

  // 1. Create scan record
  const { data: scan } = await supabase.from('scans').insert({
    company_id: companyId,
    repository_id: repositoryId,
    scan_type: scanType,
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single();

  try {
    // 2. Get GitHub token
    const { data: user } = await supabase
      .from('users').select('github_token')
      .eq('company_id', companyId).limit(1).single();

    const { data: repo } = await supabase
      .from('repositories').select('full_name')
      .eq('id', repositoryId).single();

    // 3. Run scan with progress updates
    const scanFrom = new Date();
    scanFrom.setDate(scanFrom.getDate() - 30);

    const results = await scanRepository(
      decrypt(user.github_token),
      repo.full_name,
      scanFrom,
      new Date(),
      async (pct) => {
        await job.updateProgress(pct);
        await supabase.from('scans').update({ progress: pct }).eq('id', scan.id);
      }
    );

    // 4. Store file-level results
    if (results.file_results.length > 0) {
      await supabase.from('scan_results').insert(
        results.file_results.map(f => ({
          scan_id: scan.id,
          company_id: companyId,
          repository_id: repositoryId,
          ...f,
        }))
      );
    }

    // 5. Store PR results
    for (const pr of results.pr_results) {
      await supabase.from('pull_requests').upsert({
        company_id: companyId,
        repository_id: repositoryId,
        ...pr,
      }, { onConflict: 'repository_id,github_pr_id' });
    }

    // 6. Update scan as completed
    const { file_results, pr_results, ...summary } = results;
    await supabase.from('scans').update({
      status: 'completed',
      progress: 100,
      summary,
      completed_at: new Date().toISOString(),
    }).eq('id', scan.id);

    // 7. Recalculate AI Debt Score
    await supabase.rpc('calculate_ai_debt_score', {
      p_company_id: companyId,
      p_repository_id: repositoryId,
    });

    // Also recalculate company-wide score
    await supabase.rpc('calculate_ai_debt_score', {
      p_company_id: companyId,
    });

    // 8. Generate alerts
    await generateAlerts(supabase, companyId, repositoryId, results, summary);

    return { scanId: scan.id, summary };

  } catch (error) {
    await supabase.from('scans').update({
      status: 'failed',
      error_message: (error as Error).message,
    }).eq('id', scan.id);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5,
  limiter: { max: 10, duration: 60000 },  // Max 10 jobs per minute
});

worker.on('completed', (job) => {
  console.log(`Scan ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Scan ${job?.id} failed:`, err.message);
});
```

### Alert Generation

```typescript
async function generateAlerts(supabase, companyId, repositoryId, results, summary) {
  const alerts = [];
  const { data: settings } = await supabase
    .from('companies').select('settings').eq('id', companyId).single();
  const threshold = settings.settings.risk_threshold || 60;

  // High AI LOC alert
  if (summary.ai_loc_percentage > 50) {
    alerts.push({
      company_id: companyId,
      repository_id: repositoryId,
      severity: 'high',
      category: 'ai_debt',
      title: `High AI-generated code detected (${summary.ai_loc_percentage}%)`,
      description: `Repository has ${summary.ai_loc_percentage}% AI-generated lines of code, which exceeds the recommended threshold.`,
    });
  }

  // Low review coverage alert
  const reviewPct = summary.ai_prs_detected > 0
    ? Math.round((summary.reviewed_ai_prs / summary.ai_prs_detected) * 100)
    : 100;
  if (reviewPct < 50) {
    alerts.push({
      company_id: companyId,
      repository_id: repositoryId,
      severity: 'high',
      category: 'review_coverage',
      title: `Low human review coverage (${reviewPct}%)`,
      description: `Only ${reviewPct}% of AI-generated PRs received human review. ${summary.unreviewed_ai_merges} unreviewed AI merges detected.`,
    });
  }

  // Unreviewed merges alert
  if (summary.unreviewed_ai_merges > 3) {
    alerts.push({
      company_id: companyId,
      repository_id: repositoryId,
      severity: 'medium',
      category: 'unreviewed_merge',
      title: `${summary.unreviewed_ai_merges} unreviewed AI merges`,
      description: `Multiple AI-generated pull requests were merged without human review this period.`,
    });
  }

  if (alerts.length > 0) {
    await supabase.from('alerts').insert(alerts);
  }
}
```

---

## Weekly Report Generation

```typescript
// supabase/functions/generate-report/index.ts

async function generateWeeklyReport(supabase, companyId) {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  // Gather all metrics for the week
  const [scores, prs, alerts, teamMetrics] = await Promise.all([
    supabase.from('ai_debt_scores').select('*')
      .eq('company_id', companyId).gte('calculated_at', periodStart.toISOString())
      .order('calculated_at', { ascending: false }),
    supabase.from('pull_requests').select('*')
      .eq('company_id', companyId).gte('pr_merged_at', periodStart.toISOString()),
    supabase.from('alerts').select('*')
      .eq('company_id', companyId).gte('created_at', periodStart.toISOString()),
    supabase.from('team_metrics').select('*')
      .eq('company_id', companyId).order('period_end', { ascending: false }).limit(10),
  ]);

  // Build report content
  const latestScore = scores.data?.[0];
  const aiPRs = prs.data?.filter(pr => pr.ai_generated) || [];
  const reviewedAIPRs = aiPRs.filter(pr => pr.human_reviewed);

  const content = {
    ai_usage_summary: {
      ai_loc_percentage: latestScore?.breakdown?.ai_loc_ratio * 100 || 0,
      ai_prs_total: aiPRs.length,
      reviewed_percentage: aiPRs.length > 0
        ? Math.round((reviewedAIPRs.length / aiPRs.length) * 100) : 100,
    },
    risk_summary: {
      debt_score: latestScore?.score || 0,
      risk_zone: latestScore?.risk_zone || 'unknown',
      new_alerts: alerts.data?.length || 0,
      high_severity_alerts: alerts.data?.filter(a => a.severity === 'high').length || 0,
    },
    technical_debt_signals: generateDebtSignals(scores.data, prs.data),
    recommendations: generateRecommendations(latestScore, aiPRs, reviewedAIPRs, teamMetrics.data),
  };

  // Store report
  await supabase.from('governance_reports').insert({
    company_id: companyId,
    report_type: 'weekly',
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    content,
    status: 'generated',
  });
}
```
