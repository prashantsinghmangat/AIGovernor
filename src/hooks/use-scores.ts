'use client';

import { useQuery } from '@tanstack/react-query';

export function useScores(repositoryId?: string) {
  return useQuery({
    queryKey: ['scores', repositoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repositoryId) params.set('repository_id', repositoryId);
      const res = await fetch(`/api/scores?${params}`);
      if (!res.ok) throw new Error('Failed to fetch scores');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
