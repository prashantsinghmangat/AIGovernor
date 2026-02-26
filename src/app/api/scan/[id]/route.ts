import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: scan } = await supabase
    .from('scans')
    .select('*, repository:repositories(name)')
    .eq('id', id)
    .single();

  if (!scan) return NextResponse.json({ error: 'Scan not found', code: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    data: {
      id: scan.id,
      repository_id: scan.repository_id,
      repository_name: (scan.repository as { name: string })?.name,
      status: scan.status,
      progress: scan.progress,
      summary: scan.summary,
      started_at: scan.started_at,
      completed_at: scan.completed_at,
      error_message: scan.error_message,
    },
  });
}
