// src/lib/processing/pipeline-executor.ts
import { db } from '@/db';
import { documents, raw_items, sources } from '@/db/tables';
import { eq, and, inArray } from 'drizzle-orm';
import { getProcessor, validatePipeline } from './registry';
import type { PipelineConfig, ProcessingItem, StageStats, ClusterData, ProcessorResult } from './types';

export interface ExecutePipelineOptions {
  sampleLimit?: number; // Для preview ограничить N документами
}

export interface ExecutePipelineResult {
  stages: StageStats[];
  items: ProcessingItem[];
  clusters?: ClusterData[];
}

/**
 * Преобразование document + raw_item в ProcessingItem
 */
async function documentToProcessingItem(
  doc: any,
  rawItem: any,
  source: any
): Promise<ProcessingItem> {
  // Парсим media_json и metadata_json
  let media: ProcessingItem['media'] | undefined;
  let metadata: Record<string, any> | undefined;

  if (rawItem.media_json) {
    try {
      media = JSON.parse(rawItem.media_json);
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }

  if (doc.metadata_json) {
    try {
      metadata = JSON.parse(doc.metadata_json);
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }

  // Извлекаем author из metadata если есть
  const author = metadata?.author || undefined;
  const language = metadata?.language || undefined;

  return {
    id: doc.id,
    sourceId: doc.source_id,
    sourceName: source.name,
    url: doc.url,
    title: doc.title,
    text: doc.text_preview, // Используем text_preview как основной текст
    author,
    language,
    publishedAt: doc.published_at,
    media,
    metadata,
    rawItemId: rawItem.id,
    rawContent: rawItem.content_body,
    contentType: rawItem.content_type as 'html' | 'json' | 'text',
    fetchedAt: rawItem.fetched_at,
  };
}

/**
 * Загрузка документов run с сырьём
 */
async function loadRunDocuments(runId: number, limit?: number): Promise<ProcessingItem[]> {
  // Получаем документы run (только черновики)
  const query = db
    .select()
    .from(documents)
    .where(and(
      eq(documents.run_id, runId),
      eq(documents.status, 'draft') // FIXED: используем status вместо published
    ));

  if (limit) {
    query.limit(limit);
  }

  const docs = await query;

  if (docs.length === 0) {
    return [];
  }

  // FIXED: Получаем все необходимые sources (не только первый)
  const sourceIds = [...new Set(docs.map(d => d.source_id))];
  const sourcesData = await db
    .select()
    .from(sources)
    .where(inArray(sources.id, sourceIds));

  const sourcesMap = new Map(sourcesData.map(s => [s.id, s]));

  // FIXED: Получаем raw_items для всех документов (не только первого)
  const docIds = docs.map(d => d.id);
  const rawItemsData = await db
    .select()
    .from(raw_items)
    .where(inArray(raw_items.document_id, docIds));

  // Группируем raw_items по document_id и берём последний
  const rawItemsMap = new Map<number, any>();
  for (const rawItem of rawItemsData) {
    const existing = rawItemsMap.get(rawItem.document_id);
    if (!existing || rawItem.fetched_at > existing.fetched_at) {
      rawItemsMap.set(rawItem.document_id, rawItem);
    }
  }

  // Преобразуем в ProcessingItem
  const processingItems: ProcessingItem[] = [];
  for (const doc of docs) {
    const rawItem = rawItemsMap.get(doc.id);
    const source = sourcesMap.get(doc.source_id);

    if (!rawItem || !source) {
      console.warn(`Missing raw_item or source for document ${doc.id}`);
      continue;
    }

    const item = await documentToProcessingItem(doc, rawItem, source);
    processingItems.push(item);
  }

  return processingItems;
}

/**
 * Выполнение пайплайна обработки
 */
export async function executePipeline(
  runId: number,
  pipeline: PipelineConfig,
  options?: ExecutePipelineOptions
): Promise<ExecutePipelineResult> {
  const stages: StageStats[] = [];
  let currentItems: ProcessingItem[];
  let finalClusters: ClusterData[] | undefined;

  // 1. Загрузка документов
  currentItems = await loadRunDocuments(runId, options?.sampleLimit);

  if (currentItems.length === 0) {
    throw new Error(`No documents found for run ${runId}`);
  }

  // 2. Валидация пайплайна
  const validation = validatePipeline(pipeline, currentItems);
  if (!validation.valid) {
    throw new Error(
      `Pipeline validation failed: ${validation.errors.map(e => e.message).join('; ')}`
    );
  }

  // 3. Прогон процессоров
  const enabledProcessors = pipeline.processors
    .filter(p => p.enabled)
    .sort((a, b) => a.order - b.order);

  for (const step of enabledProcessors) {
    const processor = getProcessor(step.id);
    if (!processor) {
      throw new Error(`Processor "${step.id}" not found`);
    }

    const itemsIn = currentItems.length;
    const startTime = Date.now();

    // Выполняем процессор
    let result: ProcessorResult;
    try {
      result = await processor.process(currentItems, step.config);
    } catch (error) {
      throw new Error(
        `Processor "${processor.name}" failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const durationMs = Date.now() - startTime;
    const itemsOut = result.items.length;
    const itemsRemoved = itemsIn - itemsOut;

    // Сохраняем статистику
    stages.push({
      order: step.order,
      processorId: processor.id,
      processorName: processor.name,
      itemsIn,
      itemsOut,
      itemsRemoved,
      clustersCreated: result.clusters?.length,
      durationMs,
      metadata: result.metadata,
    });

    // Обновляем текущие документы
    currentItems = result.items;

    // Сохраняем кластеры если есть
    if (result.clusters) {
      finalClusters = result.clusters;
    }
  }

  return {
    stages,
    items: currentItems,
    clusters: finalClusters,
  };
}