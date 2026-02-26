# CodeGuard AI

B2B SaaS platform for AI code governance. Helps engineering teams track, score, and manage AI-generated technical debt across repositories.

## Features

- **AI Debt Scoring** — Calculates a 0–100 governance score per repository based on AI-generated code ratio, review coverage, and refactor backlog
- **Repository Scanning** — Scans all code files in connected GitHub repos to detect AI-generated patterns using style analysis and metadata detection
- **Vulnerability Detection** — Regex-based security scanner with 20 rules across 4 severity levels (hardcoded secrets, XSS, SQL injection, command injection, weak crypto)
- **Governance Dashboard** — Company-wide overview with debt score gauge, metric cards, score trends, risk heatmap, and alert feed
- **Repository Detail View** — Per-repo drill-down with file-level AI detection signals, vulnerability findings, scan history with commit tracking
- **Alerting System** — Automated alerts for high AI code ratios, critical debt scores, and security vulnerabilities
- **GitHub Integration** — OAuth-based connection, automatic file tree fetching, commit SHA tracking per scan

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth + GitHub OAuth |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) |
| State | Zustand (client) + TanStack React Query (server) |
| Charts | Recharts |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local Supabase)

### Setup

```bash
# Install dependencies
npm install

# Start local Supabase
npx supabase start

# Run all migrations
npx supabase db reset

# Copy environment template and fill in values
cp .env.example .env.local
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `ENCRYPTION_KEY` | 64-char hex string for token encryption |
| `NEXT_PUBLIC_APP_URL` | App URL (local: `http://localhost:3000`) |

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Database

```bash
npx supabase start   # Start local Supabase (Docker)
npx supabase stop    # Stop containers
npx supabase db reset # Re-run all 20 migrations
```

Local Supabase Studio: http://localhost:54323

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Landing pages (no auth)
│   ├── (auth)/            # Login, signup, onboarding
│   ├── (dashboard)/       # Dashboard pages (auth required)
│   │   └── dashboard/
│   │       ├── page.tsx           # Governance dashboard
│   │       ├── repositories/     # Repo list + detail
│   │       ├── alerts/           # Alert management
│   │       └── ...
│   └── api/               # API routes
│       ├── auth/github/   # GitHub OAuth callback
│       ├── dashboard/     # Dashboard data
│       ├── repositories/  # Repo CRUD + enrichment
│       ├── scan/          # Scan trigger + status + results
│       └── scores/        # AI debt scores
├── components/
│   ├── ui/                # shadcn primitives
│   ├── charts/            # Recharts wrappers
│   └── dashboard/         # Dashboard-specific components
├── hooks/                 # React Query hooks
├── lib/
│   ├── detection/         # AI code detection + vulnerability scanner
│   ├── scoring/           # AI debt score calculator
│   ├── github/            # GitHub API client
│   └── supabase/          # Supabase clients (server, admin)
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## How Scanning Works

1. User triggers a scan from the repository detail page
2. Scan is queued in the database with `status: pending`
3. Processor claims the scan, fetches the file tree from GitHub
4. Each code file is analyzed for AI-generated patterns (style analysis, metadata detection)
5. Vulnerability detection runs 20 regex-based rules per file
6. Results are stored per-file with detection signals and vulnerability findings
7. AI debt score is calculated and alerts are generated for threshold violations
8. Scan is marked complete with commit SHA tracking

## License

Proprietary — All rights reserved.
