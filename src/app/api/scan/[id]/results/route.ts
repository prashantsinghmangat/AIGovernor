import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  // Verify scan exists (RLS ensures company scoping)
  const { data: scan } = await supabase
    .from('scans')
    .select('id, status')
    .eq('id', id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Fetch file-level results sorted by ai_probability descending
  const { data: results, error } = await supabase
    .from('scan_results')
    .select('id, file_path, language, total_loc, ai_loc, ai_probability, risk_level, detection_signals')
    .eq('scan_id', id)
    .order('ai_probability', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      scan_id: id,
      scan_status: scan.status,
      results: results ?? [],
      total: results?.length ?? 0,
    },
  });
}
