import { NextRequest, NextResponse } from 'next/server';
import { processScheduledScans } from '@/lib/scan/scheduler';

/**
 * GET /api/cron/scheduled-scans
 *
 * Called by a cron job (Vercel Cron, every 15 min) to process due scheduled scans.
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processScheduledScans();

    return NextResponse.json({
      success: true,
      triggered: result.triggered,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Scheduled scans error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to process scheduled scans' },
      { status: 500 },
    );
  }
}
