import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Lock, Globe, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';

interface RepoRiskCardProps {
  id: string;
  name: string;
  fullName: string;
  language: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  riskZone: string | null;
  debtScore: number | null;
  lastScanAt: string | null;
  onUnlink?: (id: string, fullName: string) => void;
}

const zoneColors: Record<string, string> = {
  healthy: 'bg-green-500/20 text-green-400',
  caution: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
};

export function RepoRiskCard({
  id,
  name,
  fullName,
  language,
  defaultBranch,
  isPrivate,
  riskZone,
  debtScore,
  lastScanAt,
  onUnlink,
}: RepoRiskCardProps) {
  return (
    <Card className="group relative bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
      <CardContent className="p-5">
        {/* Header: name + risk badge */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/dashboard/repositories/${id}`}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <GitBranch className="h-4 w-4 shrink-0 text-blue-400" />
            <span className="font-mono text-sm text-white truncate">{name}</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {riskZone && (
              <Badge
                variant="outline"
                className={`text-xs border-0 ${zoneColors[riskZone] || 'bg-[#1e2a4a] text-[#8892b0]'}`}
              >
                {riskZone}
              </Badge>
            )}
            {onUnlink && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#5a6480] hover:text-red-400"
                onClick={(e) => {
                  e.preventDefault();
                  onUnlink(id, fullName);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Meta: language, branch, visibility */}
        <div className="flex items-center gap-2 mb-4 text-[10px] text-[#5a6480]">
          {language && (
            <Badge variant="outline" className="border-[#1e2a4a] text-[10px] text-[#8892b0] px-1.5 py-0">
              {language}
            </Badge>
          )}
          <span>{defaultBranch}</span>
          {isPrivate ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Globe className="h-3 w-3" />
          )}
        </div>

        {/* Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Debt Score</p>
            <p className="font-mono text-lg font-bold text-white">
              {debtScore !== null ? debtScore : '--'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#5a6480] uppercase mb-1">Last Scan</p>
            <p className="text-xs text-[#8892b0]">
              {lastScanAt ? formatRelativeTime(lastScanAt) : 'Never'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
