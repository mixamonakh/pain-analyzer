export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereConditions: string[] = [];
    let params: any[] = [];

    if (source) {
      const sourceName = sqlite
        .prepare('SELECT name FROM sources WHERE name = ?')
        .get(source) as any;

      if (sourceName) {
        whereConditions.push('source_id = (SELECT id FROM sources WHERE name = ?)');
        params.push(source);
      }
    }

    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      whereConditions.push('published_at >= ?');
      params.push(startTimestamp);
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      whereConditions.push('published_at <= ?');
      params.push(endTimestamp);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const offset = (page - 1) * perPage;

    const items = sqlite
      .prepare(`
        SELECT
          d.id,
          d.url,
          d.title,
          d.text_preview,
          d.fetched_at,
          d.published_at,
          s.name as source_name
        FROM documents d
        JOIN sources s ON s.id = d.source_id
        ${whereClause}
        ORDER BY d.fetched_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, perPage, offset);

    const countResult = sqlite
      .prepare(`
        SELECT COUNT(*) as count
        FROM documents d
        JOIN sources s ON s.id = d.source_id
        ${whereClause}
      `)
      .get(...params) as any;

    const total = countResult?.count || 0;

    return NextResponse.json({
      documents: items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    });
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
