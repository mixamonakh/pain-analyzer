// src/lib/processing/types.ts

/**
 * Унифицированный документ для обработки
 * Создаётся из documents + raw_items с поддержкой гетерогенных источников
 */
export interface ProcessingItem {
  // Обязательный минимум (есть у всех коннекторов)
  id: number;
  sourceId: number;
  sourceName: string;
  url: string;
  title: string;
  text: string;
  
  // Опциональные поля (зависят от коннектора)
  author?: string;
  language?: string;
  publishedAt?: number | null;
  
  // Медиа (для ТГ, VK, HTML с картинками)
  media?: {
    images?: Array<{ url: string; width?: number; height?: number }>;
    videos?: Array<{ url: string; duration?: number }>;
  };
  
  // Произвольные мета-данные (лайки, репосты, etc)
  metadata?: Record<string, any>;
  
  // Сырьё для отладки
  rawItemId: number;
  rawContent: string;
  contentType: 'html' | 'json' | 'text';
  fetchedAt: number;
}

/**
 * Конфигурация пайплайна обработки
 */
export interface PipelineConfig {
  processors: Array<{
    order: number;
    id: string; // 'dedup_url', 'exclude_phrases', etc
    enabled: boolean;
    config: Record<string, any>; // Параметры процессора
  }>;
}

/**
 * Данные кластера после кластеризации
 */
export interface ClusterData {
  id?: number; // Опционально, присваивается при сохранении в БД
  title: string;
  mentionsCount: number;
  topTerms: Array<{ term: string; weight: number }>;
  avgSimilarity: number;
  documents: Array<{
    id: number;
    similarity: number;
  }>;
}

/**
 * Результат обработки процессора
 */
export interface ProcessorResult {
  items: ProcessingItem[];
  clusters?: ClusterData[];
  metadata?: Record<string, any>; // Дополнительная информация от процессора
}

/**
 * Статистика этапа обработки
 */
export interface StageStats {
  order: number;
  processorId: string;
  processorName: string;
  itemsIn: number;
  itemsOut: number;
  itemsRemoved: number;
  clustersCreated?: number;
  durationMs: number;
  metadata?: Record<string, any>;
}

/**
 * Требования процессора к данным
 */
export interface ProcessorRequirements {
  requiredFields?: Array<keyof ProcessingItem>;
  supportedContentTypes?: Array<'html' | 'json' | 'text'>;
  requiresMedia?: boolean;
  requiresLanguage?: boolean;
}

/**
 * Ограничения порядка процессоров
 */
export interface ProcessorConstraints {
  mustBeAfter?: string[]; // Должен идти после указанных процессоров
  mustBeBefore?: string[]; // Должен идти перед указанными
  cannotFollow?: string[]; // Не может идти сразу после указанных
}

/**
 * Схема параметра процессора для генерации UI форм
 */
export interface ProcessorParamSchema {
  type: 'number' | 'string' | 'boolean' | 'string[]';
  label: string;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: string[]; // Для select/radio
}

/**
 * Контракт процессора обработки
 */
export interface Processor {
  id: string;
  type: 'filter' | 'transform' | 'enrich' | 'cluster';
  name: string;
  description: string;
  
  // Требования к данным
  requirements?: ProcessorRequirements;
  
  // Ограничения порядка
  constraints?: ProcessorConstraints;
  
  // Схема параметров для UI
  schema: Record<string, ProcessorParamSchema>;
  
  // Функция обработки
  process: (items: ProcessingItem[], config: any) => Promise<ProcessorResult>;
}

/**
 * Ошибка валидации пайплайна
 */
export interface ValidationError {
  type: 'error' | 'warning';
  processorId: string;
  message: string;
  details?: any;
}

/**
 * Результат валидации пайплайна
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}