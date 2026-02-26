'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { ScoreTrendChart } from '@/components/charts/score-trend-chart';
import { Play, Loader2 } from 'lucide-react';
import { useTriggerScan } from '@/hooks/use-scan';
import { toast } from 'sonner';

const repos = [
  { name: 'auth-api', aiLoc: 52, review: 48, risk: 'critical' as const, score: 42 },
  { name: 'frontend', aiLoc: 38, review: 65, risk: 'caution' as const, score: 65 },
  { name: 'payments', aiLoc: 25, review: 80, risk: 'caution' as const, score: 78 },
  { name: 'data-pipeline', aiLoc: 48, review: 40, risk: 'critical' as const, score: 55 },
  { name: 'notifications', aiLoc: 30, review: 70, risk: 'caution' as const, score: 70 },
  { name: 'admin-panel', aiLoc: 62, review: 30, risk: 'critical' as const, score: 35 },
];

const trend = [
  { month: 'Sep', score: 72 }, { month: 'Oct', score: 69 }, { month: 'Nov', score: 65 },
  { month: 'Dec', score: 61 }, { month: 'Jan', score: 64 }, { month: 'Feb', score: 68 },
];

const riskColors = {
  critical: 'bg-red-500/20 text-red-400',
  caution: 'bg-amber-500/20 text-amber-400',
  healthy: 'bg-green-500/20 text-green-400',
};

export default function AIDebtPage() {
  const { mutate: triggerScan, isPending } = useTriggerScan();

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
            <GaugeChart value={68} size={200} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Score Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={trend} />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-base">Repository Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2a4a]">
                  <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Repository</th>
                  <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">AI LOC %</th>
                  <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Review Coverage</th>
                  <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Risk Level</th>
                  <th className="text-left text-[#8892b0] text-xs uppercase py-3 px-4">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {repos.map((repo) => (
                  <tr key={repo.name} className="border-b border-[#1e2a4a] hover:bg-[#182040]">
                    <td className="py-3 px-4 font-mono text-white">{repo.name}</td>
                    <td className="py-3 px-4 font-mono text-white">{repo.aiLoc}%</td>
                    <td className="py-3 px-4 font-mono text-white">{repo.review}%</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`text-xs border-0 ${riskColors[repo.risk]}`}>{repo.risk}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{repo.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
