export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET() {
  try {
    const allRuns = await db.query.runs.findMany({
      orderBy: (r) => r.id,
    });
    return NextResponse.json(allRuns);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
