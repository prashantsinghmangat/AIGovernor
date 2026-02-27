import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { processPendingScan } from '@/lib/scan/processor';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await request.json();
  const { repository_id, scan_type = 'full' } = body;

  // For bulk scans (no specific repo), only scan GitHub repos — upload repos need a new ZIP to re-scan
  const repos = repository_id
    ? [{ id: repository_id }]
    : (await supabase.from('repositories').select('id').eq('company_id', profile.company_id).eq('is_active', true).eq('source', 'github')).data || [];

  const scanInserts = repos.map((repo) => ({
    company_id: profile.company_id,
    repository_id: repo.id,
    triggered_by: user.id,
    scan_type,
    status: 'pending' as const,
  }));

  const { data: scans, error } = await supabase.from('scans').insert(scanInserts).select('id');
  if (error) return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });

  // Process all pending scans after the response is sent — runs in the same
  // server context, no separate HTTP call needed (avoids self-fetch issues)
  after(async () => {
    let hasMore = true;
    let processed = 0;
    const maxIterations = repos.length + 5; // process any previously stuck scans too
    while (hasMore && processed < maxIterations) {
      try {
        const result = await processPendingScan();
        console.log(`[Scan Trigger] Processor result:`, result.message);
        if (result.message === 'No pending scans') {
          hasMore = false;
        }
        processed++;
      } catch (err) {
        console.error(`[Scan Trigger] Processor error:`, err instanceof Error ? err.message : err);
        hasMore = false;
      }
    }
  });

  return NextResponse.json({ data: { scan_ids: scans?.map((s) => s.id) || [], message: `Queued ${repos.length} scan(s)` } });
}
