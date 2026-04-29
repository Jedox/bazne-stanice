import { NextResponse } from 'next/server';
import { queryStations } from '@/lib/dataStore';
import { getDistinctValues } from '@/lib/dataStore';
import type { StationFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: StationFilters = {
      search: searchParams.get('search') || undefined,
      operator: searchParams.get('operator') || undefined,
      technology: searchParams.get('technology') || undefined,
      frequencyBand: searchParams.get('frequencyBand') || undefined,
      city: searchParams.get('city') || undefined,
      lat: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
      lng: searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined,
      page: Number(searchParams.get('page') || 1),
      pageSize: Number(searchParams.get('pageSize') || 50),
      sortBy: (searchParams.get('sortBy') as keyof import('@/lib/types').BaseStation) || 'id',
      sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc',
    };

    const result = queryStations(filters);
    const distinct = getDistinctValues();

    return NextResponse.json({ ...result, filterOptions: distinct });
  } catch (err) {
    console.error('[API /stations]', err);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
