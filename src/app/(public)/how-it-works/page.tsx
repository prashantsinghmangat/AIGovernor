import { Card, CardContent } from '@/components/ui/card';
import { GitBranch, Scan, BarChart3, Bell } from 'lucide-react';

const steps = [
  { icon: GitBranch, step: '01', title: 'Connect GitHub', description: 'Connect your GitHub organization via OAuth. Select which repositories to monitor.' },
  { icon: Scan, step: '02', title: 'Automated Scanning', description: 'Our detection engine analyzes commits, PRs, and code diffs for AI-generated patterns.' },
  { icon: BarChart3, step: '03', title: 'Get Your AI Debt Score', description: 'Receive a comprehensive governance score with per-repo breakdown and team insights.' },
  { icon: Bell, step: '04', title: 'Continuous Monitoring', description: 'Real-time alerts and weekly reports keep you informed of governance changes.' },
];

export default function HowItWorksPage() {
  return (
    <div className="px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold text-white mb-4">How It Works</h1>
          <p className="text-lg text-[#8892b0]">Four simple steps to full AI governance visibility.</p>
        </div>
        <div className="space-y-6">
          {steps.map((s) => (
            <Card key={s.step} className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-6 flex items-start gap-6">
                <div className="shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <s.icon className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-blue-400">STEP {s.step}</span>
                  <h3 className="text-xl font-display font-semibold text-white mt-1 mb-2">{s.title}</h3>
                  <p className="text-sm text-[#8892b0]">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
