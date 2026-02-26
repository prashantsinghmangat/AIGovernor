import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const status = request.nextUrl.searchParams.get('status') || 'active';
  const severity = request.nextUrl.searchParams.get('severity');
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  let query = supabase
    .from('alerts')
    .select('*, repository:repositories(name)', { count: 'exact' })
    .eq('company_id', profile.company_id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (severity) query = query.eq('severity', severity);

  const { data: alerts, count } = await query;

  return NextResponse.json({
    data: {
      alerts: (alerts || []).map((a) => ({
        id: a.id,
        severity: a.severity,
        category: a.category,
        title: a.title,
        description: a.description,
        status: a.status,
        repository_name: (a.repository as { name: string } | null)?.name ?? null,
        context: a.context,
        created_at: a.created_at,
      })),
      total: count ?? 0,
      page,
    },
  });
}
