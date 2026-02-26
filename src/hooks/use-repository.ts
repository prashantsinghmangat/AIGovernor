'use client';

import { useQuery } from '@tanstack/react-query';
import type { RepositoryDetail } from '@/types/api';

export function useRepository(id: string) {
  return useQuery<RepositoryDetail>({
    queryKey: ['repository', id],
    queryFn: async () => {
      const res = await fetch(`/api/repositories/${id}`);
      if (!res.ok) throw new Error('Failed to fetch repository');
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
  });
}
