// src/lib/processing/index.ts
// Главный экспорт processing модуля

// Инициализируем процессоры (регистрация)
import './processors';

// Экспорт типов
export type {
  ProcessingItem,
  PipelineConfig,
  Processor,
  ProcessorResult,
  ProcessorRequirements,
  ProcessorConstraints,
  ProcessorParamSchema,
  ClusterData,
  StageStats,
  ValidationError,
  ValidationResult,
} from './types';

// Экспорт реестра
export {
  registerProcessor,
  getProcessor,
  getAllProcessors,
  getProcessorsMetadata,
  validatePipeline,
} from './registry';

// Экспорт executor
export {
  executePipeline,
  type ExecutePipelineOptions,
  type ExecutePipelineResult,
} from './pipeline-executor';

// Экспорт процессоров
export {
  dedupUrlProcessor,
  excludePhrasesProcessor,
  trimTextProcessor,
  filterAuthorProcessor,
  clusterTfidfProcessor,
} from './processors';