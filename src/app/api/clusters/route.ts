export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(req: NextRequest) {
  try {
    const runIdParam = req.nextUrl.searchParams.get('runId');
    const runId = Number(runIdParam);

    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 });
    }

    const clusters = sqlite
      .prepare(
        `
        SELECT c.*, GROUP_CONCAT(cd.document_id, ',') as doc_ids
        FROM clusters c
        LEFT JOIN cluster_documents cd ON c.id = cd.cluster_id
        WHERE c.run_id = ?
        GROUP BY c.id
        ORDER BY c.mentions_count DESC
        `
      )
      .all(runId) as any[];

    const singles = sqlite
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM documents d
        WHERE d.run_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM cluster_documents cd
            JOIN clusters c ON c.id = cd.cluster_id
            WHERE cd.document_id = d.id
              AND c.run_id = ?
          )
        `
      )
      .get(runId, runId) as any;

    return NextResponse.json({ clusters, singles: singles.count });
  } catch (err) {
    console.error('GET /api/clusters error:', err);
    return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
  }
}
