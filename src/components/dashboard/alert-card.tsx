'use client';

import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils/format';

interface AlertCardProps {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  time: string;
  onDismiss?: (id: string) => void;
}

export function AlertCard({ id, severity, title, description, time, onDismiss }: AlertCardProps) {
  const severityConfig = {
    high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', badge: 'bg-red-500/20 text-red-400' },
    medium: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', badge: 'bg-amber-500/20 text-amber-400' },
    low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', badge: 'bg-blue-500/20 text-blue-400' },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className="bg-[#131b2e] border-[#1e2a4a] hover:border-[#253358] transition-colors p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{title}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badge} border-0`}>
              {severity}
            </Badge>
          </div>
          {description && (
            <p className="text-xs text-[#8892b0] line-clamp-2 mb-2">{description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#5a6480]">{formatRelativeTime(time)}</span>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-[#5a6480] hover:text-white"
                onClick={() => onDismiss(id)}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
