import { Card, CardContent } from '@/components/ui/card';
import { Shield, Activity, Users, GitBranch, Brain, BarChart3, Bell, FileText } from 'lucide-react';

const features = [
  { icon: Shield, title: 'AI Code Detection', description: 'Multi-signal detection engine identifies AI-generated code using metadata analysis, style fingerprinting, and ML classification.' },
  { icon: Activity, title: 'AI Debt Score', description: 'Proprietary scoring algorithm (0-100) tracks technical debt from AI-generated code across your entire codebase.' },
  { icon: Users, title: 'Team Governance', description: 'Per-developer insights on AI usage, review quality, and governance compliance with coaching suggestions.' },
  { icon: GitBranch, title: 'Repository Monitoring', description: 'Connect GitHub repositories and get real-time monitoring of commits, PRs, and code changes.' },
  { icon: Brain, title: 'Prompt Governance', description: 'Track and standardize AI prompting patterns across your team for consistent code quality.' },
  { icon: BarChart3, title: 'Executive Reports', description: 'Automated weekly governance reports with risk summaries, recommendations, and PDF export.' },
  { icon: Bell, title: 'Smart Alerts', description: 'Configurable alerts for risk threshold breaches, unreviewed AI merges, and governance violations.' },
  { icon: FileText, title: 'Audit Trail', description: 'Complete audit log of all governance actions, scan results, and configuration changes.' },
];

export default function FeaturesPage() {
  return (
    <div className="px-4 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold text-white mb-4">Features</h1>
          <p className="text-lg text-[#8892b0] max-w-2xl mx-auto">Everything you need to govern AI-generated code in your engineering organization.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
              <CardContent className="p-6 flex gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-[#8892b0]">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
