export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { runs } from '@/db/schema';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await db.query.runs.findFirst({
      where: eq(runs.id, parseInt(id)),
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}
