import { createAdminSupabase } from '@/lib/supabase/admin';

type ScheduleType = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Calculate the next run time based on schedule type
 */
export function calculateNextRun(scheduleType: ScheduleType, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);

  switch (scheduleType) {
    case 'hourly':
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      // Next day at 2:00 AM UTC
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0);
      break;
    case 'weekly':
      // Next Monday at 2:00 AM UTC
      const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(2, 0, 0, 0);
      break;
    case 'monthly':
      // 1st of next month at 2:00 AM UTC
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(2, 0, 0, 0);
      break;
  }

  return next;
}

/**
 * Process due scheduled scans.
 * Called by a cron job (e.g., every 15 minutes via Vercel Cron or external scheduler).
 * Finds all enabled schedules where next_run_at <= now, creates scans, and updates next_run_at.
 */
export async function processScheduledScans(): Promise<{
  triggered: number;
  errors: number;
}> {
  const admin = createAdminSupabase();
  const now = new Date().toISOString();

  // Find all due schedules
  const { data: dueSchedules, error } = await admin
    .from('scan_schedules')
    .select('*, repository:repositories(id, company_id, full_name)')
    .eq('enabled', true)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(50); // Process max 50 at a time

  if (error || !dueSchedules || dueSchedules.length === 0) {
    return { triggered: 0, errors: 0 };
  }

  let triggered = 0;
  let errors = 0;

  for (const schedule of dueSchedules) {
    try {
      const repo = schedule.repository as { id: string; company_id: string; full_name: string } | null;
      if (!repo) {
        console.warn(`[Scheduler] Schedule ${schedule.id} has no repository, disabling`);
        await admin.from('scan_schedules').update({ enabled: false }).eq('id', schedule.id);
        continue;
      }

      // Create a new scan
      const { error: scanError } = await admin.from('scans').insert({
        company_id: repo.company_id,
        repository_id: repo.id,
        scan_type: schedule.scan_type || 'full',
        status: 'pending',
      });

      if (scanError) {
        console.error(`[Scheduler] Failed to create scan for ${repo.full_name}:`, scanError.message);
        errors++;
        continue;
      }

      // Update schedule
      const nextRun = calculateNextRun(schedule.schedule_type as ScheduleType);
      await admin.from('scan_schedules').update({
        last_run_at: now,
        next_run_at: nextRun.toISOString(),
        run_count: (schedule.run_count || 0) + 1,
        updated_at: now,
      }).eq('id', schedule.id);

      console.log(`[Scheduler] Triggered ${schedule.scan_type} scan for ${repo.full_name}, next run: ${nextRun.toISOString()}`);
      triggered++;

    } catch (err) {
      console.error(`[Scheduler] Error processing schedule ${schedule.id}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { triggered, errors };
}
