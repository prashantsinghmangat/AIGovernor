# CodeGuard AI — API Specification

## Document 3 of 8

---

## API Architecture

- All API routes are Next.js App Router API routes under `src/app/api/`
- Authentication: Supabase JWT tokens (passed via cookie or Authorization header)
- Content-Type: `application/json`
- All responses follow the shape: `{ data: T } | { error: string, code: string }`
- Rate limiting: Upstash Redis (100 req/min per user, 10 req/min for scan triggers)

---

## Auth Endpoints

### POST `/api/auth/callback`
Supabase auth callback handler. Exchanges auth code for session.

### POST `/api/auth/github`
GitHub OAuth callback. After GitHub authorizes, store the GitHub access token.

```typescript
// Request: handled by redirect from GitHub OAuth
// Response: redirect to /onboarding or /dashboard

// Flow:
// 1. User clicks "Connect GitHub" → redirect to GitHub OAuth URL
// 2. GitHub redirects back with ?code=xxx
// 3. Exchange code for access token
// 4. Store encrypted token in users.github_token
// 5. Redirect to onboarding step 2 (select repos)
```

---

## Repository Endpoints

### GET `/api/repositories`
List all repositories for the current company.

```typescript
// Response
{
  data: {
    repositories: Array<{
      id: string;
      name: string;
      full_name: string;
      language: string | null;
      is_active: boolean;
      last_scan_at: string | null;
      last_scan_status: string | null;
      debt_score: number | null;     // From materialized view
      risk_zone: string | null;      // healthy | caution | critical
    }>;
  }
}
```

### POST `/api/repositories`
Add repositories to monitoring (after GitHub connection).

```typescript
// Request
{
  github_repos: Array<{
    github_id: number;
    name: string;
    full_name: string;
    default_branch: string;
    language: string | null;
    is_private: boolean;
  }>;
}

// Response
{
  data: {
    added: number;
    repositories: Array<{ id: string; name: string; }>;
  }
}

// Side effects:
// - Creates webhook on each GitHub repo
// - Queues initial full scan for each repo
```

### DELETE `/api/repositories/[id]`
Remove repository from monitoring.

```typescript
// Side effects:
// - Removes GitHub webhook
// - Sets is_active = false (soft delete, preserves historical data)
```

---

## Scan Endpoints

### POST `/api/scan`
Trigger a governance scan.

```typescript
// Request
{
  repository_id?: string;   // Specific repo (optional, if null = all active repos)
  scan_type: "full" | "incremental";
  scan_from?: string;       // ISO date (default: 30 days ago)
  scan_to?: string;         // ISO date (default: now)
}

// Response
{
  data: {
    scan_ids: string[];     // One per repository being scanned
    message: string;
  }
}

// Rate limit: 10 per minute per company
// Side effects:
// - Creates scan record(s) with status "pending"
// - Enqueues scan job(s) to the job queue
```

### GET `/api/scan/[id]`
Get scan status and results.

```typescript
// Response
{
  data: {
    id: string;
    repository_id: string;
    repository_name: string;
    status: "pending" | "queued" | "running" | "completed" | "failed";
    progress: number;        // 0-100
    summary: {
      total_commits: number;
      total_prs: number;
      total_files_scanned: number;
      total_loc: number;
      ai_loc: number;
      ai_loc_percentage: number;
      ai_prs_detected: number;
      reviewed_ai_prs: number;
      unreviewed_ai_merges: number;
      high_risk_files: number;
      medium_risk_files: number;
      low_risk_files: number;
      scan_duration_seconds: number;
    } | null;
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
  }
}
```

---

## Score Endpoints

### GET `/api/scores`
Get AI Debt Scores.

```typescript
// Query params:
// ?repository_id=xxx   (specific repo, optional)
// ?period=7d|30d|90d   (default: 30d)

// Response
{
  data: {
    current_score: {
      score: number;
      risk_zone: "healthy" | "caution" | "critical";
      change: number;         // vs previous period
      breakdown: {
        ai_loc_ratio: number;
        review_coverage: number;
        refactor_backlog_growth: number;
        prompt_inconsistency: number;
      };
    };
    trend: Array<{
      date: string;
      score: number;
      risk_zone: string;
    }>;
    by_repository: Array<{
      repository_id: string;
      repository_name: string;
      score: number;
      risk_zone: string;
      ai_loc_percentage: number;
      review_coverage: number;
    }>;
  }
}
```

---

## Dashboard Endpoints

### GET `/api/dashboard`
Get all dashboard data in a single call (optimized for initial load).

```typescript
// Response
{
  data: {
    // AI Debt Score
    debt_score: {
      score: number;
      risk_zone: string;
      change: number;
      trend: Array<{ month: string; score: number; }>;
    };
    
    // Key metrics
    metrics: {
      ai_loc_percentage: number;
      ai_loc_change: string;
      review_coverage: number;
      review_change: string;
      unreviewed_merges: number;
      unreviewed_change: string;
      refactor_backlog_growth: number;
    };
    
    // AI usage over time
    ai_usage_trend: Array<{
      week: string;
      ai_loc: number;
      human_loc: number;
    }>;
    
    // Repository risk overview
    repo_risk: Array<{
      repo: string;
      risk_score: number;
      risk_level: string;
      ai_loc: number;
      review_coverage: number;
    }>;
    
    // Recent alerts
    recent_alerts: Array<{
      id: string;
      severity: string;
      title: string;
      time: string;
    }>;
    
    // Metadata
    last_scan: string;
    repos_monitored: number;
  }
}
```

---

## Alert Endpoints

### GET `/api/alerts`
List alerts.

```typescript
// Query params:
// ?status=active|acknowledged|dismissed|resolved  (default: active)
// ?severity=high|medium|low  (optional filter)
// ?page=1&limit=20

// Response
{
  data: {
    alerts: Array<{
      id: string;
      severity: "high" | "medium" | "low";
      category: string;
      title: string;
      description: string;
      status: string;
      repository_name: string | null;
      context: Record<string, unknown>;
      created_at: string;
    }>;
    total: number;
    page: number;
  }
}
```

### PATCH `/api/alerts/[id]`
Update alert status (dismiss, acknowledge, resolve).

```typescript
// Request
{
  status: "acknowledged" | "dismissed" | "resolved";
}

// Response
{ data: { success: true } }

// Side effects:
// - Creates audit log entry
```

---

## Team Endpoints

### GET `/api/team`
Get team metrics.

```typescript
// Query params:
// ?period=current|previous  (default: current week)

// Response
{
  data: {
    adoption_score: number;       // Company-wide 0-100
    members: Array<{
      github_username: string;
      display_name: string;
      avatar_url: string | null;
      ai_usage_level: "high" | "medium" | "low";
      review_quality: "strong" | "moderate" | "weak";
      risk_index: "high" | "medium" | "low";
      governance_score: number;
      total_prs: number;
      ai_prs: number;
      prs_reviewed: number;
      coaching_suggestions: Array<{
        type: string;
        priority: string;
        message: string;
      }>;
    }>;
  }
}
```

---

## Report Endpoints

### GET `/api/reports`
List governance reports.

```typescript
// Query params:
// ?type=weekly|monthly
// ?limit=10

// Response
{
  data: {
    reports: Array<{
      id: string;
      report_type: string;
      period_start: string;
      period_end: string;
      content: {
        ai_usage_summary: { ... };
        risk_summary: { ... };
        technical_debt_signals: string[];
        recommendations: string[];
        team_highlights: { ... };
      };
      pdf_storage_path: string | null;
      created_at: string;
    }>;
  }
}
```

### GET `/api/reports/export`
Export governance report as PDF.

```typescript
// Query params:
// ?report_id=xxx
// ?format=pdf

// Response: PDF binary stream
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="governance-report-2026-02-23.pdf"
```

---

## Integration Endpoints

### GET `/api/integrations`
List all integrations.

```typescript
// Response
{
  data: {
    integrations: Array<{
      id: string;
      provider: string;
      status: "connected" | "disconnected" | "error";
      config: Record<string, unknown>;
      last_synced_at: string | null;
      error_message: string | null;
    }>;
  }
}
```

### PATCH `/api/integrations/[id]`
Update integration config (toggle notifications, etc.)

```typescript
// Request
{
  config: {
    weekly_report?: boolean;
    risk_alerts?: boolean;
    merge_warnings?: boolean;
  }
}
```

---

## Webhook Endpoints

### POST `/api/webhooks/github`
Receives GitHub webhook events. **No auth required** — verified via webhook secret.

```typescript
// Headers: x-hub-signature-256, x-github-event, x-github-delivery
// Events handled:
// - push: Queue incremental scan for new commits
// - pull_request: Analyze PR (opened, closed, merged)
// - pull_request_review: Update review coverage
// - installation: Handle GitHub App installation changes

// Implementation:
// 1. Verify webhook signature using HMAC-SHA256
// 2. Look up repository by github_id
// 3. Based on event type, queue appropriate job
// 4. Return 200 immediately (processing is async)
```

### POST `/api/webhooks/stripe`
Receives Stripe webhook events.

```typescript
// Events handled:
// - checkout.session.completed: Activate subscription
// - customer.subscription.updated: Plan changes
// - customer.subscription.deleted: Cancellation
// - invoice.payment_failed: Mark past_due
```

---

## Admin Endpoints (Platform Owner)

### GET `/api/admin`
Platform-wide metrics. Requires user.role = 'platform_admin'.

```typescript
// Response
{
  data: {
    total_companies: number;
    active_subscriptions: number;
    avg_debt_score: number;
    monthly_revenue: number;
    plan_distribution: {
      starter: number;
      growth: number;
      enterprise: number;
    };
    recent_signups: Array<{
      company_name: string;
      plan: string;
      created_at: string;
    }>;
  }
}
```

---

## Error Response Format

All errors follow this format:

```typescript
{
  error: string;          // Human-readable message
  code: string;           // Machine-readable code
  details?: unknown;      // Optional additional context
}

// Error codes:
// AUTH_REQUIRED - No valid session
// FORBIDDEN - Insufficient permissions
// NOT_FOUND - Resource not found
// VALIDATION_ERROR - Invalid request body
// RATE_LIMITED - Too many requests
// SCAN_IN_PROGRESS - Scan already running for this repo
// PLAN_LIMIT - Feature not available on current plan
// GITHUB_ERROR - GitHub API error
// INTERNAL_ERROR - Unexpected server error
```

---

## Rate Limiting Rules

| Endpoint | Limit | Window |
|----------|-------|--------|
| All authenticated endpoints | 100 req | 1 minute |
| POST `/api/scan` | 10 req | 1 minute |
| POST `/api/repositories` | 20 req | 1 minute |
| GET `/api/dashboard` | 60 req | 1 minute |
| Webhook endpoints | No limit | — |

Implementation: Upstash Redis with sliding window algorithm.
