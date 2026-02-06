// src/lib/processing/processors/index.ts
import { registerProcessor } from '../registry';
import { dedupUrlProcessor } from './dedup-url';
import { excludePhrasesProcessor } from './exclude-phrases';
import { trimTextProcessor } from './trim-text';
import { filterAuthorProcessor } from './filter-author';
import { clusterTfidfProcessor } from './cluster-tfidf';
import { extractTextProcessor } from './extract_text';
import { extractHtmlProcessor } from './extract-html';

/**
 * Авторегистрация всех процессоров
 * Вызывается при импорте модуля
 */
export function initializeProcessors() {
  // Регистрируем все базовые процессоры
  registerProcessor(extractTextProcessor); // stage 0, первым
  registerProcessor(dedupUrlProcessor);
  registerProcessor(excludePhrasesProcessor);
  registerProcessor(trimTextProcessor);
  registerProcessor(filterAuthorProcessor);
  registerProcessor(clusterTfidfProcessor);
}

// Автоматическая регистрация при импорте
initializeProcessors();

// Ре-экспорт для удобства
export {
  extractTextProcessor,
  extractHtmlProcessor,
  dedupUrlProcessor,
  excludePhrasesProcessor,
  trimTextProcessor,
  filterAuthorProcessor,
  clusterTfidfProcessor,
};