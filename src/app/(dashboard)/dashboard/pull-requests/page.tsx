'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { usePullRequests } from '@/hooks/use-pull-requests';
import {
  GitPullRequest, Shield, Bot, Eye, AlertTriangle,
  CheckCircle, XCircle, GitMerge, ExternalLink, FileCode,
} from 'lucide-react';

type PRState = 'all' | 'open' | 'closed' | 'merged';

interface FindingsSummary {
  total_vulnerabilities?: { critical: number; high: number; medium: number; low: number; total: number };
  total_quality_issues?: { errors: number; warnings: number; infos: number; worst_grade: string };
  total_enhancements?: { high: number; medium: number; low: number; total: number };
  total_ai_loc?: number;
  total_loc_analyzed?: number;
  ai_loc_percentage?: number;
  avg_ai_probability?: number;
  pii_findings?: number;
  risk_files?: number;
}

interface PullRequest {
  id: string;
  github_pr_number: number;
  title: string;
  author: string;
  state: string;
  ai_generated: boolean;
  ai_probability: number;
  ai_loc_added: number;
  total_loc_added: number;
  files_changed: number;
  human_reviewed: boolean;
  review_count: number;
  findings_posted: boolean;
  findings_summary: FindingsSummary | null;
  pr_created_at: string | null;
  analyzed_at: string | null;
  repository?: { id: string; name: string; full_name: string };
}

function stateIcon(state: string) {
  switch (state) {
    case 'open': return <GitPullRequest className="h-4 w-4 text-green-400" />;
    case 'merged': return <GitMerge className="h-4 w-4 text-purple-400" />;
    case 'closed': return <XCircle className="h-4 w-4 text-red-400" />;
    default: return <GitPullRequest className="h-4 w-4 text-gray-400" />;
  }
}

function severityBadge(severity: string, count: number) {
  if (count === 0) return null;
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[severity] || ''}`}>
      {count} {severity}
    </Badge>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PullRequestsPage() {
  const [stateFilter, setStateFilter] = useState<PRState>('all');
  const { data, isLoading } = usePullRequests(undefined, stateFilter);

  const pullRequests: PullRequest[] = data?.data?.pull_requests ?? [];
  const stats = data?.data?.stats ?? { total: 0, ai_generated: 0, unreviewed_ai: 0, with_vulnerabilities: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">PR Analysis</h1>
          <p className="text-sm text-[#8892b0] mt-1">
            Automated code review for every pull request — vulnerabilities, AI detection, code quality
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={GitPullRequest}
          label="Total PRs Analyzed"
          value={isLoading ? '...' : String(stats.total)}
        />
        <MetricCard
          icon={Bot}
          label="AI-Generated PRs"
          value={isLoading ? '...' : String(stats.ai_generated)}
          subtitle={stats.total > 0 ? `${Math.round((stats.ai_generated / stats.total) * 100)}% of total` : undefined}
        />
        <MetricCard
          icon={Eye}
          label="Unreviewed AI PRs"
          value={isLoading ? '...' : String(stats.unreviewed_ai)}
          changeType={stats.unreviewed_ai > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          icon={Shield}
          label="PRs with Vulnerabilities"
          value={isLoading ? '...' : String(stats.with_vulnerabilities)}
          changeType={stats.with_vulnerabilities > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'open', 'merged', 'closed'] as const).map((s) => (
          <Button
            key={s}
            variant={stateFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStateFilter(s)}
            className={stateFilter === s ? 'bg-blue-600 text-white' : 'border-[#1e2a4a] text-[#8892b0]'}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* PR List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-[#131b2e]" />
          ))}
        </div>
      ) : pullRequests.length === 0 ? (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="p-12 text-center">
            <GitPullRequest className="h-12 w-12 text-[#5a6480] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Pull Requests Analyzed Yet</h3>
            <p className="text-sm text-[#8892b0] max-w-md mx-auto">
              PR analysis runs automatically when pull requests are opened or updated on connected repositories.
              Make sure your repositories have webhooks configured.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pullRequests.map((pr) => {
            const findings = pr.findings_summary;
            const vulns = findings?.total_vulnerabilities;
            const hasVulns = vulns && vulns.total > 0;
            const quality = findings?.total_quality_issues;

            return (
              <Card key={pr.id} className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* State icon */}
                    <div className="mt-1">{stateIcon(pr.state)}</div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{pr.title}</span>
                        <span className="text-xs text-[#5a6480] font-mono">#{pr.github_pr_number}</span>
                        {pr.ai_generated && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                            <Bot className="h-3 w-3 mr-1" /> AI Generated
                          </Badge>
                        )}
                        {pr.findings_posted && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" /> Review Posted
                          </Badge>
                        )}
                        {!pr.human_reviewed && pr.ai_generated && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Needs Review
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#8892b0]">
                        <span>{pr.author}</span>
                        {pr.repository && (
                          <>
                            <span className="text-[#5a6480]">in</span>
                            <span className="font-mono">{pr.repository.name}</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" /> {pr.files_changed} files
                        </span>
                        <span className="text-green-400">+{pr.total_loc_added}</span>
                        {pr.ai_loc_added > 0 && (
                          <span className="text-purple-400">
                            ({Math.round(pr.ai_probability * 100)}% AI)
                          </span>
                        )}
                        <span>{timeAgo(pr.pr_created_at || pr.analyzed_at)}</span>
                      </div>

                      {/* Findings summary */}
                      {findings && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {hasVulns && (
                            <>
                              {severityBadge('critical', vulns.critical)}
                              {severityBadge('high', vulns.high)}
                              {severityBadge('medium', vulns.medium)}
                              {severityBadge('low', vulns.low)}
                            </>
                          )}
                          {!hasVulns && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" /> No vulnerabilities
                            </Badge>
                          )}
                          {quality && quality.errors > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                              Grade {quality.worst_grade} ({quality.errors}E, {quality.warnings}W)
                            </Badge>
                          )}
                          {findings.total_enhancements && findings.total_enhancements.total > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                              {findings.total_enhancements.total} suggestions
                            </Badge>
                          )}
                          {findings.pii_findings && findings.pii_findings > 0 && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" /> {findings.pii_findings} PII
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Review status */}
                    <div className="text-right shrink-0">
                      {pr.human_reviewed ? (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Reviewed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-[#5a6480]">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
