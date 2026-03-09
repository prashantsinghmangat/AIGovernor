'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Shield, BarChart3, Users, ChevronRight } from 'lucide-react';
import { useReportDownload } from '@/hooks/use-report-download';

export default function ReportsPage() {
  const { downloading, downloadFullReport } = useReportDownload();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Governance Reports</h1>
          <p className="text-sm text-[#8892b0] mt-1">AI governance reports covering all repositories</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          onClick={() => downloadFullReport()}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {downloading ? 'Generating PDF…' : 'Download Executive PDF'}
        </Button>
      </div>

      {/* What's included */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BarChart3, label: 'AI Debt Score', desc: 'Company & per-repo scores' },
          { icon: Shield, label: 'Security Findings', desc: 'Vulnerabilities, PII & IaC issues' },
          { icon: FileText, label: 'Code Quality', desc: 'Grade, errors, warnings' },
          { icon: Users, label: 'Top Contributors', desc: 'AI code authorship breakdown' },
        ].map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="bg-[#131b2e] border-[#1e2a4a]">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-[#8892b0] mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report contents list */}
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-blue-400 mb-3">Report Contents</h3>
          <ul className="space-y-1.5">
            {[
              'Cover page with overall AI Debt Score and risk zone',
              'Repository overview table with per-repo scores and vulnerability counts',
              'Security findings — code vulnerabilities, dependency CVEs, infrastructure issues',
              'Code quality grades, PII detected, license compliance summary',
              'Active alerts sorted by severity',
              'Prioritized remediation guide (Fix Now / This Sprint / Backlog)',
              'Top AI code contributors with governance scores',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-blue-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#5a6480] mt-4">
            Report is generated from live scan data — results reflect the latest completed scan per repository.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
