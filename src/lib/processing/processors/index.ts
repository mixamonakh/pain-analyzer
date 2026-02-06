// src/lib/processing/processors/index.ts
import { registerProcessor } from '../registry';
import { dedupUrlProcessor } from './dedup-url';
import { excludePhrasesProcessor } from './exclude-phrases';
import { trimTextProcessor } from './trim-text';
import { filterAuthorProcessor } from './filter-author';
import { clusterTfidfProcessor } from './cluster-tfidf';
import { extractHtmlProcessor } from './extract-html';

/**
 * Авторегистрация всех процессоров
 * Вызывается при импорте модуля
 */
export function initializeProcessors() {
  // Регистрируем все базовые процессоры
  registerProcessor(extractHtmlProcessor); // Первым!
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
  extractHtmlProcessor,
  dedupUrlProcessor,
  excludePhrasesProcessor,
  trimTextProcessor,
  filterAuthorProcessor,
  clusterTfidfProcessor,
};