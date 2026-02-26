# CodeGuard AI — Production Architecture Blueprint

## Start Free → Scale to Enterprise (Without Re-architecting)

---

## TL;DR — The Stack at a Glance

| Layer | Free/MVP | Scale-Up (Paid) |
|---|---|---|
| **Frontend** | Next.js 15 + TypeScript + Tailwind on **Vercel Free** | Same (Vercel Pro $20/mo) |
| **Backend API** | Next.js API Routes + **Supabase Edge Functions** | Migrate heavy routes to **NestJS on Railway/Fly.io** |
| **Database** | **Supabase Postgres** (500MB free) | Supabase Pro ($25/mo) or **Neon** |
| **Auth** | **Supabase Auth** (50K MAU free) | Same (scales with plan) |
| **Job Queue** | **Supabase Edge Functions** + **pg_cron** | **BullMQ + Redis** on Upstash/Railway |
| **Code Scanning Workers** | **GitHub Actions** (free for public repos / 2000 min private) | Dedicated worker containers on **Railway / Fly.io** |
| **AI Detection ML** | **Python microservice** on Railway free tier | Scale on **Modal / RunPod / Fly Machines** |
| **File Storage** | **Supabase Storage** (1GB free) | Supabase Pro or S3 |
| **Caching** | **Upstash Redis** (10K commands/day free) | Upstash Pro or self-hosted Redis |
| **Real-time** | **Supabase Realtime** (built-in) | Same |
| **Monitoring** | **Sentry Free** + **Vercel Analytics** | Datadog / Grafana Cloud |
| **CI/CD** | **GitHub Actions** | Same |

**Monthly cost at MVP: $0**
**Monthly cost at 50 paying customers: ~$50–80**
**Monthly cost at 500 customers: ~$200–400**

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        USERS (Browser)                           │
│                   CTOs / VP Eng / Tech Leads                     │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                              │
│  Next.js 15 · TypeScript · TailwindCSS · Recharts · shadcn/ui   │
│  SSR for public pages · CSR for dashboard · ISR for reports      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API LAYER                                     │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Next.js API      │  │ Supabase Edge    │  │ Supabase       │  │
│  │ Routes           │  │ Functions        │  │ Auto-generated │  │
│  │ (Complex logic)  │  │ (Webhooks,       │  │ REST/GraphQL   │  │
│  │                  │  │  Cron, Async)    │  │ (CRUD)         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                     │                     │           │
│           └─────────────────────┼─────────────────────┘           │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
┌───────────────────────┐ ┌──────────────┐ ┌────────────────────┐
│   SUPABASE POSTGRES   │ │ UPSTASH      │ │  SUPABASE STORAGE  │
│                       │ │ REDIS        │ │                    │
│ • Companies           │ │              │ │ • PDF Reports      │
│ • Users               │ │ • Cache      │ │ • Scan Artifacts   │
│ • Repositories        │ │ • Rate Limit │ │ • Exports          │
│ • Scan Results        │ │ • Job Queue  │ │                    │
│ • AI Metrics          │ │   (BullMQ)   │ │                    │
│ • Alerts              │ │              │ │                    │
│ • Billing             │ │              │ │                    │
│ • Audit Logs          │ │              │ │                    │
│                       │ │              │ │                    │
│ + RLS (Row Security)  │ │              │ │                    │
│ + pg_cron (scheduled) │ │              │ │                    │
└───────────┬───────────┘ └──────────────┘ └────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    WORKER SERVICES                                │
│                                                                   │
│  ┌───────────────────────┐    ┌────────────────────────────────┐ │
│  │  GITHUB SCAN WORKER   │    │   AI DETECTION ML SERVICE      │ │
│  │  (TypeScript/Node.js) │    │   (Python)                     │ │
│  │                       │    │                                │ │
│  │  • GitHub API v4      │    │  • CodeBERT / Custom Model     │ │
│  │    (GraphQL)          │    │  • AST Pattern Analysis        │ │
│  │  • Fetch commits,     │    │  • Token Probability Scoring   │ │
│  │    PRs, diffs         │    │  • Style Fingerprinting        │ │
│  │  • Copilot metadata   │    │  • Naming Convention Analysis  │ │
│  │    detection          │    │  • Comment Pattern Detection   │ │
│  │  • File-level         │    │                                │ │
│  │    scanning           │    │  Hosted on:                    │ │
│  │                       │    │  Railway Free → Fly Machines   │ │
│  │  Hosted on:           │    │                                │ │
│  │  GitHub Actions →     │    │                                │ │
│  │  Railway/Fly.io       │    │                                │ │
│  └───────────┬───────────┘    └──────────────┬─────────────────┘ │
│              │                                │                   │
│              └────────────┬───────────────────┘                   │
│                           ▼                                       │
│              ┌────────────────────────┐                           │
│              │   SCORING ENGINE       │                           │
│              │                        │                           │
│              │  AI Debt Score =       │                           │
│              │  f(AI_LOC, Review,     │                           │
│              │    Refactor, Prompts)  │                           │
│              │                        │                           │
│              │  Runs as Supabase      │                           │
│              │  Edge Function or      │                           │
│              │  Next.js API Route     │                           │
│              └────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                          │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐ │
│  │ GitHub   │ │ Slack    │ │ Jira     │ │Claude │ │ OpenAI   │ │
│  │ API v4   │ │ Webhooks │ │ API      │ │ API   │ │ API      │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────┘ └──────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Layer Breakdown

---

### 1. Frontend — Next.js 15 on Vercel

**Why Next.js:**
- Server-side rendering for SEO on public/marketing pages
- Client-side rendering for the dashboard (fast, interactive)
- API routes to handle lightweight backend logic without a separate server
- TypeScript for type safety across a complex data model
- Deploys instantly on Vercel's free tier

**Key Libraries:**

| Purpose | Library | Why |
|---|---|---|
| UI Components | **shadcn/ui** | Customizable, accessible, works with Tailwind |
| Charts | **Recharts** | Lightweight, React-native, good for dashboards |
| State Management | **Zustand** | Simple, no boilerplate, scales well |
| Data Fetching | **TanStack Query (React Query)** | Caching, refetching, pagination |
| Forms | **React Hook Form + Zod** | Validation, type-safe |
| Tables | **TanStack Table** | Sorting, filtering, pagination |
| PDF Export | **@react-pdf/renderer** | Client-side PDF generation |
| Date Handling | **date-fns** | Lightweight, tree-shakeable |

**Folder Structure:**

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/           # Marketing pages (SSR)
│   │   ├── page.tsx        # Landing
│   │   ├── features/
│   │   ├── pricing/
│   │   ├── security/
│   │   └── governance-guide/
│   ├── (auth)/             # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── onboarding/
│   ├── (dashboard)/        # Protected dashboard (CSR)
│   │   ├── layout.tsx      # Sidebar + Header
│   │   ├── page.tsx        # Main Dashboard
│   │   ├── ai-debt/
│   │   ├── adoption/
│   │   ├── reports/
│   │   ├── repositories/
│   │   ├── team/
│   │   ├── roi/
│   │   ├── alerts/
│   │   ├── integrations/
│   │   ├── settings/
│   │   └── admin/
│   └── api/                # API Routes
│       ├── scan/
│       ├── webhooks/
│       │   ├── github/
│       │   └── stripe/
│       ├── reports/
│       └── export/
├── components/
│   ├── ui/                 # shadcn components
│   ├── dashboard/          # Dashboard-specific
│   ├── charts/             # Chart wrappers
│   └── shared/             # Common components
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── github/             # GitHub API helpers
│   ├── scoring/            # AI debt calculation
│   └── utils/
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
└── stores/                 # Zustand stores
```

---

### 2. Database — Supabase Postgres

**Why Supabase Postgres (not Firebase, not MongoDB):**
- Relational data model fits governance metrics perfectly (companies → repos → scans → metrics)
- Row-Level Security (RLS) means multi-tenant isolation at the database level — critical for SaaS
- Built-in auth, real-time subscriptions, storage, and edge functions — one platform
- PostgreSQL scales vertically to massive sizes before you ever need horizontal sharding
- Free tier: 500MB database, 50K MAU auth, 1GB storage

**Database Schema (Core Tables):**

```sql
-- Multi-tenant: every table has company_id with RLS

CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  plan            TEXT DEFAULT 'starter',  -- starter | growth | enterprise
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id      UUID REFERENCES companies(id),
  role            TEXT NOT NULL,  -- admin | member | viewer
  email           TEXT NOT NULL,
  full_name       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  github_id       BIGINT,
  name            TEXT NOT NULL,
  full_name       TEXT NOT NULL,       -- "org/repo"
  default_branch  TEXT DEFAULT 'main',
  is_active       BOOLEAN DEFAULT true,
  last_scan_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  repository_id   UUID REFERENCES repositories(id),
  status          TEXT DEFAULT 'pending',  -- pending | running | completed | failed
  scan_type       TEXT DEFAULT 'full',     -- full | incremental
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  summary         JSONB,  -- {total_files, ai_files, total_loc, ai_loc, ...}
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scan_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID REFERENCES scans(id),
  file_path       TEXT NOT NULL,
  ai_probability  FLOAT,       -- 0.0 to 1.0
  ai_loc          INT,
  total_loc       INT,
  risk_level      TEXT,        -- high | medium | low
  detection_signals JSONB,     -- {naming: 0.8, comments: 0.6, ...}
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_debt_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  repository_id   UUID REFERENCES repositories(id),  -- NULL = company-wide
  score           INT NOT NULL,    -- 0-100
  breakdown       JSONB,           -- {ai_loc_ratio, review_coverage, ...}
  calculated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  repository_id   UUID REFERENCES repositories(id),
  github_pr_id    BIGINT,
  title           TEXT,
  author          TEXT,
  ai_generated    BOOLEAN DEFAULT false,
  ai_loc_added    INT DEFAULT 0,
  human_reviewed  BOOLEAN DEFAULT false,
  merged_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  repository_id   UUID REFERENCES repositories(id),
  severity        TEXT NOT NULL,  -- high | medium | low
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'active',  -- active | dismissed | resolved
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  user_email      TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  ai_usage_level  TEXT,
  review_quality  TEXT,
  risk_index      TEXT,
  score           INT,
  prs_total       INT,
  prs_ai          INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (CRITICAL for multi-tenant)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
-- ... enable on ALL tables

-- Example RLS Policy
CREATE POLICY "Users see own company data" ON repositories
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

**Why this schema is upgrade-proof:**
- JSONB columns (settings, summary, breakdown, detection_signals) allow schema evolution without migrations
- UUID primary keys work across distributed systems if you ever shard
- RLS means you never accidentally leak data between companies
- Indexes on (company_id, repository_id) keep queries fast as data grows

---

### 3. GitHub Integration — How the Scanning Actually Works

This is the core of CodeGuard AI. Here's the real pipeline:

**Step 1: OAuth + Repository Selection**

```
User → GitHub OAuth (scope: repo, read:org)
     → Supabase stores GitHub access token (encrypted)
     → Fetch user's repos via GitHub API
     → User selects repos to monitor
     → Store in `repositories` table
```

**Step 2: Initial Scan (Last 30 Days)**

```
Trigger: User clicks "Start Scan" after onboarding

Job Queue (BullMQ/pg_cron) picks up scan job
    │
    ▼
GitHub Scan Worker:
    │
    ├── 1. Fetch all commits in last 30 days
    │      GET /repos/{owner}/{repo}/commits?since=30d_ago
    │
    ├── 2. Fetch all PRs merged in last 30 days
    │      GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated
    │
    ├── 3. For each commit, fetch the diff
    │      GET /repos/{owner}/{repo}/commits/{sha}
    │      (includes files changed, patch/diff data)
    │
    ├── 4. Detect Copilot/AI metadata
    │      • Check commit messages for AI patterns
    │      • Check for Copilot commit trailer
    │      • Check PR descriptions for AI tool mentions
    │
    ├── 5. For files with AI signals → send to ML Service
    │      POST /api/detect  {code: "...", language: "typescript"}
    │
    ├── 6. Store results in scan_results table
    │
    ├── 7. Calculate AI Debt Score
    │      Score = 100 - (w1×AI_LOC + w2×(1-Review) + w3×Refactor + w4×Prompt)
    │
    └── 8. Generate alerts if thresholds exceeded
```

**Step 3: Ongoing Monitoring (Webhooks)**

```
GitHub Webhook → POST /api/webhooks/github
    │
    ├── Event: push
    │   → Queue incremental scan for new commits
    │
    ├── Event: pull_request (opened/merged)
    │   → Analyze PR for AI-generated code
    │   → Check if human review occurred
    │   → Update pull_requests table
    │
    └── Event: pull_request_review
        → Update review coverage metrics
```

**GitHub API Rate Limits & How to Handle:**

| Tier | Rate Limit | Strategy |
|---|---|---|
| Free (OAuth) | 5,000 requests/hour | Queue + batch requests |
| GitHub App | 5,000 requests/hour/installation | Better for orgs |
| GraphQL | 5,000 points/hour | Use GraphQL to batch (1 query = multiple REST calls) |

**Recommendation:** Start with OAuth, move to a GitHub App when you have 20+ customers. GitHub Apps get per-installation rate limits, so they scale better.

---

### 4. AI Code Detection — The ML Pipeline

This is where the actual "AI detection" happens. Multiple signals are combined:

**Signal 1: Metadata-Based Detection (Easy, Free, High Precision)**

```python
# Check for known AI tool signatures
AI_COMMIT_PATTERNS = [
    r"copilot",
    r"generated by (claude|chatgpt|gpt|openai|copilot|cursor|codeium)",
    r"AI-assisted",
    r"auto-generated",
    r"\[ai\]",
]

AI_PR_PATTERNS = [
    r"co-authored-by:.*copilot",
    r"generated (with|using|by) (ai|claude|chatgpt)",
]

def check_metadata(commit_message, pr_description):
    """Fast check - no ML needed"""
    for pattern in AI_COMMIT_PATTERNS:
        if re.search(pattern, commit_message, re.IGNORECASE):
            return True, "metadata_match"
    return False, None
```

**Signal 2: Style/Pattern Analysis (Medium, No ML Model Needed)**

```python
def analyze_code_style(code: str, language: str) -> dict:
    """Heuristic analysis of AI code patterns"""
    signals = {}

    # AI tends to use verbose, descriptive variable names
    identifiers = extract_identifiers(code)
    avg_name_length = sum(len(n) for n in identifiers) / max(len(identifiers), 1)
    signals["naming_verbosity"] = min(avg_name_length / 20, 1.0)

    # AI generates very uniform comment styles
    comments = extract_comments(code)
    comment_uniformity = calculate_uniformity(comments)
    signals["comment_uniformity"] = comment_uniformity

    # AI rarely makes typos in comments
    signals["typo_absence"] = 1.0 - count_typos(comments) / max(len(comments), 1)

    # AI generates very consistent indentation
    signals["indent_consistency"] = measure_indent_consistency(code)

    # AI tends to add boilerplate error handling
    signals["error_handling_ratio"] = count_try_catch(code) / max(count_functions(code), 1)

    return signals
```

**Signal 3: ML Classification (Advanced, Use When Ready)**

```python
# Using a fine-tuned CodeBERT model
# Can run on CPU — no GPU needed for inference

from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class AICodeDetector:
    def __init__(self):
        # Use a pre-trained code classification model
        # Options: CodeBERT, GraphCodeBERT, UniXcoder
        self.tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "./fine-tuned-ai-detector"  # Your fine-tuned model
        )

    def predict(self, code_snippet: str) -> float:
        """Returns probability that code is AI-generated (0.0 to 1.0)"""
        inputs = self.tokenizer(
            code_snippet,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            return probs[0][1].item()  # P(AI-generated)
```

**Combined Scoring (What Actually Ships):**

```python
def calculate_ai_probability(code, commit_msg, pr_desc, language):
    """Combine all signals into final AI probability"""

    # Signal 1: Metadata (weight: 0.4 if found, 0.0 if not)
    metadata_match, _ = check_metadata(commit_msg, pr_desc)

    # Signal 2: Style analysis (weight: 0.3)
    style_signals = analyze_code_style(code, language)
    style_score = sum(style_signals.values()) / len(style_signals)

    # Signal 3: ML model (weight: 0.3)
    ml_score = detector.predict(code) if len(code) > 50 else 0.5

    # Combine
    if metadata_match:
        return min(0.4 + style_score * 0.3 + ml_score * 0.3, 1.0)
    else:
        return style_score * 0.5 + ml_score * 0.5
```

**MVP Strategy:** Ship with Signal 1 + Signal 2 first. Add the ML model in Month 2-3. This gives you 70-80% accuracy from day one without any ML infrastructure.

---

### 5. Job Queue Architecture

**Why you need a queue:** Scanning a repo with 1000 commits takes 2-5 minutes. You can't do this in an HTTP request.

**Phase 1 (Free — pg_cron + Supabase Edge Functions):**

```sql
-- Schedule weekly scans using pg_cron (built into Supabase)
SELECT cron.schedule(
  'weekly-governance-scan',
  '0 2 * * 1',  -- Every Monday at 2 AM
  $$
    INSERT INTO scan_queue (company_id, repository_id, scan_type)
    SELECT c.id, r.id, 'incremental'
    FROM companies c
    JOIN repositories r ON r.company_id = c.id
    WHERE r.is_active = true;
  $$
);
```

A Supabase Edge Function polls the queue table every 30 seconds and processes jobs.

**Phase 2 (Scale — BullMQ + Redis):**

```typescript
// When you outgrow pg_cron (50+ customers)
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.UPSTASH_REDIS_URL);

const scanQueue = new Queue('repository-scans', { connection: redis });

// Add job
await scanQueue.add('scan', {
  companyId: 'xxx',
  repositoryId: 'yyy',
  scanType: 'incremental'
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }
});

// Worker (runs on Railway/Fly.io)
const worker = new Worker('repository-scans', async (job) => {
  const { companyId, repositoryId, scanType } = job.data;
  await performScan(companyId, repositoryId, scanType);
}, {
  connection: redis,
  concurrency: 5  // Process 5 scans in parallel
});
```

**The upgrade path is seamless:** Change the queue producer from a pg_cron INSERT to a BullMQ `.add()` call. The scanning logic stays exactly the same.

---

### 6. Hosting & Deployment

**Free Tier Stack:**

| Service | What | Free Limit |
|---|---|---|
| **Vercel** | Frontend + API routes | 100GB bandwidth, serverless functions |
| **Supabase** | Database + Auth + Storage + Edge Functions + Realtime | 500MB DB, 50K MAU, 1GB storage |
| **Upstash** | Redis (caching + rate limiting) | 10K commands/day |
| **Railway** | Python ML service (when needed) | $5 free credit/month |
| **GitHub Actions** | CI/CD + scan workers | 2000 min/month (private repos) |
| **Sentry** | Error monitoring | 5K events/month |
| **Resend** | Transactional email | 3K emails/month |

**When you upgrade (and what changes):**

| Trigger | Action | Cost |
|---|---|---|
| DB > 500MB | Supabase Pro | $25/mo |
| Need reliable queues | Add Upstash Pro | $10/mo |
| More serverless compute | Vercel Pro | $20/mo |
| ML model needs GPU | Modal or RunPod | Pay-per-use |
| 100+ companies | Move workers to Fly.io | $5-20/mo |

**Nothing gets re-architected.** You just upgrade the individual service tiers.

---

### 7. Scaling Bottlenecks & How to Solve Them

| Bottleneck | When It Hits | Solution |
|---|---|---|
| **GitHub API rate limits** | 10+ companies scanning simultaneously | GitHub App (per-installation limits) + request queuing |
| **Database query speed** | 100K+ scan_results rows | Add indexes on (company_id, scan_id), partition by date |
| **Scan worker throughput** | 50+ repos scanning at once | Scale workers horizontally on Fly.io (auto-scale) |
| **ML inference latency** | Real-time PR analysis | Batch inference, cache results by file hash |
| **Dashboard load time** | Large datasets per company | Pre-compute aggregates, materialized views in Postgres |
| **Real-time alerts** | 1000+ concurrent users | Supabase Realtime handles this natively |
| **PDF report generation** | Many concurrent exports | Queue report generation, serve from storage |

**Database Optimization Strategy:**

```sql
-- Materialized view for dashboard (pre-computed, refreshed hourly)
CREATE MATERIALIZED VIEW company_dashboard_metrics AS
SELECT
  c.id as company_id,
  COUNT(DISTINCT r.id) as repo_count,
  AVG(ads.score) as avg_debt_score,
  SUM(sr.ai_loc)::float / NULLIF(SUM(sr.total_loc), 0) * 100 as ai_loc_percentage,
  COUNT(CASE WHEN pr.human_reviewed THEN 1 END)::float /
    NULLIF(COUNT(pr.id), 0) * 100 as review_coverage
FROM companies c
LEFT JOIN repositories r ON r.company_id = c.id
LEFT JOIN ai_debt_scores ads ON ads.company_id = c.id AND ads.repository_id IS NULL
LEFT JOIN scan_results sr ON sr.scan_id IN (
  SELECT id FROM scans WHERE company_id = c.id
  ORDER BY completed_at DESC LIMIT 1
)
LEFT JOIN pull_requests pr ON pr.company_id = c.id
GROUP BY c.id;

-- Refresh every hour via pg_cron
SELECT cron.schedule('refresh-dashboard', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY company_dashboard_metrics');
```

---

### 8. Security Architecture

| Layer | Implementation |
|---|---|
| **Auth** | Supabase Auth (JWT, supports SSO via SAML for enterprise) |
| **Multi-tenancy** | Row-Level Security on every table — data isolation at DB level |
| **API Security** | Rate limiting (Upstash), input validation (Zod), CORS |
| **GitHub Tokens** | Encrypted at rest in Supabase Vault, scoped to minimum permissions |
| **Data Encryption** | Supabase encrypts at rest (AES-256), TLS 1.3 in transit |
| **Audit Logging** | Every admin action logged to audit_logs table |
| **Secrets** | Environment variables via Vercel/Supabase, never in code |

---

### 9. Build Roadmap (Phased)

**Phase 1 — Week 1-3: Foundation (Cost: $0)**
- Next.js app on Vercel
- Supabase setup (auth, database, RLS)
- GitHub OAuth integration
- Repository listing and selection
- Basic UI with dashboard shell

**Phase 2 — Week 4-6: Core Scanning (Cost: $0)**
- GitHub API integration (fetch commits, PRs, diffs)
- Metadata-based AI detection (Signal 1)
- Style-based heuristic detection (Signal 2)
- AI Debt Score calculation
- Dashboard with real data
- Alert generation

**Phase 3 — Week 7-9: Polish & Reports (Cost: $0)**
- Weekly governance reports
- PDF export
- Slack integration (incoming webhooks)
- Team metrics page
- ROI calculator with real inputs

**Phase 4 — Week 10-12: Scale & ML (Cost: ~$25-50/mo)**
- ML-based code detection (Signal 3)
- GitHub webhook for real-time monitoring
- BullMQ for reliable job processing
- Admin panel for platform management
- Billing via Stripe

**Phase 5 — Month 4+: Enterprise (Cost: scales with customers)**
- SSO/SAML
- On-prem deployment option (Docker)
- Custom integrations API
- Advanced prompt governance
- Jira integration

---

### 10. Key Technical Decisions Summary

| Decision | Choice | Reasoning |
|---|---|---|
| Frontend framework | **Next.js 15** | SSR + CSR, API routes, Vercel deployment |
| Language | **TypeScript everywhere** | Type safety for complex data models |
| Database | **Supabase Postgres** | RLS, real-time, auth, free tier |
| Auth | **Supabase Auth** | Integrated, supports SSO upgrade path |
| AI Detection | **Heuristics first → ML later** | Ship fast, improve accuracy over time |
| Queue | **pg_cron → BullMQ** | Start simple, upgrade without rewrite |
| Hosting | **Vercel + Supabase + Railway** | All have generous free tiers |
| Monitoring | **Sentry + Vercel Analytics** | Free, catches errors early |
| Payments | **Stripe** | Industry standard for SaaS billing |

---

### 11. What NOT to Do

- **Don't build a custom auth system.** Supabase Auth handles JWT, OAuth, SSO.
- **Don't use MongoDB.** Your data is deeply relational. Postgres is the right choice.
- **Don't deploy your own servers initially.** Serverless + managed services = $0 ops cost.
- **Don't build the ML model first.** Heuristics + metadata get you to 70-80% accuracy and ship 10x faster.
- **Don't store GitHub tokens in plain text.** Use Supabase Vault or encrypt them.
- **Don't try to scan every file.** Start with diffs from the last 30 days, then expand.
- **Don't skip RLS.** One leaked customer's data kills the product.

---

*This architecture supports 0 to 10,000+ companies without a major rewrite. The key insight: choose managed services with generous free tiers that have clear paid upgrade paths. You never move off the platform — you just pay more as you grow.*
