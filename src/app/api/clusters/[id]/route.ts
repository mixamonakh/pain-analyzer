export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cluster = sqlite
      .prepare('SELECT * FROM clusters WHERE id = ?')
      .get(parseInt(id)) as any;

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const documents = sqlite
      .prepare(
        `
      SELECT d.*, cd.similarity
      FROM documents d
      JOIN cluster_documents cd ON d.id = cd.document_id
      WHERE cd.cluster_id = ?
      ORDER BY cd.similarity DESC
    `
      )
      .all(parseInt(id)) as any[];

    return NextResponse.json({ cluster, documents });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch cluster' }, { status: 500 });
  }
}
