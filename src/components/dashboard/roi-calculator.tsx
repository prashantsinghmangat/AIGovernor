'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

export function ROICalculator() {
  const [teamSize, setTeamSize] = useState(25);
  const [avgSalary, setAvgSalary] = useState(2500000);
  const [toolCost, setToolCost] = useState(2000);

  const productivityGain = (teamSize * avgSalary * 0.12) / 12;
  const debtSavings = (teamSize * avgSalary * 0.05) / 12;
  const totalCost = toolCost * teamSize;
  const netROI = productivityGain + debtSavings - totalCost;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Input Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#8892b0] flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Size
            </Label>
            <Input
              type="number"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="bg-[#0a0e1a] border-[#1e2a4a] text-white font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0] flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Average Annual Salary (INR)
            </Label>
            <Input
              type="number"
              value={avgSalary}
              onChange={(e) => setAvgSalary(Number(e.target.value))}
              className="bg-[#0a0e1a] border-[#1e2a4a] text-white font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0] flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> AI Tool Cost / Person / Month (INR)
            </Label>
            <Input
              type="number"
              value={toolCost}
              onChange={(e) => setToolCost(Number(e.target.value))}
              className="bg-[#0a0e1a] border-[#1e2a4a] text-white font-mono"
            />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="bg-[#131b2e] border-[#1e2a4a] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-sm text-[#8892b0]">Estimated Monthly Net ROI</span>
            </div>
            <p className={`text-3xl font-mono font-bold ${netROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(netROI)}
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardContent className="p-4">
              <p className="text-xs text-[#8892b0] mb-1">Productivity Gain</p>
              <p className="text-lg font-mono font-bold text-blue-400">{formatCurrency(productivityGain)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardContent className="p-4">
              <p className="text-xs text-[#8892b0] mb-1">Debt Mitigation</p>
              <p className="text-lg font-mono font-bold text-amber-400">{formatCurrency(debtSavings)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
