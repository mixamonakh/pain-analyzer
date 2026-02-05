// src/app/api/runs/[id]/preview/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { executePipeline } from '@/lib/processing/pipeline-executor';
import type { PipelineConfig } from '@/lib/processing/types';
import '@/lib/processing/processors'; // Инициализация процессоров

/**
 * POST /api/runs/:id/preview
 * Прогон пайплайна в режиме предпросмотра (без сохранения в БД)
 * 
 * Body:
 * {
 *   "pipeline": { "processors": [...] },
 *   "sampleLimit": 50  // Опционально
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
    const { pipeline, sampleLimit } = body as {
      pipeline: PipelineConfig;
      sampleLimit?: number;
    };

    if (!pipeline || !pipeline.processors) {
      return NextResponse.json(
        { error: 'Invalid pipeline configuration' },
        { status: 400 }
      );
    }

    // Выполняем пайплайн
    const result = await executePipeline(runId, pipeline, { sampleLimit });

    return NextResponse.json({
      stages: result.stages,
      itemsCount: result.items.length,
      clustersCount: result.clusters?.length || 0,
      sampleItems: result.items.slice(0, 20), // Первые 20 для превью
      clusters: result.clusters,
    });
  } catch (error) {
    console.error('Preview execution failed:', error);
    return NextResponse.json(
      {
        error: 'Pipeline execution failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}