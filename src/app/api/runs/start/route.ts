export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { runs } from '@/db/schema';

export async function POST() {
  try {
    const result = await db
      .insert(runs)
      .values({
        status: 'pending',
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to start run' }, { status: 500 });
  }
}
