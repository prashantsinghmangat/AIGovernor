import { NextResponse } from 'next/server';
import { processPendingScan } from '@/lib/scan/processor';

// Manual trigger endpoint — useful for retrying stuck scans or cron-based processing
export async function POST() {
  try {
    const result = await processPendingScan();

    if (!result.success) {
      return NextResponse.json({
        error: result.error,
        code: 'SCAN_FAILED',
        scan_id: result.scan_id,
      }, { status: 500 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scan Process Endpoint] Unexpected error:', message);
    return NextResponse.json({
      error: message,
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
