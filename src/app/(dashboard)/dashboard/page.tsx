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
import { FileCode, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import type { DashboardData } from '@/types/api';

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
        <p className="text-sm text-[#8892b0] mt-1">
          Last scan: {data?.last_scan ?? '--'} &middot; {data?.repos_monitored ?? 0} repos monitored
        </p>
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
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  id={alert.id}
                  severity={alert.severity as 'high' | 'medium' | 'low'}
                  title={alert.title}
                  time={alert.time}
                />
              ))
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
