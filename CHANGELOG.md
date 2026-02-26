# Changelog — CodeGuard AI

## [0.1.0] - 2026-02-26

### Initial Build
Full application built from 8 documentation files covering architecture, database schema, API design, UI components, scoring algorithms, GitHub integration, CI/CD, and security.

### Features
- **Landing Page**: Hero section, features grid, how-it-works, CTA sections with responsive design
- **Public Pages**: Features, Pricing, Security, Governance Guide, How It Works
- **Authentication**: Email/password signup and login via Supabase Auth
- **Onboarding Wizard**: 4-step flow — Connect GitHub, Select Repos, Choose AI Provider, Initial Scan
- **Dashboard**: 13 pages — main dashboard, AI debt analysis, adoption health, alerts, billing, integrations, prompt governance, reports, repositories, repository detail, ROI calculator, settings, team insights, admin panel
- **GitHub OAuth**: Full integration — connect account, fetch repos, store encrypted token
- **Governance Scan**: Trigger full/incremental scans via API, queue for all repos or single repo
- **Dark/Light Mode**: CSS variable-based theming with next-themes, semantic Tailwind classes
- **Real-time**: Supabase realtime subscription for alerts
- **Charts**: Gauge chart, score trend chart, AI usage chart, risk heatmap (Recharts)

### API Routes
- `POST /api/auth/signup` — Create auth user, company, and user profile (admin client)
- `GET /api/auth/github/connect` — Generate GitHub OAuth URL
- `GET /api/auth/github` — OAuth callback, exchange code for token, encrypt and save
- `GET /api/github/repos` — Fetch user's GitHub repos using stored token
- `GET/POST /api/repositories` — List and save company repositories
- `POST /api/scan` — Trigger governance scan
- `GET /api/dashboard` — Dashboard summary data
- `GET /api/scores` — AI debt scores
- `GET /api/alerts` — Alert listing and management
- `GET /api/reports` — Governance reports
- `GET /api/team` — Team metrics
- `POST /api/webhooks/github` — GitHub webhook handler
- `POST /api/webhooks/stripe` — Stripe webhook handler

### Database
- 19 Supabase migrations covering 12 tables
- Row-level security (RLS) on all tables
- Helper functions: `get_user_company_id()`, `is_company_admin()`
- Materialized views, indexes, trigger functions, seed data

### Infrastructure
- CI/CD workflows: `ci.yml` (lint, type-check, build, test) and `deploy.yml` (Vercel deploy)
- Middleware for auth route protection
- AES-256-GCM encryption for GitHub tokens

### Bug Fixes During Build
- Fixed route conflict between `(dashboard)/page.tsx` and `(public)/page.tsx`
- Fixed Supabase type errors (missing `Relationships`, `Views`, `Enums`, `CompositeTypes`)
- Fixed default Next.js page overriding landing page
- Fixed RLS blocking company creation during signup (switched to admin client)
- Fixed RLS blocking repository saves during onboarding (switched to admin client)
- Fixed ENCRYPTION_KEY placeholder causing GitHub OAuth callback failure
- Fixed `useSearchParams()` missing Suspense boundary on onboarding page
- Fixed dashboard routes 404 (moved pages from `(dashboard)/` to `(dashboard)/dashboard/`)
- Wired up "Run Governance Scan" and "Trigger Scan" buttons with proper mutations and toasts
