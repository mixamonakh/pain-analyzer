export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sources } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { enabled, name, feed_url } = await req.json();

    const updates: any = {};
    if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;
    if (name !== undefined) updates.name = name;
    if (feed_url !== undefined) updates.feed_url = feed_url;

    const result = await db
      .update(sources)
      .set(updates)
      .where(eq(sources.id, parseInt(id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(sources).where(eq(sources.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
