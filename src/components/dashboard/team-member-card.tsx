import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamMemberCardProps {
  name: string;
  username: string;
  aiUsage: 'high' | 'medium' | 'low';
  reviewQuality: 'strong' | 'moderate' | 'weak';
  riskIndex: 'high' | 'medium' | 'low';
  score: number;
  aiPrs: number;
  totalPrs: number;
}

export function TeamMemberCard({
  name,
  username,
  aiUsage,
  reviewQuality,
  riskIndex,
  score,
  aiPrs,
  totalPrs,
}: TeamMemberCardProps) {
  const levelColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-green-500/20 text-green-400',
  };
  const qualityColors = {
    strong: 'bg-green-500/20 text-green-400',
    moderate: 'bg-amber-500/20 text-amber-400',
    weak: 'bg-red-500/20 text-red-400',
  };

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <Card className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-[#5a6480] font-mono">@{username}</p>
          </div>
          <Badge variant="outline" className={`ml-auto text-xs border-0 ${levelColors[riskIndex]}`}>
            {riskIndex} risk
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">AI Usage</p>
            <Badge variant="outline" className={`text-xs border-0 ${levelColors[aiUsage]}`}>{aiUsage}</Badge>
          </div>
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Quality</p>
            <Badge variant="outline" className={`text-xs border-0 ${qualityColors[reviewQuality]}`}>{reviewQuality}</Badge>
          </div>
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Score</p>
            <p className={`font-mono text-lg font-bold ${scoreColor}`}>{score}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">AI PRs</p>
            <p className="font-mono text-lg font-bold text-white">{aiPrs}/{totalPrs}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
