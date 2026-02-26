'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ChevronRight } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Governance Reports</h1>
          <p className="text-sm text-[#8892b0] mt-1">Weekly AI governance reports and insights</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="h-4 w-4 mr-2" /> Download Executive PDF
        </Button>
      </div>

      <Card className="bg-[#131b2e] border-[#1e2a4a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-lg">Weekly Report — Feb 17–23, 2026</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-400 border-0">Latest</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div>
            <h3 className="text-sm font-medium text-blue-400 mb-2">AI Usage Summary</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-blue-400" /> 42% of codebase is AI-generated (+4.2% from last week)
              </li>
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-blue-400" /> 28 AI-generated PRs detected, 17 (61%) human-reviewed
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-400 mb-2">Risk Summary</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-amber-400" /> AI Debt Score: 68 (+4 from last week)
              </li>
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-red-400" /> High-risk repos: auth-api, admin-panel
              </li>
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-amber-400" /> 6 new alerts this week
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-400 mb-2">Recommendations</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-green-400" /> Schedule focused review session for Auth API
              </li>
              <li className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                <ChevronRight className="h-3 w-3 text-green-400" /> Implement mandatory AI code review for PRs &gt; 200 LOC
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
