'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCard } from '@/components/dashboard/alert-card';
import { ScoreTrendChart } from '@/components/charts/score-trend-chart';
import { AIUsageChart } from '@/components/charts/ai-usage-chart';
import { RiskHeatmap } from '@/components/charts/risk-heatmap';
import { FileCode, Users, AlertTriangle, RefreshCw, Github, GitBranch, Lock, Globe, ChevronRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import type { DashboardData, RepositoryWithStats } from '@/types/api';
import { useGitHubStatus } from '@/hooks/use-github-status';
import { useRepositories } from '@/hooks/use-repositories';

function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      return json.data;
    },
  });
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: githubStatus } = useGitHubStatus();
  const { data: reposData } = useRepositories();
  const repositories: RepositoryWithStats[] = (reposData as { repositories: RepositoryWithStats[] })?.repositories ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-1 h-40" />
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const debtScore = data?.debt_score;
  const metrics = data?.metrics;
  const trendData = debtScore?.trend ?? [];
  const usageData = data?.ai_usage_trend ?? [];
  const riskData = data?.repo_risk ?? [];
  const alerts = data?.recent_alerts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Governance Dashboard</h1>
        <div className="flex items-center gap-3 text-sm text-[#8892b0] mt-1 flex-wrap">
          <span>Last scan: {data?.last_scan ?? '--'}</span>
          <span>&middot;</span>
          <span>{data?.repos_monitored ?? 0} repos monitored</span>
          {githubStatus?.github_username && (
            <>
              <span>&middot;</span>
              <span className="flex items-center gap-1">
                <Github className="h-3.5 w-3.5" />
                @{githubStatus.github_username}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-1 bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="flex items-center justify-center py-6">
            <GaugeChart value={debtScore?.score ?? 0} />
          </CardContent>
        </Card>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={FileCode}
            label="AI-Generated LOC"
            value={`${metrics?.ai_loc_percentage ?? 0}%`}
            change={metrics?.ai_loc_change ?? '--'}
            changeType="up"
            subtitle="of total codebase"
          />
          <MetricCard
            icon={Users}
            label="AI-Reviewed PRs"
            value={`${metrics?.review_coverage ?? 0}%`}
            change={metrics?.review_change ?? '--'}
            changeType="down"
            subtitle="human review rate"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Unreviewed Merges"
            value={String(metrics?.unreviewed_merges ?? 0)}
            change={metrics?.unreviewed_change ?? '--'}
            changeType="up"
            subtitle="this week"
          />
          <MetricCard
            icon={RefreshCw}
            label="Refactor Backlog"
            value={`${metrics?.refactor_backlog_growth ?? 0}%`}
            change="--"
            changeType="up"
            subtitle="growth rate"
          />
        </div>
      </div>

      {/* Monitored Repositories */}
      {repositories.length > 0 && (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">Monitored Repositories</CardTitle>
            <Link href="/dashboard/repositories" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {repositories.map((repo) => {
                const riskColors: Record<string, string> = {
                  healthy: 'text-green-400 bg-green-500/10',
                  caution: 'text-amber-400 bg-amber-500/10',
                  critical: 'text-red-400 bg-red-500/10',
                };
                const riskColor = riskColors[repo.risk_zone ?? ''] ?? 'text-gray-400 bg-gray-500/10';
                return (
                  <Link
                    key={repo.id}
                    href={`/dashboard/repositories/${repo.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0d1321] border border-[#1e2a4a] hover:border-[#253358] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 bg-blue-500/10 rounded">
                        <GitBranch className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{repo.full_name}</span>
                          {repo.is_private ? (
                            <Lock className="h-3 w-3 text-[#5a6480] shrink-0" />
                          ) : (
                            <Globe className="h-3 w-3 text-[#5a6480] shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5a6480] mt-0.5">
                          {repo.language && <span>{repo.language}</span>}
                          {repo.latest_scan_at && (
                            <>
                              {repo.language && <span>&middot;</span>}
                              <span>Scanned {new Date(repo.latest_scan_at).toLocaleDateString()}</span>
                            </>
                          )}
                          {!repo.latest_scan_at && <span>Not scanned yet</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {repo.vulnerabilities && repo.vulnerabilities.total > 0 && (
                        <div className="flex items-center gap-1 text-right">
                          <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-mono text-red-400">{repo.vulnerabilities.total}</span>
                        </div>
                      )}
                      {repo.debt_score != null && (
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-white">{repo.debt_score}</div>
                          <div className="text-[10px] text-[#5a6480]">score</div>
                        </div>
                      )}
                      {repo.risk_zone && (
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${riskColor}`}>
                          {repo.risk_zone}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-[#5a6480] group-hover:text-blue-400 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {usageData.length > 0 ? (
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-white text-base">AI Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <AIUsageChart data={usageData} />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-white text-base">AI Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px]">
              <p className="text-sm text-[#5a6480]">No usage data available yet. Run scans to generate data.</p>
            </CardContent>
          </Card>
        )}
        {trendData.length > 0 ? (
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-white text-base">AI Debt Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreTrendChart data={trendData} />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-white text-base">AI Debt Score Trend</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px]">
              <p className="text-sm text-[#5a6480]">No score data yet. Scores are calculated after scans.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Repository Risk Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <RiskHeatmap data={riskData} />
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-[#5a6480]">No repository risk data available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const description = [
                  alert.description,
                  alert.repository_name ? `Repo: ${alert.repository_name}` : null,
                ].filter(Boolean).join(' — ') || undefined;

                const card = (
                  <AlertCard
                    key={alert.id}
                    id={alert.id}
                    severity={alert.severity as 'high' | 'medium' | 'low'}
                    title={alert.title}
                    description={description}
                    time={alert.time}
                  />
                );

                return alert.repository_id ? (
                  <Link key={alert.id} href={`/dashboard/repositories/${alert.repository_id}`}>
                    {card}
                  </Link>
                ) : (
                  <div key={alert.id}>{card}</div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-[#5a6480]">No active alerts. Everything looks good!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
