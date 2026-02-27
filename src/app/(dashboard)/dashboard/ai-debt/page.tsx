'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { ScoreTrendChart } from '@/components/charts/score-trend-chart';
import { Play, Loader2, BarChart3Icon } from 'lucide-react';
import { useTriggerScan } from '@/hooks/use-scan';
import { useScores } from '@/hooks/use-scores';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { toast } from 'sonner';

const riskColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  caution: 'bg-amber-500/20 text-amber-400',
  healthy: 'bg-green-500/20 text-green-400',
  unknown: 'bg-gray-500/20 text-gray-400',
};

interface RepoScore {
  repository_id: string;
  repository_name: string;
  score: number;
  risk_zone: string;
  ai_loc_percentage: number;
  review_coverage: number;
}

interface TrendPoint {
  date: string;
  score: number;
  risk_zone: string;
}

export default function AIDebtPage() {
  const { mutate: triggerScan, isPending } = useTriggerScan();
  const { data: response, isLoading } = useScores();

  const scoresData = response?.data as {
    current_score: { score: number; risk_zone: string; change: number; breakdown: Record<string, number> };
    trend: TrendPoint[];
    by_repository: RepoScore[];
  } | undefined;

  const currentScore = scoresData?.current_score?.score ?? 0;
  const repos = scoresData?.by_repository ?? [];
  const trend = (scoresData?.trend ?? []).map((t) => ({
    month: new Date(t.date).toLocaleDateString('en', { month: 'short' }),
    score: t.score,
  }));

  const handleRunScan = () => {
    triggerScan(
      { scan_type: 'full' },
      {
        onSuccess: (res) => {
          const count = res.data?.scan_ids?.length || 0;
          toast.success(`Governance scan queued for ${count} repository${count !== 1 ? 'ies' : ''}`);
        },
        onError: () => {
          toast.error('Failed to trigger scan. Make sure you have repositories connected.');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">AI Debt Analysis</h1>
          <p className="text-sm text-[#8892b0] mt-1">Track and manage AI-generated technical debt</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRunScan} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          {isPending ? 'Scanning...' : 'Run Governance Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a] flex items-center justify-center">
          <CardContent className="py-6">
            {isLoading ? <LoadingSpinner /> : <GaugeChart value={currentScore} size={200} />}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
            ) : trend.length > 0 ? (
              <ScoreTrendChart data={trend} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3Icon className="h-8 w-8 text-[#5a6480] mb-2" />
                <p className="text-[#5a6480] text-sm">Run scans to build score history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-base">Repository Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
          ) : repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3Icon className="h-8 w-8 text-[#5a6480] mb-2" />
              <p className="text-[#8892b0] text-sm font-medium">No repository scores yet</p>
              <p className="text-[#5a6480] text-xs mt-1">Run a governance scan to analyze your repositories.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2a4a]">
                    <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Repository</th>
                    <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">AI LOC %</th>
                    <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Review Coverage</th>
                    <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Risk Level</th>
                    <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Debt Score</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo) => {
                    const scoreColor = repo.score >= 80 ? 'text-green-400' : repo.score >= 60 ? 'text-amber-400' : 'text-red-400';
                    return (
                      <tr key={repo.repository_id} className="border-b border-[#1e2a4a] hover:bg-[#182040]">
                        <td className="py-3 px-4 font-mono text-white">{repo.repository_name}</td>
                        <td className="py-3 px-4 font-mono text-white">{repo.ai_loc_percentage}%</td>
                        <td className="py-3 px-4 font-mono text-white">{repo.review_coverage}%</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`text-xs border-0 ${riskColors[repo.risk_zone] || riskColors.unknown}`}>
                            {repo.risk_zone}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 font-mono font-bold ${scoreColor}`}>{repo.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-base">Scoring Formula</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="font-mono text-sm text-[#8892b0] bg-[#0a0e1a] p-4 rounded-lg overflow-x-auto">
{`AI Debt Score = 100 - (
  w1 × AI_LOC_Ratio × 100 +        // Weight: 0.30
  w2 × (1 - Review_Coverage) × 100 + // Weight: 0.30
  w3 × Refactor_Growth × 100 +       // Weight: 0.20
  w4 × Prompt_Inconsistency × 100    // Weight: 0.20
)

Score ≥ 80 → Healthy (Green)
Score ≥ 60 → Caution (Amber)
Score < 60 → Critical (Red)`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
