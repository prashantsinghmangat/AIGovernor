# CodeGuard AI — Master Development Guide

## Document Index

This documentation suite contains everything needed to build CodeGuard AI from scratch. Feed these documents to Claude Code in order.

| # | Document | Purpose | File |
|---|----------|---------|------|
| 1 | **This File** | Master overview, project setup, folder structure | `01-PROJECT-SETUP.md` |
| 2 | **Database Schema** | Complete Supabase Postgres schema with RLS, indexes, seeds | `02-DATABASE-SCHEMA.md` |
| 3 | **API Specification** | Every API endpoint, request/response shapes, auth rules | `03-API-SPECIFICATION.md` |
| 4 | **Frontend Pages & Components** | Every page, component tree, props, state, routing | `04-FRONTEND-SPEC.md` |
| 5 | **GitHub Integration** | OAuth flow, scanning pipeline, webhook handlers | `05-GITHUB-INTEGRATION.md` |
| 6 | **AI Detection Engine** | Heuristic + ML detection logic, scoring algorithm | `06-AI-DETECTION-ENGINE.md` |
| 7 | **Background Jobs & Workers** | Queue architecture, cron jobs, scan workers | `07-WORKERS-AND-JOBS.md` |
| 8 | **Environment & Deployment** | All env vars, Vercel/Supabase config, CI/CD | `08-DEPLOYMENT.md` |

---

## 1. Project Identity

**Name:** CodeGuard AI
**Tagline:** "Govern AI Before It Governs Your Codebase."
**Type:** B2B SaaS — AI Governance Platform for Engineering Teams
**Target Users:** CTOs, VP Engineering, Tech Leads, Enterprise Engineering Teams

**What it does:**
- Connects to GitHub repositories via OAuth
- Scans commits, PRs, and diffs to detect AI-generated code
- Calculates an "AI Debt Score" (0–100) per repo and company
- Tracks team-level AI adoption health and review quality
- Generates weekly governance reports
- Sends alerts when risk thresholds are breached
- Provides ROI calculator for AI governance

**What it is NOT:**
- NOT a chatbot or AI assistant
- NOT a productivity tool
- NOT a code editor or IDE plugin

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.x |
| **Language** | TypeScript | 5.x |
| **Styling** | TailwindCSS | 3.4+ |
| **UI Components** | shadcn/ui | Latest |
| **Charts** | Recharts | 2.x |
| **State** | Zustand | 4.x |
| **Data Fetching** | TanStack Query | 5.x |
| **Forms** | React Hook Form + Zod | Latest |
| **Tables** | TanStack Table | 8.x |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Auth** | Supabase Auth | Latest |
| **Storage** | Supabase Storage | Latest |
| **Real-time** | Supabase Realtime | Latest |
| **Edge Functions** | Supabase Edge Functions (Deno) | Latest |
| **Cache** | Upstash Redis | Latest |
| **Queue** | BullMQ (later) / pg_cron (MVP) | Latest |
| **Email** | Resend | Latest |
| **Payments** | Stripe (future) | Latest |
| **Hosting** | Vercel | Latest |
| **CI/CD** | GitHub Actions | Latest |
| **Monitoring** | Sentry | Latest |
| **PDF Export** | @react-pdf/renderer | Latest |

---

## 3. Project Initialization Commands

```bash
# Create Next.js project
npx create-next-app@latest codeguard-ai \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd codeguard-ai

# Install core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query @tanstack/react-table
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install date-fns
npm install lucide-react
npm install clsx tailwind-merge class-variance-authority
npm install @react-pdf/renderer
npm install resend
npm install next-themes

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label select badge \
  dialog dropdown-menu sheet tabs table tooltip separator \
  avatar alert progress skeleton switch textarea command \
  popover calendar checkbox radio-group scroll-area \
  navigation-menu accordion collapsible sonner

# Install dev dependencies
npm install -D @types/node prettier eslint-config-prettier
npm install -D supabase

# Initialize Supabase locally
npx supabase init
npx supabase start
```

---

## 4. Folder Structure

```
codeguard-ai/
├── .env.local                          # Environment variables (never commit)
├── .env.example                        # Template for env vars
├── next.config.ts                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json
│
├── supabase/
│   ├── config.toml                     # Supabase local config
│   ├── migrations/
│   │   ├── 00001_create_companies.sql
│   │   ├── 00002_create_users.sql
│   │   ├── 00003_create_repositories.sql
│   │   ├── 00004_create_scans.sql
│   │   ├── 00005_create_scan_results.sql
│   │   ├── 00006_create_ai_debt_scores.sql
│   │   ├── 00007_create_pull_requests.sql
│   │   ├── 00008_create_alerts.sql
│   │   ├── 00009_create_team_metrics.sql
│   │   ├── 00010_create_integrations.sql
│   │   ├── 00011_create_audit_logs.sql
│   │   ├── 00012_create_governance_reports.sql
│   │   ├── 00013_enable_rls.sql
│   │   ├── 00014_create_rls_policies.sql
│   │   ├── 00015_create_indexes.sql
│   │   ├── 00016_create_materialized_views.sql
│   │   ├── 00017_create_functions.sql
│   │   └── 00018_seed_data.sql
│   ├── functions/
│   │   ├── scan-repository/index.ts    # Edge Function: scan worker
│   │   ├── calculate-scores/index.ts   # Edge Function: scoring
│   │   ├── generate-report/index.ts    # Edge Function: weekly report
│   │   └── process-webhook/index.ts    # Edge Function: GitHub webhook
│   └── seed.sql                        # Development seed data
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (providers, fonts)
│   │   ├── globals.css                 # Global styles + Tailwind
│   │   ├── not-found.tsx               # 404 page
│   │   │
│   │   ├── (public)/                   # Public marketing pages
│   │   │   ├── layout.tsx              # Public layout (navbar + footer)
│   │   │   ├── page.tsx                # Landing page (/)
│   │   │   ├── features/
│   │   │   │   └── page.tsx            # Features page
│   │   │   ├── how-it-works/
│   │   │   │   └── page.tsx            # How it works
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx            # Pricing page
│   │   │   ├── security/
│   │   │   │   └── page.tsx            # Security & compliance
│   │   │   └── governance-guide/
│   │   │       └── page.tsx            # AI governance educational page
│   │   │
│   │   ├── (auth)/                     # Auth pages
│   │   │   ├── layout.tsx              # Centered card layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Login page
│   │   │   ├── signup/
│   │   │   │   └── page.tsx            # Signup page
│   │   │   └── onboarding/
│   │   │       └── page.tsx            # Multi-step onboarding wizard
│   │   │
│   │   ├── (dashboard)/                # Protected dashboard
│   │   │   ├── layout.tsx              # Dashboard layout (sidebar + header)
│   │   │   ├── page.tsx                # Main dashboard (redirect from /dashboard)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx            # Governance dashboard
│   │   │   ├── ai-debt/
│   │   │   │   └── page.tsx            # AI debt analysis
│   │   │   ├── adoption/
│   │   │   │   └── page.tsx            # AI adoption health
│   │   │   ├── reports/
│   │   │   │   └── page.tsx            # Governance reports
│   │   │   ├── repositories/
│   │   │   │   ├── page.tsx            # Repository risk overview
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # Single repo detail
│   │   │   ├── team/
│   │   │   │   └── page.tsx            # Team insights
│   │   │   ├── roi/
│   │   │   │   └── page.tsx            # ROI calculator
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx            # Alerts & notifications
│   │   │   ├── prompt-governance/
│   │   │   │   └── page.tsx            # Prompt governance
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx            # Integrations management
│   │   │   ├── billing/
│   │   │   │   └── page.tsx            # Billing & subscription
│   │   │   ├── settings/
│   │   │   │   └── page.tsx            # Settings
│   │   │   └── admin/
│   │   │       └── page.tsx            # Admin panel (platform owner)
│   │   │
│   │   ├── api/                        # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── callback/
│   │   │   │   │   └── route.ts        # Supabase auth callback
│   │   │   │   └── github/
│   │   │   │       └── route.ts        # GitHub OAuth callback
│   │   │   ├── scan/
│   │   │   │   ├── route.ts            # POST: trigger scan
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # GET: scan status
│   │   │   ├── repositories/
│   │   │   │   └── route.ts            # GET: list repos, POST: add repo
│   │   │   ├── scores/
│   │   │   │   └── route.ts            # GET: AI debt scores
│   │   │   ├── reports/
│   │   │   │   ├── route.ts            # GET: list reports
│   │   │   │   └── export/
│   │   │   │       └── route.ts        # GET: PDF export
│   │   │   ├── alerts/
│   │   │   │   └── route.ts            # GET, PATCH: alerts
│   │   │   ├── team/
│   │   │   │   └── route.ts            # GET: team metrics
│   │   │   ├── webhooks/
│   │   │   │   ├── github/
│   │   │   │   │   └── route.ts        # POST: GitHub webhook
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts        # POST: Stripe webhook
│   │   │   └── admin/
│   │   │       └── route.ts            # GET: admin metrics
│   │   │
│   │   └── auth/
│   │       └── confirm/
│   │           └── route.ts            # Email confirmation handler
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ... (all shadcn components)
│   │   │
│   │   ├── shared/                     # Shared across public + dashboard
│   │   │   ├── logo.tsx                # CodeGuard AI logo
│   │   │   ├── theme-toggle.tsx        # Dark/light mode toggle
│   │   │   └── loading-spinner.tsx     # Loading states
│   │   │
│   │   ├── public/                     # Public page components
│   │   │   ├── navbar.tsx              # Public navigation bar
│   │   │   ├── footer.tsx              # Public footer
│   │   │   ├── hero-section.tsx        # Landing hero
│   │   │   ├── metrics-section.tsx     # Landing metrics
│   │   │   ├── features-grid.tsx       # Features grid
│   │   │   ├── testimonials.tsx        # Testimonials section
│   │   │   ├── integration-logos.tsx   # Integration logos bar
│   │   │   ├── pricing-cards.tsx       # Pricing cards
│   │   │   └── cta-section.tsx         # Call to action
│   │   │
│   │   ├── auth/                       # Auth components
│   │   │   ├── login-form.tsx          # Login form
│   │   │   ├── signup-form.tsx         # Signup form
│   │   │   ├── onboarding-wizard.tsx   # Multi-step wizard container
│   │   │   ├── step-connect-github.tsx # Onboarding step 1
│   │   │   ├── step-select-repos.tsx   # Onboarding step 2
│   │   │   ├── step-connect-ai.tsx     # Onboarding step 3
│   │   │   └── step-scanning.tsx       # Onboarding step 4
│   │   │
│   │   ├── dashboard/                  # Dashboard components
│   │   │   ├── sidebar.tsx             # Collapsible sidebar navigation
│   │   │   ├── header.tsx              # Dashboard top header
│   │   │   ├── governance-status.tsx   # "Governance: Stable" badge
│   │   │   ├── ai-assistant-fab.tsx    # Floating AI assistant button
│   │   │   │
│   │   │   ├── gauge-chart.tsx         # AI Debt Score gauge (SVG)
│   │   │   ├── metric-card.tsx         # Metric card with icon, value, change
│   │   │   ├── alert-card.tsx          # Alert list item
│   │   │   ├── repo-risk-card.tsx      # Repository risk summary card
│   │   │   ├── team-member-card.tsx    # Team member insight card
│   │   │   ├── score-trend-chart.tsx   # AI Debt Score line chart
│   │   │   ├── ai-usage-chart.tsx      # AI usage area chart
│   │   │   ├── risk-heatmap.tsx        # Repository risk bar chart
│   │   │   ├── code-block.tsx          # Highlighted code with AI markers
│   │   │   ├── report-preview.tsx      # Weekly report preview card
│   │   │   ├── roi-calculator.tsx      # Interactive ROI calculator
│   │   │   ├── integration-card.tsx    # Integration status card
│   │   │   └── data-table.tsx          # Reusable data table (TanStack)
│   │   │
│   │   └── providers/                  # Context providers
│   │       ├── query-provider.tsx      # TanStack Query provider
│   │       ├── theme-provider.tsx      # next-themes provider
│   │       └── supabase-provider.tsx   # Supabase client provider
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Supabase client
│   │   │   ├── middleware.ts           # Auth middleware helper
│   │   │   └── admin.ts               # Admin Supabase client (service role)
│   │   │
│   │   ├── github/
│   │   │   ├── client.ts              # GitHub API client (Octokit)
│   │   │   ├── oauth.ts               # GitHub OAuth helpers
│   │   │   ├── repos.ts               # Repository fetching
│   │   │   ├── commits.ts             # Commit analysis
│   │   │   ├── pull-requests.ts       # PR analysis
│   │   │   └── webhooks.ts            # Webhook verification & handling
│   │   │
│   │   ├── detection/
│   │   │   ├── metadata-detector.ts   # Signal 1: commit/PR metadata patterns
│   │   │   ├── style-analyzer.ts      # Signal 2: code style heuristics
│   │   │   ├── ai-classifier.ts       # Signal 3: ML model client (future)
│   │   │   └── combined-scorer.ts     # Combines all signals → probability
│   │   │
│   │   ├── scoring/
│   │   │   ├── ai-debt-score.ts       # AI Debt Score formula
│   │   │   ├── adoption-score.ts      # Team adoption scoring
│   │   │   ├── risk-calculator.ts     # Repository risk levels
│   │   │   └── team-scorer.ts         # Individual team member scoring
│   │   │
│   │   ├── reports/
│   │   │   ├── weekly-report.ts       # Weekly report data aggregation
│   │   │   └── pdf-generator.ts       # PDF export generation
│   │   │
│   │   ├── utils/
│   │   │   ├── cn.ts                  # clsx + tailwind-merge utility
│   │   │   ├── format.ts             # Number/date formatting
│   │   │   ├── constants.ts           # App-wide constants
│   │   │   └── errors.ts             # Error handling utilities
│   │   │
│   │   └── validators/
│   │       ├── auth.ts                # Auth form schemas (Zod)
│   │       ├── settings.ts            # Settings form schemas
│   │       └── scan.ts               # Scan request schemas
│   │
│   ├── hooks/
│   │   ├── use-auth.ts               # Auth state hook
│   │   ├── use-company.ts            # Company data hook
│   │   ├── use-repositories.ts       # Repositories query hook
│   │   ├── use-scan.ts               # Scan trigger/status hook
│   │   ├── use-scores.ts             # AI Debt Score query hook
│   │   ├── use-alerts.ts             # Alerts query hook
│   │   ├── use-team.ts               # Team metrics hook
│   │   ├── use-reports.ts            # Reports query hook
│   │   └── use-realtime.ts           # Supabase realtime subscription hook
│   │
│   ├── stores/
│   │   ├── sidebar-store.ts          # Sidebar collapsed state
│   │   ├── onboarding-store.ts       # Onboarding wizard state
│   │   └── filter-store.ts           # Dashboard filter state
│   │
│   ├── types/
│   │   ├── database.ts               # Generated Supabase types
│   │   ├── api.ts                    # API request/response types
│   │   ├── github.ts                 # GitHub API types
│   │   ├── detection.ts              # Detection result types
│   │   └── scoring.ts                # Scoring types
│   │
│   └── middleware.ts                  # Next.js middleware (auth guard)
│
├── public/
│   ├── logo.svg                       # CodeGuard AI logo
│   ├── og-image.png                   # Open Graph image
│   └── favicon.ico                    # Favicon
│
└── .github/
    └── workflows/
        ├── ci.yml                     # Lint + type check + test
        ├── deploy.yml                 # Vercel deploy
        └── scan-worker.yml            # Scheduled scan runner (future)
```

---

## 5. Design System

### Colors

```css
/* tailwind.config.ts — extend theme.colors */
colors: {
  background: {
    primary: '#0a0e1a',     /* Main background */
    secondary: '#0f1629',   /* Sidebar, header */
    card: '#131b2e',        /* Cards */
    'card-hover': '#182040', /* Card hover */
  },
  border: {
    DEFAULT: '#1e2a4a',
    light: '#253358',
  },
  text: {
    primary: '#e8eaf0',
    secondary: '#8892b0',
    muted: '#5a6480',
  },
  brand: {
    DEFAULT: '#1e3a8a',     /* Deep Blue — primary */
    light: '#3b82f6',       /* Lighter blue */
    glow: 'rgba(59,130,246,0.15)',
  },
  status: {
    success: '#22c55e',     /* Green — positive metrics */
    warning: '#f59e0b',     /* Amber — warnings */
    danger: '#ef4444',      /* Red — risk alerts */
  }
}
```

### Typography

```css
/* Use Google Fonts */
fontFamily: {
  display: ['Outfit', 'sans-serif'],     /* Headings, UI text */
  mono: ['JetBrains Mono', 'monospace'], /* Code, numbers, metrics */
}
```

### Design Principles
- Enterprise-grade, dark mode default
- Minimal gradients, no decorative fluff
- Professional polish (Linear / Vercel level)
- Color-coded severity: Green (good) → Amber (caution) → Red (critical)
- Monospace font for all numbers, scores, metrics, code
- Gauge chart for the AI Debt Score (always prominent)
- Collapsible sidebar navigation
- Status badge in header: "AI Governance Status: Stable"

---

## 6. Key Configuration Files

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
```

### middleware.ts (Auth Guard)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect logged-in users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/onboarding'],
};
```

---

## 7. Claude Code Instructions

When feeding this to Claude Code, use this prompt structure:

```
You are building CodeGuard AI, a B2B SaaS AI governance platform.

Read the following documentation files in order:
1. 01-PROJECT-SETUP.md (this file)
2. 02-DATABASE-SCHEMA.md
3. 03-API-SPECIFICATION.md
4. 04-FRONTEND-SPEC.md
5. 05-GITHUB-INTEGRATION.md
6. 06-AI-DETECTION-ENGINE.md
7. 07-WORKERS-AND-JOBS.md
8. 08-DEPLOYMENT.md

Build the complete application following these specs exactly.
Start with project initialization, then database, then API, then frontend.
Use TypeScript strict mode throughout.
Follow the folder structure specified in 01-PROJECT-SETUP.md.
```
