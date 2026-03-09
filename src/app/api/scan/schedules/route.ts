import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { calculateNextRun } from '@/lib/scan/scheduler';

/**
 * GET /api/scan/schedules — List all scan schedules for the company
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: schedules } = await supabase
    .from('scan_schedules')
    .select('*, repository:repositories(id, name, full_name)')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ data: { schedules: schedules || [] } });
}

/**
 * POST /api/scan/schedules — Create or update a scan schedule
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { repository_id, schedule_type, scan_type, enabled } = body;

  if (!repository_id) {
    return NextResponse.json({ error: 'repository_id is required' }, { status: 400 });
  }

  const validScheduleTypes = ['hourly', 'daily', 'weekly', 'monthly'];
  if (schedule_type && !validScheduleTypes.includes(schedule_type)) {
    return NextResponse.json({ error: 'Invalid schedule_type' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Verify repository belongs to this company
  const { data: repo } = await admin
    .from('repositories')
    .select('id')
    .eq('id', repository_id)
    .eq('company_id', profile.company_id)
    .single();

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  // Check for existing schedule
  const { data: existing } = await admin
    .from('scan_schedules')
    .select('id')
    .eq('repository_id', repository_id)
    .eq('company_id', profile.company_id)
    .single();

  const schedType = schedule_type || 'daily';
  const nextRun = calculateNextRun(schedType);

  const scheduleData = {
    company_id: profile.company_id,
    repository_id,
    schedule_type: schedType,
    scan_type: scan_type || 'full',
    enabled: enabled ?? true,
    next_run_at: nextRun.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await admin.from('scan_schedules').update(scheduleData).eq('id', existing.id);
  } else {
    await admin.from('scan_schedules').insert({
      ...scheduleData,
      created_by: user.id,
    });
  }

  return NextResponse.json({ success: true, next_run_at: nextRun.toISOString() });
}

/**
 * DELETE /api/scan/schedules?id=<schedule_id> — Delete a scan schedule
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('id');

  if (!scheduleId) {
    return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  await admin
    .from('scan_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('company_id', profile.company_id);

  return NextResponse.json({ success: true });
}
