import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'PDF export coming soon', code: 'PLAN_LIMIT' }, { status: 501 });
}
