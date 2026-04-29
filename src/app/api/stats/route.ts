import { NextResponse } from 'next/server';
import { computeStats } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = computeStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[API /stats]', err);
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }
}
