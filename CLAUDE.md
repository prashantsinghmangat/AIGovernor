# CodeGuard AI — Project Context

## Overview
B2B SaaS platform for AI code governance. Helps engineering teams track, score, and manage AI-generated technical debt across repositories. Built with Next.js 16 App Router, Supabase, and TypeScript.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL) with local Docker setup
- **Auth**: Supabase Auth (email/password) + GitHub OAuth
- **Styling**: Tailwind CSS v4 + Radix UI (via shadcn)
- **State**: Zustand (client), TanStack React Query (server)
- **Charts**: Recharts
- **Notifications**: Sonner (toast)
- **Theming**: next-themes (light/dark mode)

## Project Structure
```
src/
├── app/
│   ├── (public)/        # Landing, features, pricing, security, etc. → /
│   ├── (auth)/          # Login, signup, onboarding → /login, /signup, /onboarding
│   ├── (dashboard)/     # All dashboard pages sit inside dashboard/ subfolder
│   │   ├── layout.tsx   # Sidebar + Header wrapper
│   │   └── dashboard/   # → /dashboard/*
│   │       ├── page.tsx             # /dashboard
│   │       ├── ai-debt/             # /dashboard/ai-debt
│   │       ├── adoption/            # /dashboard/adoption  (real data via useTeam hook)
│   │       ├── alerts/              # /dashboard/alerts
│   │       ├── billing/             # /dashboard/billing
│   │       ├── integrations/        # /dashboard/integrations
│   │       ├── prompt-governance/   # /dashboard/prompt-governance
│   │       ├── reports/             # /dashboard/reports
│   │       ├── repositories/        # /dashboard/repositories
│   │       │   └── [id]/           # /dashboard/repositories/[id] (vuln + dep cards)
│   │       ├── roi/                 # /dashboard/roi
│   │       ├── settings/            # /dashboard/settings
│   │       ├── team/                # /dashboard/team  (real data via useTeam hook)
│   │       └── admin/               # /dashboard/admin
│   ├── api/             # API routes
│   │   ├── team/        # GET /api/team — team metrics from team_metrics table
│   │   ├── dashboard/   # GET /api/dashboard — company overview
│   │   ├── scores/      # GET /api/scores — AI debt scores
│   │   └── scan/        # POST /api/scan, GET /api/scan/[id]/results
│   └── layout.tsx       # Root layout (providers, fonts, Toaster)
├── components/
│   ├── ui/              # shadcn primitives (button, card, dialog, etc.)
│   ├── charts/          # Recharts wrappers (score-trend, ai-usage, risk-heatmap)
│   ├── dashboard/       # Sidebar, header, metric-card, gauge-chart, team-member-card
│   ├── public/          # Navbar, footer
│   ├── shared/          # Logo, theme-toggle, loading-spinner
│   └── providers/       # ThemeProvider, SupabaseProvider, QueryProvider
├── hooks/               # Custom hooks (use-auth, use-scan, use-scores, use-team, etc.)
├── lib/
│   ├── supabase/        # client.ts, server.ts, admin.ts, middleware.ts
│   ├── github/          # oauth.ts, client.ts, repos.ts, webhooks.ts, contributors.ts
│   ├── detection/       # AI code detection + vulnerability + dependency scanning
│   ├── scan/            # processor.ts — 11-step scan pipeline
│   ├── scoring/         # ai-debt-score, adoption-score, risk-calculator
│   ├── utils/           # cn, format, encryption, errors, constants
│   └── validators/      # Zod schemas (auth, scan, settings)
├── stores/              # Zustand (onboarding-store, sidebar-store, filter-store)
├── types/               # TypeScript types (database.ts, api.ts, github.ts, etc.)
└── middleware.ts         # Auth middleware (protect /dashboard/*)
```

## Key Architecture Decisions

### Route Groups
- `(public)` — no auth required, includes Navbar + Footer
- `(auth)` — login/signup/onboarding layout
- `(dashboard)` — requires auth, Sidebar + Header layout
- Dashboard sub-pages MUST be under `(dashboard)/dashboard/` to get `/dashboard/*` URLs

### Supabase Patterns
- **Server client** (`createServerSupabase`) — for authenticated user-scoped queries (respects RLS)
- **Admin client** (`createAdminSupabase`) — bypasses RLS, used for:
  - Signup (creating company + user profile)
  - Saving repositories during onboarding
  - Webhook handlers
- **RLS is enabled** on all tables. INSERT/UPDATE/DELETE on sensitive tables requires `is_company_admin()` (role = 'owner' or 'admin')
- **Database types** in `src/types/database.ts` require `Relationships: []` on every table (supabase-js v2.97.0 requirement)

### GitHub OAuth Flow
1. Client calls `GET /api/auth/github/connect` → returns GitHub OAuth URL
2. User authorizes on GitHub → redirected to `GET /api/auth/github?code=...`
3. Callback exchanges code for token, encrypts it, saves to `users.github_token`
4. Redirects to `/onboarding?step=2`
5. Onboarding fetches repos via `GET /api/github/repos` (decrypts stored token)
6. Selected repos saved via `POST /api/repositories` (admin client, bypasses RLS)

### GitHub API Usage in Scans
- `octokit.repos.listCommits` — fetch recent commits (contributors, HEAD SHA)
- `octokit.git.getTree` — fetch file tree (recursive)
- `octokit.repos.getContent` — fetch file contents + `package.json`
- `octokit.repos.listCommits({ path })` — file-level blame for AI attribution (capped at 20 calls)

### Theming
- CSS variables in `globals.css`: `:root` (light) and `.dark` (dark)
- Use semantic classes: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`
- Accent colors: `text-blue-600 dark:text-blue-400`

## Commands
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx supabase start   # Start local Supabase (Docker required)
npx supabase stop    # Stop Supabase containers
npx supabase db reset # Re-run all 19 migrations
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY` — must be 64-char hex string (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`

## Database
19 migrations in `supabase/migrations/`:
- Tables: companies, users, repositories, scans, scan_results, ai_debt_scores, pull_requests, alerts, team_metrics, integrations, audit_logs, governance_reports
- RLS enabled on all tables with helper functions: `get_user_company_id()`, `is_company_admin()`
- Materialized views, indexes, seed data included

## Scan Pipeline (`src/lib/scan/processor.ts`)
The `processPendingScan()` function runs an 11-step scan pipeline:
1. Fail stale scans (pending/running > 10 min)
2. Claim next pending scan from DB
3. Get GitHub token + fetch recent commits (HEAD SHA, commit metadata)
4. Fetch file tree from default branch
5. Fetch & analyze each file (AI detection + vulnerability detection)
5b. Fetch `package.json` and scan dependencies for known vulnerabilities
6. Insert scan_results in batches (25/batch, with fallback single-insert)
7. Calculate AI Debt Score (per-repo + company-wide aggregate)
8. Generate alerts (AI LOC, debt score, code vulnerabilities, dependency vulnerabilities)
9. Update scan as completed with full summary (JSONB)
10. Update repository `last_scan_at` fields
11. **Analyze contributors** from Git commit history → upsert `team_metrics`

### Detection Modules
- **AI Code Detection** (`lib/detection/combined-scorer.ts`) — multi-signal AI code classifier
- **Vulnerability Detector** (`lib/detection/vulnerability-detector.ts`) — 50 regex rules across 15+ categories (XSS, SQLi, command injection, SSRF, path traversal, prototype pollution, hardcoded secrets, production readiness, etc.)
- **Dependency Scanner** (`lib/detection/dependency-scanner.ts`) — built-in advisory DB of 45 known vulnerable npm packages with CVE/GHSA references; custom semver comparator (no external dependency)

### Contributor Analysis (`lib/github/contributors.ts`)
- Fetches last 30 days of commits (up to 100) to identify contributors
- Uses GitHub login, falls back to commit author email/name
- For top 20 AI-detected files, fetches last committer (file-level attribution)
- Remaining AI LOC distributed proportionally by commit share
- Derives: `ai_usage_level`, `governance_score`, `risk_index`, `review_quality`, `coaching_suggestions`
- Results upserted to `team_metrics` table (keyed by company + username + week period)

### Data Flow: Git Commits → Team Members
```
Scan Triggered → Analyze Files → Fetch Git Commits → Identify Contributors
→ Attribute AI Code → Derive Metrics → Upsert team_metrics
→ /api/team returns real data → Team & Adoption pages display it
```

## Common Gotchas
- `useSearchParams()` must be wrapped in `<Suspense>` for static pages (Next.js 16)
- Route groups `(parentheses)` do NOT create URL segments — pages must be nested inside an actual folder for the URL prefix
- Supabase types require `Relationships`, `Views`, `Enums`, `CompositeTypes` keys
- Server-side writes that need to bypass RLS must use `createAdminSupabase()` from `@/lib/supabase/admin`
- `ENCRYPTION_KEY` must be valid hex — placeholder values cause `encrypt()` to throw
