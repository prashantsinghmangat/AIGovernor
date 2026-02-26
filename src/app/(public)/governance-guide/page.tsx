import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GovernanceGuidePage() {
  return (
    <div className="px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold text-white mb-4">AI Governance Guide</h1>
          <p className="text-lg text-[#8892b0]">Best practices for governing AI-generated code in your engineering organization.</p>
        </div>
        <div className="space-y-8">
          {[
            { title: '1. Establish AI Code Policies', content: 'Define clear policies for when and how AI tools can be used for code generation. Set review requirements for AI-generated PRs and establish quality thresholds.' },
            { title: '2. Monitor AI Usage Metrics', content: 'Track the percentage of AI-generated code, review coverage rates, and team adoption patterns. Use the AI Debt Score to monitor overall governance health.' },
            { title: '3. Implement Review Requirements', content: 'Require human review for all AI-generated PRs above a certain size. Use automated alerts to catch unreviewed AI merges before they accumulate.' },
            { title: '4. Standardize Prompting Practices', content: 'Create prompt templates and guidelines for your team. Consistent prompting leads to more predictable and maintainable code output.' },
            { title: '5. Regular Governance Reporting', content: 'Share weekly governance reports with engineering leadership. Use the ROI calculator to demonstrate the value of governance investment.' },
          ].map((section) => (
            <Card key={section.title} className="bg-[#131b2e] border-[#1e2a4a]">
              <CardHeader>
                <CardTitle className="text-white text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8892b0] leading-relaxed">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
