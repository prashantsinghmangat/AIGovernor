'use client';

import { useQuery } from '@tanstack/react-query';
import type { GitHubRepoItem } from '@/types/api';

export function useGitHubRepos(enabled = true) {
  return useQuery<{ repos: GitHubRepoItem[]; github_username: string }>({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const res = await fetch('/api/github/repos');
      if (!res.ok) throw new Error('Failed to fetch GitHub repos');
      const json = await res.json();
      return json.data;
    },
    enabled,
  });
}
