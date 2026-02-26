import { createGitHubClient } from './client';
import crypto from 'crypto';

export async function registerWebhook(
  token: string,
  owner: string,
  repo: string,
  webhookUrl: string,
): Promise<{ webhookId: number; secret: string }> {
  const octokit = createGitHubClient(token);
  const secret = crypto.randomUUID();

  const { data } = await octokit.repos.createWebhook({
    owner,
    repo,
    config: { url: webhookUrl, content_type: 'json', secret },
    events: ['push', 'pull_request', 'pull_request_review'],
    active: true,
  });

  return { webhookId: data.id, secret };
}

export async function removeWebhook(token: string, owner: string, repo: string, hookId: number) {
  const octokit = createGitHubClient(token);
  await octokit.repos.deleteWebhook({ owner, repo, hook_id: hookId });
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
