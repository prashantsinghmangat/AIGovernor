import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * GET /api/notifications — Get notification settings for the company
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

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('channel');

  // Also fetch recent notification log
  const { data: logs } = await supabase
    .from('notification_log')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    data: {
      settings: settings || [],
      recent_logs: logs || [],
    },
  });
}

/**
 * POST /api/notifications — Create or update notification settings
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
  const { channel, enabled, config, ...triggers } = body;

  if (!channel || !['slack', 'email', 'webhook', 'in_app'].includes(channel)) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  }

  // Validate config
  if (channel === 'slack' && enabled && !config?.webhook_url) {
    return NextResponse.json({ error: 'Slack webhook URL is required' }, { status: 400 });
  }
  if (channel === 'webhook' && enabled && !config?.url) {
    return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
  }
  if (channel === 'email' && enabled && (!config?.recipients || config.recipients.length === 0)) {
    return NextResponse.json({ error: 'At least one email recipient is required' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Check if setting already exists
  const { data: existing } = await admin
    .from('notification_settings')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('channel', channel)
    .single();

  const settingData = {
    company_id: profile.company_id,
    channel,
    enabled: enabled ?? false,
    config: config || {},
    on_scan_complete: triggers.on_scan_complete ?? true,
    on_critical_vulnerability: triggers.on_critical_vulnerability ?? true,
    on_high_vulnerability: triggers.on_high_vulnerability ?? true,
    on_pii_detected: triggers.on_pii_detected ?? true,
    on_debt_score_drop: triggers.on_debt_score_drop ?? true,
    on_pr_analysis: triggers.on_pr_analysis ?? false,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await admin.from('notification_settings').update(settingData).eq('id', existing.id);
  } else {
    await admin.from('notification_settings').insert(settingData);
  }

  return NextResponse.json({ success: true });
}
