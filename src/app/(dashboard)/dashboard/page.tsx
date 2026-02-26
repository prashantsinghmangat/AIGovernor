'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCard } from '@/components/dashboard/alert-card';
import { ScoreTrendChart } from '@/components/charts/score-trend-chart';
import { AIUsageChart } from '@/components/charts/ai-usage-chart';
import { RiskHeatmap } from '@/components/charts/risk-heatmap';
import { FileCode, Users, AlertTriangle, RefreshCw } from 'lucide-react';

const mockTrend = [
  { month: 'Sep', score: 72 }, { month: 'Oct', score: 69 }, { month: 'Nov', score: 65 },
  { month: 'Dec', score: 61 }, { month: 'Jan', score: 64 }, { month: 'Feb', score: 68 },
];

const mockUsage = [
  { week: 'W1', ai_loc: 2400, human_loc: 5600 },
  { week: 'W2', ai_loc: 2800, human_loc: 5200 },
  { week: 'W3', ai_loc: 3200, human_loc: 4800 },
  { week: 'W4', ai_loc: 3600, human_loc: 4400 },
];

const mockRisk = [
  { repo: 'auth-api', risk_score: 58, risk_level: 'critical' },
  { repo: 'frontend', risk_score: 35, risk_level: 'caution' },
  { repo: 'payments', risk_score: 22, risk_level: 'healthy' },
  { repo: 'data-pipeline', risk_score: 45, risk_level: 'critical' },
  { repo: 'notifications', risk_score: 30, risk_level: 'caution' },
  { repo: 'admin-panel', risk_score: 65, risk_level: 'critical' },
];

const mockAlerts = [
  { id: '1', severity: 'high' as const, title: 'High AI-generated code in auth module', time: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', severity: 'high' as const, title: 'Low human review coverage in backend PRs', time: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', severity: 'medium' as const, title: 'Spike in AI refactor suggestions ignored', time: new Date(Date.now() - 14400000).toISOString() },
  { id: '4', severity: 'low' as const, title: 'New team member AI governance onboarding pending', time: new Date(Date.now() - 86400000).toISOString() },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Governance Dashboard</h1>
        <p className="text-sm text-[#8892b0] mt-1">Last scan: 2 hours ago · 6 repos monitored</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-1 bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="flex items-center justify-center py-6">
            <GaugeChart value={68} />
          </CardContent>
        </Card>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={FileCode} label="AI-Generated LOC" value="42%" change="+4.2%" changeType="up" subtitle="of total codebase" />
          <MetricCard icon={Users} label="AI-Reviewed PRs" value="61%" change="+2.3%" changeType="down" subtitle="human review rate" />
          <MetricCard icon={AlertTriangle} label="Unreviewed Merges" value="6" change="+2" changeType="up" subtitle="this week" />
          <MetricCard icon={RefreshCw} label="Refactor Backlog" value="12%" change="+3.1%" changeType="up" subtitle="growth rate" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">AI Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <AIUsageChart data={mockUsage} />
          </CardContent>
        </Card>
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">AI Debt Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={mockTrend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Repository Risk Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskHeatmap data={mockRisk} />
          </CardContent>
        </Card>
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => (
              <AlertCard key={alert.id} {...alert} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
