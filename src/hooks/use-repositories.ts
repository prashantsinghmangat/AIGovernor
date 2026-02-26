'use client';

import { useQuery } from '@tanstack/react-query';

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const res = await fetch('/api/repositories');
      if (!res.ok) throw new Error('Failed to fetch repositories');
      const json = await res.json();
      return json.data;
    },
  });
}
