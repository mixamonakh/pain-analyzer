// src/lib/processing/processors/exclude-phrases.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';

export const excludePhrasesProcessor: Processor = {
  id: 'exclude_phrases',
  type: 'filter',
  name: 'Исключение по фразам',
  description: 'Удаляет документы, содержащие указанные фразы (регистр не учитывается).',

  requirements: {
    requiredFields: ['text'], // ТРЕБУЕТ text
  },

  schema: {
    phrases: {
      type: 'string[]',
      label: 'Список фраз для исключения',
      default: [],
      placeholder: 'Введите фразу и нажмите Enter',
    },
  },

  async process(
    items: ProcessingItem[],
    config: { phrases: string[] }
  ): Promise<ProcessorResult> {
    if (!config.phrases || config.phrases.length === 0) {
      return { items };
    }

    // Преобразуем фразы в lowercase для поиска
    const lowercasePhrases = config.phrases.map(p => p.toLowerCase());

    const filteredItems = items.filter(item => {
      // Пропускаем итемы без text
      if (!item.text) {
        return true; // Оставляем такие итемы
      }

      const titleLower = item.title.toLowerCase();
      const textLower = item.text.toLowerCase();

      // Проверяем наличие любой фразы
      for (const phrase of lowercasePhrases) {
        if (titleLower.includes(phrase) || textLower.includes(phrase)) {
          return false; // Исключаем
        }
      }

      return true; // Оставляем
    });

    return {
      items: filteredItems,
      metadata: {
        excludedCount: items.length - filteredItems.length,
        phrases: config.phrases,
      },
    };
  },
};