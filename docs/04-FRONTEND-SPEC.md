# CodeGuard AI — Frontend Specification

## Document 4 of 8

---

## Routing & Page Map

| Route | Page | Layout | Auth Required |
|-------|------|--------|---------------|
| `/` | Landing Page | Public (Navbar + Footer) | No |
| `/features` | Features Page | Public | No |
| `/how-it-works` | How It Works | Public | No |
| `/pricing` | Pricing Page | Public | No |
| `/security` | Security & Compliance | Public | No |
| `/governance-guide` | AI Governance Guide | Public | No |
| `/login` | Login | Auth (centered card) | No |
| `/signup` | Signup | Auth (centered card) | No |
| `/onboarding` | Onboarding Wizard | Auth (centered card) | Yes |
| `/dashboard` | Main Dashboard | Dashboard (Sidebar + Header) | Yes |
| `/dashboard/ai-debt` | AI Debt Analysis | Dashboard | Yes |
| `/dashboard/adoption` | AI Adoption Health | Dashboard | Yes |
| `/dashboard/reports` | Governance Reports | Dashboard | Yes |
| `/dashboard/repositories` | Repository Risk | Dashboard | Yes |
| `/dashboard/repositories/[id]` | Single Repo Detail | Dashboard | Yes |
| `/dashboard/team` | Team Insights | Dashboard | Yes |
| `/dashboard/roi` | ROI Calculator | Dashboard | Yes |
| `/dashboard/alerts` | Alerts & Notifications | Dashboard | Yes |
| `/dashboard/prompt-governance` | Prompt Governance | Dashboard | Yes |
| `/dashboard/integrations` | Integrations | Dashboard | Yes |
| `/dashboard/billing` | Billing | Dashboard | Yes |
| `/dashboard/settings` | Settings | Dashboard | Yes |
| `/dashboard/admin` | Admin Panel | Dashboard | Yes (owner only) |

---

## Public Layout Components

### `navbar.tsx`
- Fixed position, blur backdrop, border-bottom
- Left: Logo (Shield icon + "CodeGuard AI")
- Center: Navigation links (Features, Pricing, Security, Guide)
- Right: "Log In" (ghost button), "Start Free Trial" (primary button)
- Mobile: hamburger menu with Sheet component

### `footer.tsx`
- Border-top separator
- Logo centered
- Link row: Features, Pricing, Security, Docs, Blog
- Copyright: "© 2026 CodeGuard AI. All rights reserved."

---

## Landing Page (`/`)

### Sections (top to bottom):

**1. Hero Section**
- Badge: "AI Governance Platform"
- H1: "AI Is Writing Your Code. Who's Governing It?"
- Subtitle: "CodeGuard AI tracks AI-generated code, technical debt risk, and team AI adoption — giving engineering leaders full visibility and control."
- CTA buttons: "Start Free Trial" (primary, → /signup), "View Demo Dashboard" (secondary, → /dashboard)
- Background: radial gradient glow behind heading

**2. Metrics Section**
- 3-column grid of metric cards:
  - "38%" — AI-Generated LOC Detected (blue)
  - "22%" — Increase in AI-Induced Refactor Risk (amber)
  - "47%" — Reduction in Unreviewed AI Merges (green)
- Each card: large monospace number, description below

**3. AI Debt Score Preview**
- Card with glow effect
- Left: GaugeChart component showing score 68
- Right: title "Your AI Debt Score", description paragraph, color legend (green/amber/red)

**4. Features Grid**
- Heading: "Why AI Governance Matters"
- Subtitle: "As AI writes more code, engineering leaders need visibility..."
- 3x2 grid of feature cards:
  - Governance & Compliance (Shield icon)
  - Technical Debt Monitoring (Activity icon)
  - Team Adoption Insights (Users icon)
  - Repository Risk Analysis (GitBranch icon)
  - Prompt Governance (Brain icon)
  - Executive Reporting (BarChart3 icon)

**5. Testimonials**
- Heading: "Trusted by Engineering Leaders"
- 3-column: quote cards with 5 stars, quote text, name, role

**6. Integrations Bar**
- Heading: "Integrates with Your Stack"
- Pill badges: GitHub, Slack, Jira, Claude, OpenAI, GitLab

**7. CTA Section**
- Card with glow: "Ready to Govern Your AI Code?"
- Subtitle: "Start your free 14-day trial. No credit card required."
- Button: "Get Started Free" → /signup

---

## Auth Pages

### Login (`/login`)
- Centered card (max-width 400px)
- Logo + "Welcome Back" heading
- Fields: Email, Password
- "Sign In" button → authenticate via Supabase Auth → redirect to /dashboard
- Link: "Don't have an account? Sign up"

### Signup (`/signup`)
- Centered card (max-width 440px)
- Logo + "Create Your Account" heading + "14-day free trial"
- Fields:
  - Company Name (Building icon)
  - Team Size (select: 1-10, 11-50, 51-200, 200+)
  - Your Role (select: CTO, VP Engineering, Tech Lead, Engineering Manager)
  - Work Email
  - Password
- "Create Account" button → Supabase Auth signup → create company + user records → redirect to /onboarding
- Link: "Already have an account? Sign in"

**Signup server action:**
```typescript
// 1. Create auth user via Supabase Auth
// 2. Create company record
// 3. Create user profile linked to company
// 4. Redirect to /onboarding
```

### Onboarding (`/onboarding`)

Multi-step wizard with 4 steps. Progress bar at top (4 segments).

**Step 1: Connect GitHub**
- GitBranch icon
- "Connect GitHub" heading
- Description: "We'll analyze your repositories for AI-generated code patterns."
- Button: "Connect GitHub Account" → redirects to GitHub OAuth

**Step 2: Select Repositories**
- Database icon
- "Select Repositories" heading
- Checkbox list of repos fetched from GitHub API
- Each row: checkbox, GitBranch icon, "org/repo-name" in mono font
- Button: "Continue" (disabled if 0 selected)

**Step 3: Connect AI Provider**
- Brain icon
- "Connect AI Provider" heading
- Radio list: Claude (Anthropic), OpenAI / ChatGPT, GitHub Copilot
- Button: "Start Governance Scan"

**Step 4: Scanning**
- Spinning RefreshCw icon (animated)
- "Scanning Repositories..." heading
- Description: "Analyzing N repositories for AI patterns..."
- Progress bar: 0% → 100% (animate over ~5 seconds)
- Monospace percentage counter
- On complete: icon stops spinning, text changes to "Scan Complete!", auto-redirect to /dashboard after 1s

**State management:** Zustand store `onboarding-store.ts`
```typescript
interface OnboardingStore {
  step: 1 | 2 | 3 | 4;
  selectedRepos: string[];
  aiProvider: string;
  scanProgress: number;
  setStep: (step: number) => void;
  toggleRepo: (repoId: string) => void;
  setAiProvider: (provider: string) => void;
  setScanProgress: (progress: number) => void;
}
```

---

## Dashboard Layout

### `layout.tsx` (Dashboard)
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header (search, governance status, bell, logout)  │
│ (240px) │───────────────────────────────────────────────────│
│         │                                                   │
│  Logo   │                                                   │
│  Nav    │              Page Content                          │
│  items  │              (scrollable)                          │
│         │                                                   │
│         │                                                   │
│  ───    │                                                   │
│ Company │                                                   │
│  info   │                                                   │
└─────────┴───────────────────────────────────────────────────┘
```

### `sidebar.tsx`
- Collapsible (240px ↔ 64px), toggle via chevron button
- Top: Logo + "CodeGuard AI"
- Navigation items (from `dashboardLinks` array):
  - Dashboard (Home icon)
  - AI Debt Analysis (Activity)
  - Adoption Health (Users)
  - Governance Reports (FileCode)
  - Repository Risk (GitBranch)
  - Team Insights (Users)
  - ROI Calculator (DollarSign)
  - Alerts (Bell) — with red badge showing count
  - Prompt Governance (Brain)
  - Integrations (Layers)
  - Billing (CreditCard)
  - Settings (Settings)
  - Admin Panel (Shield) — only if user.role === 'owner'
- Bottom: Company avatar + name + plan badge
- Active item: blue background glow, blue text
- Collapsed: icons only with tooltips
- State: Zustand `sidebar-store.ts`

### `header.tsx`
- Search input: "Search governance data..." with Search icon
- Right side:
  - Governance status badge: green dot + "Governance: Stable" (or amber/red based on score)
  - Bell icon with red dot (notification count)
  - Logout icon

### `ai-assistant-fab.tsx`
- Fixed bottom-right floating action button
- Blue gradient circle with MessageSquare icon
- On click: toggles assistant panel
- Panel: Card with "AI Governance Assistant" title, contextual explanation text, input field
- The explanation text should be dynamic based on current page context

---

## Dashboard Main Page (`/dashboard`)

### Layout:
```
┌─────────────────────────────────────────────┐
│ Title: "Governance Dashboard"               │
│ Subtitle: "Last scan: X ago · N repos"      │
├────────┬────────────────────────────────────┤
│ Gauge  │  ┌──────────┐ ┌──────────┐        │
│ Chart  │  │ AI-Gen   │ │ AI-Rev   │        │
│ (Debt  │  │ LOC: 42% │ │ PRs: 61% │        │
│ Score) │  ├──────────┤ ├──────────┤        │
│  68    │  │ Unrev    │ │ Refactor │        │
│        │  │ Merges   │ │ Backlog  │        │
├────────┴──┴──────────┴─┴──────────┴────────┤
│ ┌──────────────────┐ ┌──────────────────┐  │
│ │ AI Usage Over    │ │ AI Debt Score    │  │
│ │ Time (Area Chart)│ │ Trend (Line)     │  │
│ └──────────────────┘ └──────────────────┘  │
│ ┌──────────────────┐ ┌──────────────────┐  │
│ │ Repo Risk        │ │ Recent Alerts    │  │
│ │ (Horizontal Bar) │ │ (List)           │  │
│ └──────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────┘
```

### Components used:
- `gauge-chart.tsx` — SVG arc gauge, value 68, color by zone
- `metric-card.tsx` × 4 — AI LOC, AI Reviews, Unreviewed, Refactor
- `ai-usage-chart.tsx` — Recharts AreaChart
- `score-trend-chart.tsx` — Recharts LineChart
- `risk-heatmap.tsx` — Recharts horizontal BarChart
- `alert-card.tsx` × 4 — Latest alerts

### Data fetching:
```typescript
// Use TanStack Query
const { data } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => fetch('/api/dashboard').then(r => r.json()),
  refetchInterval: 60000, // Refresh every 60 seconds
});
```

---

## AI Debt Analysis (`/dashboard/ai-debt`)

- Title + "Run Governance Scan" button (triggers POST /api/scan)
- Score trend: AreaChart with amber gradient (6-month history)
- Repository breakdown table (TanStack Table):
  | Repository | AI LOC % | Review Coverage | Risk Level | Risk Score |
  - Sortable columns, colored badges for risk level
- Scoring formula: code block showing the weighted formula
- Loading state: Skeleton components while data loads

---

## AI Adoption Health (`/dashboard/adoption`)

- Company adoption score: GaugeChart (value 74)
- Team breakdown table:
  | Member (avatar + name) | AI Usage | Review Quality | Risk Index | Score | PRs |
  - Badges color-coded per value
- Coaching suggestions section: cards with colored borders (red=urgent, amber=moderate)

---

## Governance Reports (`/dashboard/reports`)

- Title + "Download Executive PDF" button
- Latest report preview card:
  - Title: "Weekly Report — Feb 17–23, 2026" + "Latest" badge
  - Sections: AI Usage Summary, Risk Summary, Technical Debt Signals, Recommendations
  - Each section: heading in blue, bullet items with ChevronRight icon
- Historical reports list below (paginated)

---

## Repository Risk (`/dashboard/repositories`)

- 3-column grid of repository cards:
  - Repo name (mono) + risk badge
  - AI LOC %, Review %, Files count
  - "Last scanned X ago"
- Below: code block component showing AI-generated code sample with highlighted sections
  - Blue left border + "⚡ AI-GENERATED SECTION" markers
  - Syntax-highlighted code

---

## Team Insights (`/dashboard/team`)

- 3-column grid of member cards:
  - Avatar (initials, gradient background) + name + risk badge
  - Grid: AI Usage, Quality, Score (colored by zone), AI PRs fraction

---

## ROI Calculator (`/dashboard/roi`)

- 2-column layout: inputs left, results right
- Inputs:
  - Team Size (number input, Users icon)
  - Average Annual Salary ₹ (number input, DollarSign icon)
  - AI Tool Cost / Person / Month ₹ (number input, CreditCard icon)
- Results:
  - Large card with glow: "Estimated Monthly Net ROI" — ₹X.XL (green if positive)
  - 2-column: Productivity Gain card, Debt Mitigation Savings card
- Calculation (client-side):
  ```
  productivityGain = teamSize × avgSalary × 0.12 / 12
  debtSavings = teamSize × avgSalary × 0.05 / 12
  totalCost = toolCost × teamSize
  netROI = productivityGain + debtSavings - totalCost
  ```

---

## Alerts (`/dashboard/alerts`)

- Title + filter buttons: All | High | Medium | Low
- Alert list: each alert in a Card with hover effect
  - Left: AlertTriangle icon (colored by severity)
  - Title + severity badge
  - Description text
  - Bottom: timestamp + "Dismiss" ghost button
- Dismissed alerts removed from view
- State: local state for dismissed IDs + server sync

---

## Prompt Governance (`/dashboard/prompt-governance`)

- 3 metric cards: Prompt Consistency (Medium), Templates (12), Inconsistencies (8)
- Detected patterns table:
  | Pattern Name | Count | Quality Badge | Example (mono, truncated) |
- Each row has border-bottom separator

---

## Integrations (`/dashboard/integrations`)

- 2-column grid of integration cards:
  - Provider name, status badge (Connected = green, Not Connected = gray)
  - "Manage" or "Connect" button
- Notification preferences section with Toggle switches:
  - Weekly Slack Report
  - Real-time Risk Alerts
  - AI Merge Warnings

---

## Billing (`/dashboard/billing`)

- Current plan card: plan name, price, "Upgrade to Enterprise" button
- Recent invoices list: date, amount, "Paid" status, PDF download button

---

## Settings (`/dashboard/settings`)

- 2-column grid:
  - Left: Company Information form (Company Name, Industry, Team Size) + Save button
  - Right: Governance Configuration form (Scoring Sensitivity, Risk Threshold, Notification Frequency) + Update button

---

## Admin Panel (`/dashboard/admin`)

- Only visible to users with role = 'owner' or 'platform_admin'
- 4 metric cards: Total Companies, Active Subscriptions, Avg AI Debt Score, Monthly Revenue
- 2-column:
  - Left: Feature Flags — list of toggles (Advanced Prompt Analysis, Repo Auto-Scan, AI Merge Blocking, Executive PDF Export, Slack Bot v2)
  - Right: Governance Model Tuning — selects (Scoring Model Version, AI Detection Sensitivity, Risk Calculation Method) + Apply button

---

## Shared Components Specification

### `gauge-chart.tsx`
```typescript
interface GaugeChartProps {
  value: number;        // 0-100
  size?: number;        // Default 180
  label?: string;       // Label below number
}
// SVG-based arc chart
// Color: green >= 80, amber >= 60, red < 60
// Arc spans 270 degrees
// Value + label centered
```

### `metric-card.tsx`
```typescript
interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}
```

### `data-table.tsx`
Wrapper around TanStack Table with:
- Sortable column headers
- Row hover effect
- Loading skeleton state
- Empty state message
- Pagination controls
- Consistent styling matching design system

### `code-block.tsx`
```typescript
interface CodeBlockProps {
  code: string;
  language: string;
  aiSections?: Array<{ startLine: number; endLine: number; source: string; }>;
}
// Renders code with line numbers
// AI sections highlighted with blue background + left border
// AI section markers: "⚡ AI-GENERATED SECTION (source, date)"
```

---

## Data Fetching Strategy

Use TanStack Query throughout with these patterns:

```typescript
// hooks/use-scores.ts
export function useScores(repositoryId?: string) {
  return useQuery({
    queryKey: ['scores', repositoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repositoryId) params.set('repository_id', repositoryId);
      const res = await fetch(`/api/scores?${params}`);
      if (!res.ok) throw new Error('Failed to fetch scores');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,    // 5 minutes
    refetchInterval: 60 * 1000,    // Refetch every minute
  });
}
```

### Supabase Realtime for live updates:
```typescript
// hooks/use-realtime.ts
export function useRealtimeAlerts(companyId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        // Show toast notification
        toast.warning(payload.new.title);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);
}
```

---

## Loading & Error States

Every page must implement:
1. **Loading state:** Skeleton components matching the layout
2. **Error state:** Error card with retry button
3. **Empty state:** Illustration + helpful message + action button

```typescript
// Example pattern
export default function AIDebtPage() {
  const { data, isLoading, error } = useScores();
  
  if (isLoading) return <AIDebtSkeleton />;
  if (error) return <ErrorCard message="Failed to load scores" onRetry={refetch} />;
  if (!data) return <EmptyState message="No scan data yet" action="Run your first scan" />;
  
  return <AIDebtContent data={data} />;
}
```
