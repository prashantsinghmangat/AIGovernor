import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/github/webhooks';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');

  if (!signature || !event) {
    return new NextResponse('Missing headers', { status: 400 });
  }

  const payload = JSON.parse(body);
  const repoGithubId = payload.repository?.id;

  const supabase = createAdminSupabase();
  const { data: repo } = await supabase
    .from('repositories')
    .select('id, company_id, webhook_secret')
    .eq('github_id', repoGithubId)
    .single();

  if (!repo) return new NextResponse('Unknown repository', { status: 404 });

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

    case 'pull_request':
      if (['opened', 'closed', 'reopened'].includes(payload.action)) {
        await supabase.from('scans').insert({
          company_id: repo.company_id,
          repository_id: repo.id,
          scan_type: 'pr_scan',
          status: 'pending',
        });
      }
      break;

    case 'pull_request_review':
      await supabase.from('pull_requests').update({
        human_reviewed: true,
      }).eq('repository_id', repo.id).eq('github_pr_id', payload.pull_request?.id);
      break;
  }

  return new NextResponse('OK', { status: 200 });
}
