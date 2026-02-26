# CodeGuard AI — GitHub Integration

## Document 5 of 8

---

## Overview

GitHub integration is the primary data source for CodeGuard AI. It provides repository metadata, commits, pull requests, diffs, and review data needed to detect AI-generated code and calculate governance metrics.

---

## GitHub OAuth Flow

### Step 1: Create GitHub OAuth App

In GitHub Developer Settings, create an OAuth App:
```
Application name: CodeGuard AI
Homepage URL: https://codeguard.ai
Authorization callback URL: https://codeguard.ai/api/auth/github
```

Required scopes: `repo`, `read:org`, `read:user`

### Step 2: OAuth Implementation

```typescript
// lib/github/oauth.ts

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github`,
    scope: 'repo read:org read:user',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error_description);
  return data.access_token;
}
```

### Step 3: Callback Handler

```typescript
// app/api/auth/github/route.ts

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  
  // 1. Verify CSRF state token
  // 2. Exchange code for access token
  const token = await exchangeCodeForToken(code!);
  
  // 3. Fetch GitHub user info
  const githubUser = await fetchGitHubUser(token);
  
  // 4. Store encrypted token in user profile
  const supabase = createServerSupabase();
  await supabase.from('users').update({
    github_username: githubUser.login,
    github_token: encrypt(token),
  }).eq('id', userId);
  
  // 5. Redirect to onboarding step 2
  return NextResponse.redirect(new URL('/onboarding?step=2', request.url));
}
```

---

## GitHub API Client

```typescript
// lib/github/client.ts

import { Octokit } from '@octokit/rest';

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'CodeGuard-AI/1.0',
  });
}
```

Install: `npm install @octokit/rest`

---

## Repository Fetching

```typescript
// lib/github/repos.ts

export async function fetchUserRepositories(token: string) {
  const octokit = createGitHubClient(token);
  
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    sort: 'updated',
    per_page: 100,
    visibility: 'all',
  });
  
  return repos.map(repo => ({
    github_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    default_branch: repo.default_branch || 'main',
    language: repo.language,
    is_private: repo.private,
    metadata: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      size: repo.size,
      updated_at: repo.updated_at,
    },
  }));
}
```

---

## Scanning Pipeline

### Full Scan (Initial + Manual Trigger)

```typescript
// lib/github/commits.ts

export async function scanRepository(
  token: string,
  repoFullName: string,
  scanFrom: Date,
  scanTo: Date,
  onProgress: (pct: number) => void
): Promise<ScanSummary> {
  const octokit = createGitHubClient(token);
  const [owner, repo] = repoFullName.split('/');
  
  // ===== PHASE 1: Fetch Commits (30% of progress) =====
  onProgress(5);
  const commits = await octokit.paginate(octokit.repos.listCommits, {
    owner, repo,
    since: scanFrom.toISOString(),
    until: scanTo.toISOString(),
    per_page: 100,
  });
  onProgress(15);
  
  // ===== PHASE 2: Fetch PRs (20%) =====
  const pulls = await octokit.paginate(octokit.pulls.list, {
    owner, repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });
  
  const relevantPRs = pulls.filter(pr =>
    pr.merged_at &&
    new Date(pr.merged_at) >= scanFrom &&
    new Date(pr.merged_at) <= scanTo
  );
  onProgress(30);
  
  // ===== PHASE 3: Analyze Commits (40%) =====
  const fileResults: FileResult[] = [];
  
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    
    // Fetch full commit with diff/patch data
    const fullCommit = await octokit.repos.getCommit({
      owner, repo, ref: commit.sha,
    });
    
    for (const file of fullCommit.data.files || []) {
      if (!isCodeFile(file.filename)) continue;
      
      // Run AI detection on file patch
      const aiSignals = await detectAICode(
        file.patch || '',
        detectLanguage(file.filename),
        commit.commit.message,
      );
      
      fileResults.push({
        file_path: file.filename,
        language: detectLanguage(file.filename),
        total_loc: file.additions + file.deletions,
        ai_loc: Math.round(file.additions * aiSignals.combined_probability),
        ai_probability: aiSignals.combined_probability,
        risk_level: getRiskLevel(aiSignals.combined_probability),
        detection_signals: aiSignals,
        ai_code_snippet: file.patch?.substring(0, 500),
      });
    }
    
    onProgress(30 + Math.round((i / commits.length) * 40));
  }
  
  // ===== PHASE 4: Analyze PRs (20%) =====
  const prResults: PRResult[] = [];
  
  for (const pr of relevantPRs) {
    const isAIGenerated = checkPRForAI(pr.title, pr.body || '');
    
    const reviews = await octokit.pulls.listReviews({
      owner, repo, pull_number: pr.number,
    });
    
    const humanReviewed = reviews.data.some(r =>
      r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED'
    );
    
    prResults.push({
      github_pr_number: pr.number,
      github_pr_id: pr.id,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      state: pr.merged_at ? 'merged' : 'closed',
      ai_generated: isAIGenerated,
      ai_probability: isAIGenerated ? 0.8 : 0.1,
      human_reviewed: humanReviewed,
      review_count: reviews.data.length,
      total_loc_added: 0,
      ai_loc_added: 0,
      files_changed: 0,
      pr_created_at: pr.created_at,
      pr_merged_at: pr.merged_at,
    });
  }
  
  onProgress(95);
  
  // ===== PHASE 5: Compile Summary =====
  const totalLOC = fileResults.reduce((sum, f) => sum + f.total_loc, 0);
  const aiLOC = fileResults.reduce((sum, f) => sum + f.ai_loc, 0);
  const aiPRs = prResults.filter(pr => pr.ai_generated);
  const reviewedAIPRs = aiPRs.filter(pr => pr.human_reviewed);
  
  onProgress(100);
  
  return {
    total_commits: commits.length,
    total_prs: relevantPRs.length,
    total_files_scanned: fileResults.length,
    total_loc: totalLOC,
    ai_loc: aiLOC,
    ai_loc_percentage: totalLOC > 0 ? Math.round((aiLOC / totalLOC) * 1000) / 10 : 0,
    ai_prs_detected: aiPRs.length,
    reviewed_ai_prs: reviewedAIPRs.length,
    unreviewed_ai_merges: aiPRs.length - reviewedAIPRs.length,
    high_risk_files: fileResults.filter(f => f.risk_level === 'high').length,
    medium_risk_files: fileResults.filter(f => f.risk_level === 'medium').length,
    low_risk_files: fileResults.filter(f => f.risk_level === 'low').length,
    file_results: fileResults,
    pr_results: prResults,
    scan_duration_seconds: 0, // Set by caller
  };
}

function isCodeFile(filename: string): boolean {
  const exts = ['.ts','.tsx','.js','.jsx','.py','.go','.rs','.java','.rb','.php','.cs','.cpp','.c','.h','.swift','.kt','.scala','.vue','.svelte'];
  return exts.some(ext => filename.endsWith(ext));
}

function detectLanguage(filename: string): string {
  const map: Record<string, string> = {
    '.ts':'TypeScript','.tsx':'TypeScript','.js':'JavaScript','.jsx':'JavaScript',
    '.py':'Python','.go':'Go','.rs':'Rust','.java':'Java','.rb':'Ruby','.php':'PHP',
  };
  const ext = '.' + filename.split('.').pop();
  return map[ext] || 'Unknown';
}

function getRiskLevel(prob: number): 'high'|'medium'|'low' {
  return prob >= 0.7 ? 'high' : prob >= 0.4 ? 'medium' : 'low';
}

function checkPRForAI(title: string, body: string): boolean {
  const patterns = [
    /generated\s+(by|with|using)\s+(ai|claude|chatgpt|gpt|copilot)/i,
    /ai[- ]generated/i, /copilot/i, /co-authored-by:.*copilot/i,
  ];
  const text = `${title} ${body}`;
  return patterns.some(p => p.test(text));
}
```

---

## Webhook Setup

### Register Webhook on Repository

```typescript
// lib/github/webhooks.ts

export async function registerWebhook(
  token: string,
  owner: string,
  repo: string,
  webhookUrl: string,
): Promise<{ webhookId: number; secret: string }> {
  const octokit = createGitHubClient(token);
  const secret = crypto.randomUUID();
  
  const { data } = await octokit.repos.createWebhook({
    owner, repo,
    config: { url: webhookUrl, content_type: 'json', secret },
    events: ['push', 'pull_request', 'pull_request_review'],
    active: true,
  });
  
  return { webhookId: data.id, secret };
}

export async function removeWebhook(token: string, owner: string, repo: string, hookId: number) {
  const octokit = createGitHubClient(token);
  await octokit.repos.deleteWebhook({ owner, repo, hook_id: hookId });
}
```

### Webhook Handler

```typescript
// app/api/webhooks/github/route.ts

import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');
  const delivery = request.headers.get('x-github-delivery');
  
  if (!signature || !event) {
    return new Response('Missing headers', { status: 400 });
  }
  
  const payload = JSON.parse(body);
  const repoGithubId = payload.repository?.id;
  
  // Look up repository and its webhook secret
  const supabase = createAdminSupabase();
  const { data: repo } = await supabase
    .from('repositories')
    .select('id, company_id, webhook_secret')
    .eq('github_id', repoGithubId)
    .single();
  
  if (!repo) return new Response('Unknown repository', { status: 404 });
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', repo.webhook_secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest('hex')}`;
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Handle event asynchronously
  switch (event) {
    case 'push':
      // Queue incremental scan for new commits
      await supabase.from('scan_queue').insert({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_type: 'incremental',
        priority: 5,
      });
      break;
    
    case 'pull_request':
      if (['opened', 'closed', 'reopened'].includes(payload.action)) {
        await supabase.from('scan_queue').insert({
          company_id: repo.company_id,
          repository_id: repo.id,
          scan_type: 'pr_scan',
          priority: 3,
        });
      }
      break;
    
    case 'pull_request_review':
      // Update PR review status
      await supabase.from('pull_requests').update({
        human_reviewed: true,
        review_count: payload.pull_request?.review_comments || 0,
      }).eq('repository_id', repo.id).eq('github_pr_id', payload.pull_request?.id);
      break;
  }
  
  // Always return 200 quickly — processing is async
  return new Response('OK', { status: 200 });
}
```

---

## Rate Limit Strategy

| API Method | Limit | Handling |
|-----------|-------|---------|
| REST API (OAuth) | 5,000 req/hour | Queue + batch, track via response headers |
| GraphQL | 5,000 points/hour | Batch queries, 1 query = multiple REST calls |
| Search API | 30 req/min | Rate-limit search-dependent operations |

```typescript
// After each API call, track limits:
// x-ratelimit-remaining → if < 100, slow down
// x-ratelimit-reset → if < 10, pause until reset time
```

**Future upgrade path:** Switch from OAuth App to GitHub App for per-installation rate limits (scales better with 20+ customers).

---

## Types

```typescript
// types/github.ts

export interface GitHubRepo {
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  is_private: boolean;
  metadata: { stars: number; forks: number; size: number; updated_at: string; };
}

export interface FileResult {
  file_path: string;
  language: string;
  total_loc: number;
  ai_loc: number;
  ai_probability: number;
  risk_level: 'high' | 'medium' | 'low';
  detection_signals: DetectionResult;
  ai_code_snippet?: string;
  snippet_start_line?: number;
  snippet_end_line?: number;
}

export interface PRResult {
  github_pr_number: number;
  github_pr_id: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  ai_generated: boolean;
  ai_probability: number;
  human_reviewed: boolean;
  review_count: number;
  total_loc_added: number;
  ai_loc_added: number;
  files_changed: number;
  pr_created_at: string;
  pr_merged_at: string | null;
}

export interface ScanSummary {
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
  file_results: FileResult[];
  pr_results: PRResult[];
  scan_duration_seconds: number;
}
```

---

## Encryption Utility

```typescript
// lib/utils/encryption.ts

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```
