// src/app/api/sources/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sources } from '@/db/schema';

const ALLOWED_TYPES = new Set(['rss', 'telegram', 'html']);

export async function GET() {
  try {
    const allSources = await db.query.sources.findMany();
    return NextResponse.json(allSources);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const feed_url = String(body?.feed_url ?? '').trim();
    const plugin_type = String(body?.plugin_type ?? '').trim();

    if (!name || !feed_url || !plugin_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(plugin_type)) {
      return NextResponse.json(
        { error: `Invalid plugin_type: ${plugin_type}. Allowed: rss|telegram|html` },
        { status: 400 }
      );
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
  } catch {
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
