# CodeGuard AI — Environment & Deployment

## Document 8 of 8

---

## Environment Variables

### `.env.example`

```bash
# ============================================
# CodeGuard AI — Environment Variables
# ============================================
# Copy to .env.local and fill in values

# ---- App ----
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CodeGuard AI
NODE_ENV=development

# ---- Supabase ----
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# ---- GitHub OAuth ----
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# ---- Encryption ----
ENCRYPTION_KEY=generate-a-32-byte-hex-key    # For encrypting GitHub tokens

# ---- Upstash Redis (optional, for rate limiting + cache) ----
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ---- Resend (email) ----
RESEND_API_KEY=

# ---- Stripe (billing — Phase 4+) ----
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ---- ML Service (Phase 4+) ----
ML_SERVICE_URL=

# ---- Sentry (monitoring) ----
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Vercel Deployment

### `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "regions": ["bom1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ],
  "crons": [
    {
      "path": "/api/cron/refresh-views",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 2 * * 1"
    }
  ]
}
```

### Deployment Steps

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project
vercel link

# 3. Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add ENCRYPTION_KEY
# ... add all env vars

# 4. Deploy
vercel --prod
```

---

## Supabase Production Setup

```bash
# 1. Create Supabase project at supabase.com
# 2. Link local project
npx supabase link --project-ref your-project-ref

# 3. Push migrations
npx supabase db push

# 4. Generate types
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts

# 5. Deploy Edge Functions
npx supabase functions deploy scan-repository
npx supabase functions deploy calculate-scores
npx supabase functions deploy generate-report
npx supabase functions deploy process-webhook

# 6. Enable pg_cron via Supabase Dashboard → Database → Extensions
# 7. Enable pg_net for HTTP calls from pg_cron
# 8. Set secrets for Edge Functions
npx supabase secrets set GITHUB_CLIENT_SECRET=xxx
npx supabase secrets set ENCRYPTION_KEY=xxx
```

---

## CI/CD — GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  migrate:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Local Development

```bash
# 1. Clone repo
git clone https://github.com/your-org/codeguard-ai.git
cd codeguard-ai

# 2. Install dependencies
npm install

# 3. Start Supabase locally
npx supabase start
# Note the output: API URL, anon key, service_role key

# 4. Copy env
cp .env.example .env.local
# Fill in values from supabase start output

# 5. Run migrations
npx supabase db reset   # Runs all migrations + seed

# 6. Generate types
npx supabase gen types typescript --local > src/types/database.ts

# 7. Start dev server
npm run dev

# App running at http://localhost:3000
# Supabase Studio at http://127.0.0.1:54323
```

---

## Monitoring & Observability

### Sentry Setup

```typescript
// next.config.ts (add Sentry plugin)
import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(nextConfig, {
  org: 'codeguard-ai',
  project: 'web',
  silent: true,
});
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
});
```

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | Vercel Analytics | > 2s |
| Scan job failure rate | Sentry + DB | > 10% |
| GitHub API rate limit usage | Custom logging | > 80% consumed |
| Database connection pool | Supabase Dashboard | > 80% utilization |
| Edge Function cold starts | Supabase Dashboard | > 1s average |
| Error rate | Sentry | > 1% of requests |

---

## Security Checklist

- [ ] All env vars in Vercel/Supabase secrets (never in code)
- [ ] GitHub tokens encrypted at rest (AES-256)
- [ ] RLS enabled on ALL tables
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] CORS configured (only allow app domain)
- [ ] Rate limiting on all API endpoints
- [ ] Input validation with Zod on every endpoint
- [ ] CSP headers configured
- [ ] Supabase service role key NEVER exposed to client
- [ ] Audit logging for admin actions
- [ ] Regular dependency updates (Dependabot)

---

## Cost Tracking

### Free Tier Limits to Watch

| Service | Limit | Current Usage | Alert At |
|---------|-------|---------------|----------|
| Vercel | 100GB bandwidth | Check dashboard | 80GB |
| Supabase DB | 500MB | Check dashboard | 400MB |
| Supabase Auth | 50K MAU | Check dashboard | 40K |
| Supabase Storage | 1GB | Check dashboard | 800MB |
| Upstash Redis | 10K cmd/day | Check dashboard | 8K |
| GitHub API | 5K req/hour | Log in app | 4K |

### When to Upgrade

| Signal | Action | Monthly Cost |
|--------|--------|-------------|
| DB approaching 500MB | Supabase Pro | $25 |
| Need reliable background jobs | Upstash Pro Redis | $10 |
| Bandwidth > 100GB | Vercel Pro | $20 |
| Need ML inference | Railway / Modal | $5-50 |
| 50+ customers | Add monitoring (Sentry Pro) | $26 |

---

## Claude Code Prompt

Use this prompt to kick off development with Claude Code:

```
I'm building CodeGuard AI, a B2B SaaS AI governance platform.

I have 8 documentation files that specify every aspect of the application:
1. PROJECT-SETUP.md - Tech stack, folder structure, initialization
2. DATABASE-SCHEMA.md - Complete Postgres schema with 18 migrations, RLS, seed data
3. API-SPECIFICATION.md - Every API endpoint with request/response types
4. FRONTEND-SPEC.md - Every page, component, routing, state management
5. GITHUB-INTEGRATION.md - OAuth, scanning pipeline, webhooks
6. AI-DETECTION-ENGINE.md - 3-signal detection system, scoring formulas
7. WORKERS-AND-JOBS.md - Job queue, cron, scan workers, alert generation
8. DEPLOYMENT.md - Environment vars, Vercel, Supabase, CI/CD

Please read all 8 documents, then build the application following this order:
1. Initialize the Next.js project with all dependencies
2. Set up the Supabase schema (all migrations)
3. Build the Supabase client utilities
4. Build the API routes
5. Build the shared components (UI, charts, layouts)
6. Build the public marketing pages
7. Build the auth flow (login, signup, onboarding)
8. Build the dashboard pages
9. Build the GitHub integration
10. Build the detection engine
11. Wire everything together

Use TypeScript strict mode. Follow the exact folder structure from doc 1.
Use shadcn/ui for components. Use Recharts for charts.
Use TanStack Query for data fetching. Use Zustand for client state.
Dark mode by default. Enterprise-grade visual polish.
```
