// src/app/api/runs/[id]/route.ts

export const runtime = 'nodejs';

import { db } from '@/db';
import { runs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runId = parseInt(id);

  if (isNaN(runId)) {
    return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
  }

  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
  });

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    status: run.status,
    started_at: run.started_at,
    finished_at: run.finished_at,
    stats_json: run.stats_json,
    error_message: run.error_message,
  });
}
