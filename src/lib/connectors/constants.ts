// src/lib/connectors/constants.ts

/**
 * Константы для коннекторов.
 * Эти значения можно будет переопределять через UI в будущем.
 */

// Telegram Web селекторы (если изменятся — обновить здесь)
export const TELEGRAM_SELECTORS = {
  MESSAGE: '.tgme_widget_message',
  DATE: '.tgme_widget_message_date time',
  TEXT: '.tgme_widget_message_text',
  DATA_POST_ATTR: 'data-post',
  DATETIME_ATTR: 'datetime',
} as const;

// Временные окна
export const DEFAULT_TIME_WINDOW_HOURS = 24;

// Обрезки и лимиты
export const MAX_TITLE_LENGTH = 100;
export const MAX_AUTO_NAME_LENGTH = 50;

// Таймауты и задержки
export const RSS_FETCH_TIMEOUT_MS = 5000;
export const RSS_MAX_CONTENT_SIZE = 500_000; // 500KB
export const BULK_IMPORT_DELAY_MS = 100; // Задержка между источниками

// Fallback значения
export const TELEGRAM_FALLBACK_NAME = 'telegram-channel';
