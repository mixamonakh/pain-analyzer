export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q');
    const runId = req.nextUrl.searchParams.get('runId');

    if (!q) {
      return NextResponse.json({ error: 'q required' }, { status: 400 });
    }

    const query = `
      SELECT d.*
      FROM documents_fts AS f
      JOIN documents AS d ON d.id = f.rowid
      WHERE f MATCH ?
        AND (? IS NULL OR d.run_id = ?)
      ORDER BY bm25(f), d.published_at DESC
      LIMIT 100
    `;

    const results = sqlite
      .prepare(query)
      .all(q, runId ? parseInt(runId) : null, runId ? parseInt(runId) : null) as any[];

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
