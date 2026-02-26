export const APP_NAME = 'CodeGuard AI';
export const APP_DESCRIPTION = 'AI Governance Platform for Engineering Teams';

export const PLANS = {
  starter: { name: 'Starter', maxRepos: 3, price: 0 },
  growth: { name: 'Growth', maxRepos: 15, price: 49 },
  enterprise: { name: 'Enterprise', maxRepos: -1, price: 199 },
} as const;

export const RISK_COLORS = {
  healthy: '#22c55e',
  caution: '#f59e0b',
  critical: '#ef4444',
} as const;

export const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
} as const;

export const RISK_THRESHOLDS = {
  healthy: 80,
  caution: 60,
} as const;

export const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'Home' },
  { href: '/dashboard/ai-debt', label: 'AI Debt Analysis', icon: 'Activity' },
  { href: '/dashboard/adoption', label: 'Adoption Health', icon: 'Users' },
  { href: '/dashboard/reports', label: 'Governance Reports', icon: 'FileText' },
  { href: '/dashboard/repositories', label: 'Repository Risk', icon: 'GitBranch' },
  { href: '/dashboard/team', label: 'Team Insights', icon: 'Users' },
  { href: '/dashboard/roi', label: 'ROI Calculator', icon: 'DollarSign' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: 'Bell' },
  { href: '/dashboard/prompt-governance', label: 'Prompt Governance', icon: 'Brain' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: 'Layers' },
  { href: '/dashboard/billing', label: 'Billing', icon: 'CreditCard' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
  { href: '/dashboard/admin', label: 'Admin Panel', icon: 'Shield' },
] as const;
