// src/app/api/processing/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executePipeline } from '@/lib/processing/pipeline-executor';
import type { PipelineConfig } from '@/lib/processing/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 минут

interface ExecuteRequestBody {
  runId: number;
  pipeline: PipelineConfig;
  sampleLimit?: number;
}

/**
 * POST /api/processing/execute
 * Выполнение пайплайна обработки в UI (не в воркере)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequestBody = await request.json();
    const { runId, pipeline, sampleLimit } = body;

    // Валидация
    if (!runId || !pipeline) {
      return NextResponse.json(
        { error: 'Missing runId or pipeline' },
        { status: 400 }
      );
    }

    // Выполнение пайплайна в UI потоке (nodejs runtime)
    const result = await executePipeline(runId, pipeline, {
      sampleLimit,
    });

    return NextResponse.json({
      success: true,
      stages: result.stages,
      itemsCount: result.items.length,
      clustersCount: result.clusters?.length || 0,
    });
  } catch (error) {
    console.error('Pipeline execution failed:', error);

    return NextResponse.json(
      {
        error: 'Pipeline execution failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}