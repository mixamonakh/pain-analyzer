// src/app/api/sources/bulk/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sources } from '@/db/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ParsedSource {
  url: string;
  name?: string;
  type: 'rss' | 'telegram'; // Убираем null, фильтруем раньше
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urlsText = String(body?.urls ?? '').trim();

    if (!urlsText) {
      return NextResponse.json({ error: 'URLs list is empty' }, { status: 400 });
    }

    const lines = urlsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    const parsed: ParsedSource[] = [];

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim());
      const url = parts[0];
      const customName = parts[1] || undefined;

      const type = detectSourceType(url);
      if (!type) continue; // Пропускаем невалидные

      parsed.push({ url, name: customName, type });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No valid URLs found' }, { status: 400 });
    }

    const added: any[] = [];
    const errors: string[] = [];

    for (const source of parsed) {
      try {
        let finalName: string;

        if (source.name) {
          finalName = source.name;
        } else if (source.type === 'telegram') {
          finalName = extractTelegramName(source.url);
        } else {
          // source.type === 'rss'
          const rssTitle = await fetchRSSTitle(source.url);
          finalName = rssTitle || source.url.substring(0, 50);
        }

        const result = await db
          .insert(sources)
          .values({
            name: finalName,
            feed_url: source.url,
            plugin_type: source.type, // Теперь всегда 'rss' | 'telegram'
            enabled: 1,
            created_at: Date.now(),
          })
          .returning();

        added.push(result[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${source.url}: ${msg}`);
      }
    }

    return NextResponse.json({
      added: added.length,
      failed: errors.length,
      errors,
      sources: added,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function detectSourceType(url: string): 'rss' | 'telegram' | null {
  if (url.startsWith('@') || url.includes('t.me/') || url.includes('telegram.me/')) {
    return 'telegram';
  }

  if (url.match(/\.(xml|rss|atom)$/i) || url.includes('feed') || url.includes('rss')) {
    return 'rss';
  }

  if (url.startsWith('http')) {
    return 'rss';
  }

  return null;
}

function extractTelegramName(url: string): string {
  if (url.startsWith('@')) {
    return url.substring(1);
  }

  const match = url.match(/t\.me\/(?:s\/)?([^/?]+)/);
  if (match) {
    return match[1];
  }

  return 'telegram-channel';
}

async function fetchRSSTitle(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PainAnalyzer/1.0)',
      },
      maxContentLength: 500000,
    });

    const html = response.data;
    const $ = cheerio.load(html, { xmlMode: true });

    let title = $('channel > title').first().text().trim();

    if (!title) {
      title = $('feed > title').first().text().trim();
    }

    return title || null;
  } catch {
    return null;
  }
}
