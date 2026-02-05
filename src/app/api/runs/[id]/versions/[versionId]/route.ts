// src/app/api/runs/[id]/versions/[versionId]/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { run_versions, run_version_stages } from '@/db/tables';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/runs/:id/versions/:versionId
 * Детали конкретной версии обработки
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const runId = parseInt(id);
  const versionIdNum = parseInt(versionId);

  if (isNaN(runId) || isNaN(versionIdNum)) {
    return NextResponse.json(
      { error: 'Invalid run or version ID' },
      { status: 400 }
    );
  }

  try {
    // Загружаем версию
    const [version] = await db
      .select()
      .from(run_versions)
      .where(
        and(
          eq(run_versions.id, versionIdNum),
          eq(run_versions.run_id, runId)
        )
      )
      .limit(1);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Загружаем стейджи
    const stages = await db
      .select()
      .from(run_version_stages)
      .where(eq(run_version_stages.run_version_id, versionIdNum))
      .orderBy(run_version_stages.stage_order);

    return NextResponse.json({
      id: version.id,
      version: version.version,
      createdAt: version.created_at,
      pipeline: JSON.parse(version.pipeline_json),
      stats: version.stats_json ? JSON.parse(version.stats_json) : null,
      stages: stages.map(s => ({
        order: s.stage_order,
        processorId: s.processor_id,
        processorName: s.processor_name,
        itemsIn: s.items_in,
        itemsOut: s.items_out,
        itemsRemoved: s.items_removed,
        clustersCreated: s.clusters_created,
        durationMs: s.duration_ms,
        metadata: s.metadata_json ? JSON.parse(s.metadata_json) : null,
      })),
    });
  } catch (error) {
    console.error('Failed to load version details:', error);
    return NextResponse.json(
      { error: 'Failed to load version' },
      { status: 500 }
    );
  }
}