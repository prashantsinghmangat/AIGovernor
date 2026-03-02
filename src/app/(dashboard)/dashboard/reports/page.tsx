'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, FileText, Shield, BarChart3, Users, ChevronRight } from 'lucide-react';
import { useReportDownload } from '@/hooks/use-report-download';

export default function ReportsPage() {
  const { downloading, downloadFullReport } = useReportDownload();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Governance Reports</h1>
          <p className="text-sm text-[#8892b0] mt-1">AI governance reports covering all repositories</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Report sections preview */}
      <Card className="bg-[#131b2e] border-[#1e2a4a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-lg">Executive PDF Report</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-400 border-0">All Repositories</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div>
            <h3 className="text-sm font-medium text-blue-400 mb-2">Report Contents</h3>
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
          </div>

          <div className="pt-4 border-t border-[#1e2a4a]">
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
              {downloading ? 'Generating PDF…' : 'Download Full Report'}
            </Button>
            <p className="text-xs text-[#8892b0] mt-2">
              Report is generated from live scan data — results reflect the latest completed scan per repository.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
