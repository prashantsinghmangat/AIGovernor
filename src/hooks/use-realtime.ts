'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useRealtimeAlerts(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast.warning((payload.new as { title: string }).title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, supabase, queryClient]);
}
