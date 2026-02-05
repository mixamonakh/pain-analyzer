// src/app/api/pipelines/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pipelines } from '@/db/tables';
import { desc } from 'drizzle-orm';

/**
 * GET /api/pipelines
 * Список сохранённых шаблонов пайплайнов
 */
export async function GET() {
  try {
    const allPipelines = await db
      .select()
      .from(pipelines)
      .orderBy(desc(pipelines.created_at));

    return NextResponse.json({
      pipelines: allPipelines.map(p => ({
        id: p.id,
        name: p.name,
        operations: JSON.parse(p.operations_json),
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error('Failed to load pipelines:', error);
    return NextResponse.json(
      { error: 'Failed to load pipelines' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipelines
 * Создание нового шаблона пайплайна
 * 
 * Body:
 * {
 *   "name": "My Pipeline",
 *   "operations": [{"type": "dedup_url"}, ...]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, operations } = body as {
      name: string;
      operations: any[];
    };

    if (!name || !operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Invalid pipeline data: name and operations required' },
        { status: 400 }
      );
    }

    const [newPipeline] = await db
      .insert(pipelines)
      .values({
        name,
        operations_json: JSON.stringify(operations),
        created_at: Math.floor(Date.now() / 1000),
      })
      .returning();

    return NextResponse.json({
      id: newPipeline.id,
      name: newPipeline.name,
      operations: JSON.parse(newPipeline.operations_json),
      createdAt: newPipeline.created_at,
    });
  } catch (error) {
    console.error('Failed to create pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline' },
      { status: 500 }
    );
  }
}