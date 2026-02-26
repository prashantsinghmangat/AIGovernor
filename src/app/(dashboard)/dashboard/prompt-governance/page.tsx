import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Brain, FileText, AlertTriangle } from 'lucide-react';

export default function PromptGovernancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Prompt Governance</h1>
        <p className="text-sm text-[#8892b0] mt-1">Monitor and standardize AI prompting patterns</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={Brain} label="Prompt Consistency" value="Medium" subtitle="across team" />
        <MetricCard icon={FileText} label="Templates" value="12" subtitle="active templates" />
        <MetricCard icon={AlertTriangle} label="Inconsistencies" value="8" subtitle="detected this week" />
      </div>
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-base">Detected Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Code Generation', count: 45, quality: 'good' },
              { name: 'Bug Fix Requests', count: 28, quality: 'moderate' },
              { name: 'Refactoring', count: 19, quality: 'good' },
              { name: 'Test Generation', count: 15, quality: 'poor' },
              { name: 'Documentation', count: 12, quality: 'good' },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-[#1e2a4a] last:border-0">
                <span className="text-sm text-white">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[#8892b0]">{p.count} uses</span>
                  <Badge variant="outline" className={`text-xs border-0 ${
                    p.quality === 'good' ? 'bg-green-500/20 text-green-400' :
                    p.quality === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{p.quality}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
