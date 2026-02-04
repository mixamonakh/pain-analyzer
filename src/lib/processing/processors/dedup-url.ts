// src/lib/processing/processors/dedup-url.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';
import { normalizeUrl } from '@/lib/utils';

export const dedupUrlProcessor: Processor = {
  id: 'dedup_url',
  type: 'filter',
  name: 'Дедупликация по URL',
  description: 'Удаляет дубликаты документов по нормализованному URL. Оставляет только первое вхождение.',

  schema: {},

  async process(items: ProcessingItem[]): Promise<ProcessorResult> {
    const seen = new Set<string>();
    const uniqueItems: ProcessingItem[] = [];

    for (const item of items) {
      const normalized = normalizeUrl(item.url);
      
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueItems.push(item);
      }
    }

    return {
      items: uniqueItems,
      metadata: {
        duplicatesRemoved: items.length - uniqueItems.length,
      },
    };
  },
};