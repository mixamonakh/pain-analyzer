// File: src/app/api/sources/presets/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sources } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PRESETS = [
  { name: 'Habr', feed_url: 'https://habr.com/ru/rss/best/daily/', plugin_type: 'rss' },
  { name: 'VC.ru', feed_url: 'https://vc.ru/rss/all', plugin_type: 'rss' },
  { name: 'TechCrunch', feed_url: 'https://techcrunch.com/feed/', plugin_type: 'rss' },
];


export async function POST() {
  try {
    const created = [];
    for (const preset of PRESETS) {
      const existing = await db.query.sources.findFirst({
        where: eq(sources.feed_url, preset.feed_url),
      });

      if (!existing) {
        const result = await db
          .insert(sources)
          .values({
            name: preset.name,
            feed_url: preset.feed_url,
            plugin_type: preset.plugin_type,
            enabled: 1,
            created_at: Date.now(),
          })
          .returning();
        created.push(result[0]);
      }
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Presets error:', err);
    return NextResponse.json({ error: 'Failed to create presets' }, { status: 500 });
  }
}
