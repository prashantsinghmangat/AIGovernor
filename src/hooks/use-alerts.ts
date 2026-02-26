'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAlerts(status = 'active', severity?: string) {
  return useQuery({
    queryKey: ['alerts', status, severity],
    queryFn: async () => {
      const params = new URLSearchParams({ status });
      if (severity && severity !== 'all') params.set('severity', severity);
      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
