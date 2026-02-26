import { Octokit } from '@octokit/rest';

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'CodeGuard-AI/1.0',
  });
}
