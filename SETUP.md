# CodeGuard AI — Setup Guide

## Prerequisites
- Node.js 18+
- Docker Desktop (for local Supabase)
- GitHub OAuth App (for repo integration)

## 1. Install Dependencies
```bash
cd codeguard-ai
npm install
```

## 2. Environment Variables
Copy and configure `.env.local`:
```bash
cp .env.example .env.local
```

Required variables:
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | from `npx supabase start` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | from `npx supabase start` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | from GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret | from GitHub Developer Settings |
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting tokens | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | App base URL | `http://localhost:3000` |

## 3. Start Supabase (Local)
```bash
# Make sure Docker Desktop is running
npx supabase start
```

This will output the Supabase URLs and keys. Copy the `anon key` and `service_role key` into `.env.local`.

Apply migrations:
```bash
npx supabase db reset
```

This runs all 19 migrations:
- Tables: companies, users, repositories, scans, scan_results, ai_debt_scores, pull_requests, alerts, team_metrics, integrations, audit_logs, governance_reports
- RLS policies, indexes, materialized views, helper functions, seed data

## 4. GitHub OAuth App
1. Go to GitHub > Settings > Developer Settings > OAuth Apps > New OAuth App
2. Set:
   - **Application name**: CodeGuard AI
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github`
3. Copy Client ID and generate a Client Secret
4. Add both to `.env.local`

## 5. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output to `ENCRYPTION_KEY` in `.env.local`.

## 6. Start Dev Server
```bash
npm run dev
```
Open http://localhost:3000

## 7. First Use
1. Sign up at `/signup` (creates auth user + company + user profile)
2. Onboarding wizard:
   - Step 1: Connect GitHub (OAuth)
   - Step 2: Select repositories to monitor
   - Step 3: Choose AI provider
   - Step 4: Initial governance scan
3. Dashboard at `/dashboard`

## Useful URLs (Local)
| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Stopping
```bash
npx supabase stop    # Stop Supabase Docker containers
# Ctrl+C for dev server
```
