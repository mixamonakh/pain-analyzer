// src/lib/processing/registry.ts
import type { Processor, PipelineConfig, ValidationResult, ValidationError, ProcessingItem } from './types';

const processors = new Map<string, Processor>();

/**
 * Регистрация процессора
 */
export function registerProcessor(processor: Processor): void {
  if (processors.has(processor.id)) {
    throw new Error(`Processor with id "${processor.id}" already registered`);
  }
  processors.set(processor.id, processor);
}

/**
 * Получение процессора по ID
 */
export function getProcessor(id: string): Processor | undefined {
  return processors.get(id);
}

/**
 * Получение всех процессоров (для UI)
 */
export function getAllProcessors(): Processor[] {
  return Array.from(processors.values());
}

/**
 * Получение метаданных процессоров без функции process (для API)
 */
export function getProcessorsMetadata() {
  return Array.from(processors.values()).map(p => ({
    id: p.id,
    type: p.type,
    name: p.name,
    description: p.description,
    requirements: p.requirements,
    constraints: p.constraints,
    schema: p.schema,
  }));
}

/**
 * Валидация пайплайна
 */
export function validatePipeline(
  pipeline: PipelineConfig,
  sourceItems?: ProcessingItem[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const enabledProcessors = pipeline.processors
    .filter(p => p.enabled)
    .sort((a, b) => a.order - b.order);

  // 1. Проверка существования процессоров
  for (const step of enabledProcessors) {
    const processor = getProcessor(step.id);
    if (!processor) {
      errors.push({
        type: 'error',
        processorId: step.id,
        message: `Процессор "${step.id}" не найден в реестре`,
      });
    }
  }

  // Если есть ошибки на этом этапе - дальше не проверяем
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 2. Проверка порядка (constraints)
  for (let i = 0; i < enabledProcessors.length; i++) {
    const step = enabledProcessors[i];
    const processor = getProcessor(step.id)!;

    if (processor.constraints) {
      // mustBeAfter
      if (processor.constraints.mustBeAfter) {
        for (const requiredId of processor.constraints.mustBeAfter) {
          const requiredIndex = enabledProcessors.findIndex(p => p.id === requiredId);
          if (requiredIndex === -1) {
            warnings.push({
              type: 'warning',
              processorId: step.id,
              message: `Процессор "${processor.name}" рекомендуется использовать после "${requiredId}", но он отсутствует в пайплайне`,
            });
          } else if (requiredIndex >= i) {
            errors.push({
              type: 'error',
              processorId: step.id,
              message: `Процессор "${processor.name}" должен стоять после "${requiredId}"`,
            });
          }
        }
      }

      // mustBeBefore
      if (processor.constraints.mustBeBefore) {
        for (const requiredId of processor.constraints.mustBeBefore) {
          const requiredIndex = enabledProcessors.findIndex(p => p.id === requiredId);
          if (requiredIndex !== -1 && requiredIndex <= i) {
            errors.push({
              type: 'error',
              processorId: step.id,
              message: `Процессор "${processor.name}" должен стоять перед "${requiredId}"`,
            });
          }
        }
      }

      // cannotFollow
      if (processor.constraints.cannotFollow && i > 0) {
        const prevStep = enabledProcessors[i - 1];
        if (processor.constraints.cannotFollow.includes(prevStep.id)) {
          errors.push({
            type: 'error',
            processorId: step.id,
            message: `Процессор "${processor.name}" не может идти сразу после "${prevStep.id}"`,
          });
        }
      }
    }
  }

  // 3. Проверка требований к данным (если есть sourceItems)
  if (sourceItems && sourceItems.length > 0) {
    for (const step of enabledProcessors) {
      const processor = getProcessor(step.id)!;

      if (processor.requirements) {
        // requiredFields
        if (processor.requirements.requiredFields) {
          for (const field of processor.requirements.requiredFields) {
            const itemsWithoutField = sourceItems.filter(item => item[field] === undefined || item[field] === null);
            if (itemsWithoutField.length > 0) {
              const percentage = Math.round((itemsWithoutField.length / sourceItems.length) * 100);
              warnings.push({
                type: 'warning',
                processorId: step.id,
                message: `Процессор "${processor.name}" требует поле "${field}", но ${itemsWithoutField.length} из ${sourceItems.length} документов (${percentage}%) его не имеют`,
                details: { field, missingCount: itemsWithoutField.length, totalCount: sourceItems.length },
              });
            }
          }
        }

        // supportedContentTypes
        if (processor.requirements.supportedContentTypes) {
          const unsupportedItems = sourceItems.filter(
            item => !processor.requirements!.supportedContentTypes!.includes(item.contentType)
          );
          if (unsupportedItems.length > 0) {
            const percentage = Math.round((unsupportedItems.length / sourceItems.length) * 100);
            warnings.push({
              type: 'warning',
              processorId: step.id,
              message: `Процессор "${processor.name}" поддерживает только ${processor.requirements.supportedContentTypes.join(', ')}, но ${unsupportedItems.length} из ${sourceItems.length} документов (${percentage}%) имеют другой тип`,
              details: { unsupportedCount: unsupportedItems.length, totalCount: sourceItems.length },
            });
          }
        }

        // requiresMedia
        if (processor.requirements.requiresMedia) {
          const itemsWithoutMedia = sourceItems.filter(item => !item.media || (!item.media.images?.length && !item.media.videos?.length));
          if (itemsWithoutMedia.length > 0) {
            const percentage = Math.round((itemsWithoutMedia.length / sourceItems.length) * 100);
            warnings.push({
              type: 'warning',
              processorId: step.id,
              message: `Процессор "${processor.name}" требует медиа-файлы, но ${itemsWithoutMedia.length} из ${sourceItems.length} документов (${percentage}%) их не имеют`,
              details: { missingCount: itemsWithoutMedia.length, totalCount: sourceItems.length },
            });
          }
        }

        // requiresLanguage
        if (processor.requirements.requiresLanguage) {
          const itemsWithoutLanguage = sourceItems.filter(item => !item.language);
          if (itemsWithoutLanguage.length > 0) {
            const percentage = Math.round((itemsWithoutLanguage.length / sourceItems.length) * 100);
            warnings.push({
              type: 'warning',
              processorId: step.id,
              message: `Процессор "${processor.name}" требует информацию о языке, но ${itemsWithoutLanguage.length} из ${sourceItems.length} документов (${percentage}%) её не имеют`,
              details: { missingCount: itemsWithoutLanguage.length, totalCount: sourceItems.length },
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}