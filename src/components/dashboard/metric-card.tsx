import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function MetricCard({ icon: Icon, label, value, change, changeType = 'neutral', subtitle }: MetricCardProps) {
  const changeColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    neutral: 'text-gray-400',
  };

  const ChangeIcon = changeType === 'up' ? ArrowUp : changeType === 'down' ? ArrowDown : Minus;

  return (
    <Card className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Icon className="h-4 w-4 text-blue-400" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 text-xs ${changeColors[changeType]}`}>
              <ChangeIcon className="h-3 w-3" />
              <span className="font-mono">{change}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-[#8892b0] mb-1">{label}</p>
        <p className="text-2xl font-mono font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-[#5a6480] mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
