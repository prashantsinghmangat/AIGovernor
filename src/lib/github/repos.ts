import { createGitHubClient } from './client';

export async function fetchUserRepositories(token: string) {
  const octokit = createGitHubClient(token);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    sort: 'updated',
    per_page: 100,
    visibility: 'all',
  });

  return repos.map(repo => ({
    github_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    default_branch: repo.default_branch || 'main',
    language: repo.language,
    is_private: repo.private,
    metadata: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      size: repo.size,
      updated_at: repo.updated_at,
    },
  }));
}
