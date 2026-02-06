// src/lib/processing/processors/trim-text.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';

export const trimTextProcessor: Processor = {
  id: 'trim_text',
  type: 'transform',
  name: 'Обрезка текста',
  description: 'Обрезает текст документов до указанной максимальной длины.',

  requirements: {
    requiredFields: ['text'], // ТРЕБУЕТ text
  },

  schema: {
    maxLength: {
      type: 'number',
      label: 'Максимальная длина текста (символов)',
      default: 500,
      min: 100,
      max: 5000,
      step: 100,
    },
  },

  async process(
    items: ProcessingItem[],
    config: { maxLength: number }
  ): Promise<ProcessorResult> {
    const maxLength = config.maxLength || 500;

    const transformedItems = items.map(item => {
      // Пропускаем итемы без text (безопасно для optional)
      if (!item.text) {
        return item;
      }

      return {
        ...item,
        text: item.text.length > maxLength 
          ? item.text.substring(0, maxLength) + '...'
          : item.text,
      };
    });

    return {
      items: transformedItems,
      metadata: {
        maxLength,
        trimmedCount: transformedItems.filter((item, i) => 
          item.text && items[i].text && item.text !== items[i].text
        ).length,
      },
    };
  },
};