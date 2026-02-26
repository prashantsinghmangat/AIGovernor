import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const body = await request.json();
  const { config } = body;

  const { error } = await supabase.from('integrations').update({ config }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
