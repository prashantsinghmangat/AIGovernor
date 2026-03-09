'use client';

import { useQuery } from '@tanstack/react-query';

export function usePullRequests(
  repositoryId?: string,
  state: string = 'all',
  limit: number = 50,
) {
  return useQuery({
    queryKey: ['pull-requests', repositoryId, state, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repositoryId) params.set('repository_id', repositoryId);
      if (state !== 'all') params.set('state', state);
      params.set('limit', String(limit));
      const res = await fetch(`/api/pull-requests?${params}`);
      if (!res.ok) throw new Error('Failed to fetch pull requests');
      return res.json();
    },
  });
}
