export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sources } from '@/db/schema';

export async function GET() {
  try {
    const allSources = await db.query.sources.findMany();
    return NextResponse.json(allSources);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, feed_url, plugin_type } = await req.json();

    if (!name || !feed_url || !plugin_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const result = await db
      .insert(sources)
      .values({
        name,
        feed_url,
        plugin_type,
        enabled: 1,
        created_at: Date.now(),
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
