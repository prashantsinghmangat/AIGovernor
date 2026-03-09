import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/github/webhooks';
import type { Json } from '@/types/database';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');

  if (!signature || !event) {
    return new NextResponse('Missing headers', { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse('Invalid JSON payload', { status: 400 });
  }

  const repoGithubId = (payload.repository as Record<string, unknown> | undefined)?.id as number | undefined;
  if (!repoGithubId) {
    return new NextResponse('Missing repository ID in payload', { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: repo } = await supabase
    .from('repositories')
    .select('id, company_id, webhook_secret')
    .eq('github_id', repoGithubId)
    .single();

  if (!repo) return new NextResponse('Unknown repository', { status: 404 });

  // Verify signature BEFORE processing any payload data
  if (repo.webhook_secret && !verifyWebhookSignature(body, signature, repo.webhook_secret)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  switch (event) {
    case 'push':
      await supabase.from('scans').insert({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_type: 'incremental',
        status: 'pending',
      });
      break;

    case 'pull_request': {
      const action = payload.action as string;
      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        const pr = payload.pull_request as Record<string, unknown> | undefined;
        if (pr) {
          const head = pr.head as Record<string, unknown> | undefined;
          const base = pr.base as Record<string, unknown> | undefined;
          const user = pr.user as Record<string, unknown> | undefined;

          const prMetadata = {
            pr_number: pr.number as number,
            pr_id: pr.id as number,
            title: (pr.title as string) || '',
            author: (user?.login as string) || 'unknown',
            state: (pr.state as string) || 'open',
            head_sha: (head?.sha as string) || '',
            base_sha: (base?.sha as string) || '',
            head_ref: (head?.ref as string) || '',
            base_ref: (base?.ref as string) || '',
            created_at: (pr.created_at as string) || '',
            action,
          };

          await supabase.from('scans').insert({
            company_id: repo.company_id,
            repository_id: repo.id,
            scan_type: 'pr_scan',
            status: 'pending',
            commit_sha: prMetadata.head_sha,
            pr_metadata: prMetadata as unknown as Json,
          });
        }
      }

      // Handle PR closed/merged — update state
      if (action === 'closed') {
        const pr = payload.pull_request as Record<string, unknown> | undefined;
        if (pr) {
          const merged = pr.merged as boolean;
          await supabase.from('pull_requests').update({
            state: merged ? 'merged' : 'closed',
            pr_merged_at: merged ? (pr.merged_at as string) || new Date().toISOString() : null,
          }).eq('repository_id', repo.id).eq('github_pr_id', pr.id as number);
        }
      }
      break;
    }

    case 'pull_request_review':
      await supabase.from('pull_requests').update({
        human_reviewed: true,
        review_count: 1, // Will be incremented properly in future
      }).eq('repository_id', repo.id).eq('github_pr_id', (payload.pull_request as Record<string, unknown> | undefined)?.id as number);
      break;
  }

  return new NextResponse('OK', { status: 200 });
}
