import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const body = await request.json();
  const { status } = body;

  if (!['acknowledged', 'dismissed', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const updateData: Record<string, string> = { status };
  if (status === 'acknowledged') {
    updateData.acknowledged_by = user.id;
    updateData.acknowledged_at = new Date().toISOString();
  }

  const { error } = await supabase.from('alerts').update(updateData).eq('id', id);
  if (error) return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
