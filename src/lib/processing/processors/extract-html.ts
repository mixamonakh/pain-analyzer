// src/lib/processing/processors/extract-html.ts
import type { Processor, ProcessingItem, ProcessorResult } from '../types';
import { parseHTML } from '@/lib/html-parser';

export const extractHtmlProcessor: Processor = {
  id: 'extract_html',
  type: 'transform',
  name: 'Экстракция HTML',
  description: 'Извлекает текст из rawContent (тип html) и заполняет item.text.',

  requirements: {
    supportedContentTypes: ['html'], // Работает только с HTML
  },

  schema: {
    stripScripts: {
      type: 'boolean',
      label: 'Удалять <script> теги',
      default: true,
    },
    stripStyles: {
      type: 'boolean',
      label: 'Удалять <style> теги',
      default: true,
    },
  },

  async process(
    items: ProcessingItem[],
    config: { stripScripts?: boolean; stripStyles?: boolean }
  ): Promise<ProcessorResult> {
    const stripScripts = config.stripScripts !== false;
    const stripStyles = config.stripStyles !== false;

    let extractedCount = 0;
    let skippedNonHtml = 0;
    let alreadyHadText = 0;

    const transformedItems = items.map(item => {
      // Пропускаем не-HTML
      if (item.contentType !== 'html') {
        skippedNonHtml++;
        return item;
      }

      // Пропускаем если уже есть text
      if (item.text) {
        alreadyHadText++;
        return item;
      }

      // Извлекаем текст
      try {
        const extractedText = parseHTML(item.rawContent, {
          stripScripts,
          stripStyles,
        });

        extractedCount++;
        return {
          ...item,
          text: extractedText,
        };
      } catch (error) {
        console.warn(`Failed to extract HTML for item ${item.id}:`, error);
        return item;
      }
    });

    return {
      items: transformedItems,
      metadata: {
        extractedCount,
        skippedNonHtml,
        alreadyHadText,
        total: items.length,
      },
    };
  },
};