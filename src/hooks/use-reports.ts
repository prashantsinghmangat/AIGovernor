'use client';

import { useQuery } from '@tanstack/react-query';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });
}
