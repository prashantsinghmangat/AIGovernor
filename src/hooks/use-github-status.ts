'use client';

import { useQuery } from '@tanstack/react-query';
import type { GitHubStatusData } from '@/types/api';

export function useGitHubStatus() {
  return useQuery<GitHubStatusData>({
    queryKey: ['github-status'],
    queryFn: async () => {
      const res = await fetch('/api/github/status');
      if (!res.ok) throw new Error('Failed to fetch GitHub status');
      const json = await res.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
