import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

interface RepoRiskCardProps {
  name: string;
  riskZone: 'healthy' | 'caution' | 'critical';
  debtScore: number;
  aiLocPercentage: number;
  reviewCoverage: number;
  lastScan?: string;
}

export function RepoRiskCard({
  name,
  riskZone,
  debtScore,
  aiLocPercentage,
  reviewCoverage,
  lastScan,
}: RepoRiskCardProps) {
  const zoneColors = {
    healthy: 'bg-green-500/20 text-green-400',
    caution: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  return (
    <Card className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-400" />
            <span className="font-mono text-sm text-white">{name}</span>
          </div>
          <Badge variant="outline" className={`text-xs border-0 ${zoneColors[riskZone]}`}>
            {riskZone}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Score</p>
            <p className="font-mono text-lg font-bold text-white">{debtScore}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">AI LOC</p>
            <p className="font-mono text-lg font-bold text-white">{aiLocPercentage}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Review</p>
            <p className="font-mono text-lg font-bold text-white">{reviewCoverage}%</p>
          </div>
        </div>
        {lastScan && (
          <p className="text-[10px] text-[#5a6480] mt-3">Last scanned {lastScan}</p>
        )}
      </CardContent>
    </Card>
  );
}
