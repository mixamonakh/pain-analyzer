// src/lib/processing/processors/filter-author.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';

export const filterAuthorProcessor: Processor = {
  id: 'filter_author',
  type: 'filter',
  name: 'Блэклист авторов',
  description: 'Исключает документы от указанных авторов.',

  requirements: {
    requiredFields: ['author'],
  },

  schema: {
    blacklist: {
      type: 'string[]',
      label: 'Список авторов для исключения',
      default: [],
      placeholder: 'Введите имя автора и нажмите Enter',
    },
  },

  async process(
    items: ProcessingItem[],
    config: { blacklist: string[] }
  ): Promise<ProcessorResult> {
    if (!config.blacklist || config.blacklist.length === 0) {
      return { items };
    }

    // Преобразуем в lowercase для поиска
    const lowercaseBlacklist = config.blacklist.map(a => a.toLowerCase());

    const filteredItems = items.filter(item => {
      if (!item.author) {
        return true; // Оставляем документы без автора
      }

      const authorLower = item.author.toLowerCase();
      return !lowercaseBlacklist.some(blocked => authorLower.includes(blocked));
    });

    return {
      items: filteredItems,
      metadata: {
        excludedCount: items.length - filteredItems.length,
        blacklist: config.blacklist,
      },
    };
  },
};