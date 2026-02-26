'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GitHubRepoItem } from '@/types/api';

export function useAddRepositories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (github_repos: GitHubRepoItem[]) => {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repos }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to add repositories');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}
