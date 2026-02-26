import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, Users, GitBranch, Brain, BarChart3, Star, ArrowRight } from 'lucide-react';

const features = [
  { icon: Shield, title: 'Governance & Compliance', description: 'Full visibility into AI-generated code with audit trails and compliance reports.' },
  { icon: Activity, title: 'Technical Debt Monitoring', description: 'Track AI-induced technical debt before it becomes unmanageable.' },
  { icon: Users, title: 'Team Adoption Insights', description: 'Understand how your team uses AI tools and ensure quality standards.' },
  { icon: GitBranch, title: 'Repository Risk Analysis', description: 'Per-repo risk scoring identifies your most vulnerable codebases.' },
  { icon: Brain, title: 'Prompt Governance', description: 'Standardize and monitor AI prompting patterns across your org.' },
  { icon: BarChart3, title: 'Executive Reporting', description: 'Weekly governance reports for engineering leadership, exportable as PDF.' },
];

const testimonials = [
  { quote: 'CodeGuard AI gave us visibility we never had. We caught 40% unreviewed AI merges in week one.', name: 'Sarah Chen', role: 'CTO, TechScale Inc.', stars: 5 },
  { quote: 'The AI Debt Score changed how our team thinks about code quality. Essential for any serious engineering org.', name: 'Marcus Rivera', role: 'VP Engineering, DataFlow', stars: 5 },
  { quote: 'Finally, a governance tool that understands the reality of AI-assisted development.', name: 'Priya Sharma', role: 'Tech Lead, CloudNine', stars: 5 },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative px-4 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-600 dark:text-blue-400 border-blue-500/20 mb-6">AI Governance Platform</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-6">
            AI Is Writing Your Code.{' '}
            <span className="text-blue-600 dark:text-blue-600 dark:text-blue-400">Who&apos;s Governing It?</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            CodeGuard AI tracks AI-generated code, technical debt risk, and team AI adoption — giving engineering leaders full visibility and control.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-foreground px-8">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="border-border text-muted-foreground hover:text-foreground px-8">
                View Demo Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { value: '38%', label: 'AI-Generated LOC Detected', color: 'text-blue-600 dark:text-blue-600 dark:text-blue-400' },
            { value: '22%', label: 'Increase in AI-Induced Refactor Risk', color: 'text-amber-600 dark:text-amber-400' },
            { value: '47%', label: 'Reduction in Unreviewed AI Merges', color: 'text-green-600 dark:text-green-400' },
          ].map((m) => (
            <Card key={m.label} className="bg-card border-border text-center">
              <CardContent className="py-8">
                <p className={`text-4xl font-mono font-bold ${m.color} mb-2`}>{m.value}</p>
                <p className="text-sm text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">Why AI Governance Matters</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">As AI writes more code, engineering leaders need visibility into what&apos;s being generated, reviewed, and merged.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg w-fit mb-4">
                    <f.icon className="h-5 w-5 text-blue-600 dark:text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">Trusted by Engineering Leaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6">Integrates with Your Stack</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['GitHub', 'Slack', 'Jira', 'Claude', 'OpenAI', 'GitLab'].map((name) => (
              <Badge key={name} variant="outline" className="bg-card border-border text-muted-foreground px-4 py-2">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card border-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
            <CardContent className="p-12 text-center relative">
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">Ready to Govern Your AI Code?</h2>
              <p className="text-muted-foreground mb-8">Start your free 14-day trial. No credit card required.</p>
              <Link href="/signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-foreground px-8">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
