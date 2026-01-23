// File: src/app/api/export/[runId]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const exportDir = path.join(process.cwd(), 'exports', `run-${runId}`);

  const requiredFiles = ['raw_documents.jsonl', 'report.json', 'report.md'];

  for (const file of requiredFiles) {
    const filePath = path.join(exportDir, file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }
  }

  const archive = archiver('zip', { zlib: { level: 6 } });

  for (const file of requiredFiles) {
    const filePath = path.join(exportDir, file);
    archive.file(filePath, { name: file });
  }

  const stream = Readable.toWeb(archive as any) as ReadableStream;
  archive.finalize();

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="run-${runId}.zip"`,
    },
  });
}
