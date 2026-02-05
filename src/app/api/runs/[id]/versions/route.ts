// src/app/api/runs/[id]/versions/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { run_versions, run_version_stages } from '@/db/tables';
import { eq, desc } from 'drizzle-orm';
import { executePipeline } from '@/lib/processing/pipeline-executor';
import type { PipelineConfig } from '@/lib/processing/types';
import '@/lib/processing/processors';

/**
 * GET /api/runs/:id/versions
 * Список всех версий обработки для run
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runId = parseInt(id);

  if (isNaN(runId)) {
    return NextResponse.json(
      { error: 'Invalid run ID' },
      { status: 400 }
    );
  }

  try {
    const versions = await db
      .select({
        id: run_versions.id,
        version: run_versions.version,
        created_at: run_versions.created_at,
        stats_json: run_versions.stats_json,
      })
      .from(run_versions)
      .where(eq(run_versions.run_id, runId))
      .orderBy(desc(run_versions.version));

    return NextResponse.json({
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        createdAt: v.created_at,
        stats: v.stats_json ? JSON.parse(v.stats_json) : null,
      })),
    });
  } catch (error) {
    console.error('Failed to load versions:', error);
    return NextResponse.json(
      { error: 'Failed to load versions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/runs/:id/versions
 * Создание новой версии обработки
 * 
 * Body:
 * {
 *   "pipeline": { "processors": [...] }
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runId = parseInt(id);

  if (isNaN(runId)) {
    return NextResponse.json(
      { error: 'Invalid run ID' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { pipeline } = body as { pipeline: PipelineConfig };

    if (!pipeline || !pipeline.processors) {
      return NextResponse.json(
        { error: 'Invalid pipeline configuration' },
        { status: 400 }
      );
    }

    // Выполняем пайплайн
    const result = await executePipeline(runId, pipeline);

    // Определяем номер версии
    const existingVersions = await db
      .select({ version: run_versions.version })
      .from(run_versions)
      .where(eq(run_versions.run_id, runId))
      .orderBy(desc(run_versions.version))
      .limit(1);

    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    // Сохраняем версию
    const [newVersion] = await db
      .insert(run_versions)
      .values({
        run_id: runId,
        version: nextVersion,
        pipeline_json: JSON.stringify(pipeline),
        created_at: Math.floor(Date.now() / 1000),
        stats_json: JSON.stringify({
          totalDocuments: result.items.length,
          totalClusters: result.clusters?.length || 0,
          totalDuration: result.stages.reduce((sum, s) => sum + s.durationMs, 0),
        }),
        full_storage: 0,
      })
      .returning({ id: run_versions.id });

    // Сохраняем статистику стейджей
    if (result.stages.length > 0) {
      await db.insert(run_version_stages).values(
        result.stages.map(stage => ({
          run_version_id: newVersion.id,
          stage_order: stage.order,
          processor_id: stage.processorId,
          processor_name: stage.processorName,
          items_in: stage.itemsIn,
          items_out: stage.itemsOut,
          items_removed: stage.itemsRemoved,
          clusters_created: stage.clustersCreated || null,
          duration_ms: stage.durationMs,
          metadata_json: stage.metadata ? JSON.stringify(stage.metadata) : null,
        }))
      );
    }

    return NextResponse.json({
      versionId: newVersion.id,
      version: nextVersion,
      stages: result.stages,
      itemsCount: result.items.length,
      clustersCount: result.clusters?.length || 0,
    });
  } catch (error) {
    console.error('Version creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create version',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}