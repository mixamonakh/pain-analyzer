export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const docs = sqlite.prepare(`
    SELECT
      d.id,
      d.url,
      d.title,
      d.text_preview,
      d.published_at,
      d.fetched_at,
      s.name AS source_name,
      c.id AS cluster_id,
      c.title AS cluster_title
    FROM documents d
    JOIN sources s ON s.id = d.source_id
    LEFT JOIN cluster_documents cd ON cd.document_id = d.id
    LEFT JOIN clusters c ON c.id = cd.cluster_id
    ORDER BY d.fetched_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  const totalRow = sqlite.prepare(`SELECT COUNT(*) AS cnt FROM documents`).get() as any;
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ docs, total, page, limit, totalPages });
}
