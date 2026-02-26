'use client';

import { useQuery } from '@tanstack/react-query';

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      return res.json();
    },
  });
}
