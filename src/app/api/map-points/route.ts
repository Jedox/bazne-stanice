import { NextResponse } from 'next/server';
import { getMapPoints } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operator = searchParams.get('operator') || undefined;
    const technology = searchParams.get('technology') || undefined;

    const points = getMapPoints(operator, technology);
    return NextResponse.json({ points, total: points.length });
  } catch (err) {
    console.error('[API /map-points]', err);
    return NextResponse.json({ error: 'Failed to load map data' }, { status: 500 });
  }
}
