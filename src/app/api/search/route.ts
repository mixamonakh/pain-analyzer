export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q');
    const runId = req.nextUrl.searchParams.get('runId');

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'q required' }, { status: 400 });
    }

    let query: string;
    let params: any[];

    if (runId) {
      // С фильтром по run
      query = `
        SELECT d.id, d.url, d.title, d.text_preview, d.fetched_at, d.published_at, s.name as source_name
        FROM documents_fts
        JOIN documents AS d ON d.id = documents_fts.rowid
        JOIN sources AS s ON s.id = d.source_id
        WHERE documents_fts MATCH ? AND d.run_id = ?
        ORDER BY d.published_at DESC
        LIMIT 100
      `;
      params = [q, parseInt(runId)];
    } else {
      // Без фильтра
      query = `
        SELECT d.id, d.url, d.title, d.text_preview, d.fetched_at, d.published_at, s.name as source_name
        FROM documents_fts
        JOIN documents AS d ON d.id = documents_fts.rowid
        JOIN sources AS s ON s.id = d.source_id
        WHERE documents_fts MATCH ?
        ORDER BY d.published_at DESC
        LIMIT 100
      `;
      params = [q];
    }

    const results = sqlite.prepare(query).all(...params) as any[];

    return NextResponse.json(results);
  } catch (err) {
    console.error('Search error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
