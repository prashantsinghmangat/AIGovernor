'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/dashboard/alert-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts, useDismissAlert } from '@/hooks/use-alerts';
import { toast } from 'sonner';

export default function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const { data, isLoading } = useAlerts('active', filter === 'all' ? undefined : filter);
  const { mutate: dismissAlert } = useDismissAlert();

  const alerts = data?.data?.alerts ?? [];
  const total = data?.data?.total ?? 0;

  const handleDismiss = (id: string) => {
    dismissAlert(
      { id, newStatus: 'dismissed' },
      {
        onSuccess: () => toast.success('Alert dismissed'),
        onError: () => toast.error('Failed to dismiss alert'),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Alerts & Notifications</h1>
        <p className="text-sm text-[#8892b0] mt-1">
          Active governance alerts and risk notifications
          {!isLoading && ` (${total} total)`}
        </p>
      </div>
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter === s ? 'bg-blue-600 text-white' : 'border-[#1e2a4a] text-[#8892b0]'}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-[#1e2a4a] rounded-lg" />
          ))
        ) : alerts.length > 0 ? (
          alerts.map((alert: {
            id: string;
            severity: string;
            title: string;
            description: string;
            repository_name: string | null;
            created_at: string;
          }) => (
            <AlertCard
              key={alert.id}
              id={alert.id}
              severity={alert.severity as 'high' | 'medium' | 'low'}
              title={alert.title}
              description={
                [alert.description, alert.repository_name ? `Repo: ${alert.repository_name}` : null]
                  .filter(Boolean)
                  .join(' — ')
              }
              time={alert.created_at}
              onDismiss={handleDismiss}
            />
          ))
        ) : (
          <p className="text-center text-[#5a6480] py-12">No alerts to show</p>
        )}
      </div>
    </div>
  );
}
