'use client';

import { useQuery } from '@tanstack/react-query';

export function useScanCompare(baseId: string | null, headId: string | null) {
  return useQuery({
    queryKey: ['scan-compare', baseId, headId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/compare?base=${baseId}&head=${headId}`);
      if (!res.ok) throw new Error('Failed to compare scans');
      return res.json();
    },
    enabled: !!baseId && !!headId,
  });
}

export function useScanHistory(repositoryId?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['scan-history', repositoryId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (repositoryId) params.set('repository_id', repositoryId);
      const res = await fetch(`/api/scan/history?${params}`);
      if (!res.ok) throw new Error('Failed to fetch scan history');
      return res.json();
    },
  });
}
