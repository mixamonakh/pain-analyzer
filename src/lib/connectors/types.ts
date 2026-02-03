// src/lib/connectors/types.ts

export type ContentType = 'html' | 'json' | 'text';

export type ConnectorType = 'rss' | 'telegram' | 'html';

export interface RawItem {
  externalId: string; // ID в системе источника (guid, message id и т.п.)
  url: string;
  title: string;
  text: string; // нормализованный текст (без html, для text_preview)
  html?: string; // исходный HTML (если есть)
  author?: string;
  publishedAt?: number | null; // Unix timestamp (ms)
  contentType: ContentType;
  contentBody: string; // оригинальное тело (HTML/JSON/текст)
  mediaJson?: any; // вложения, изображения, видео
  meta?: Record<string, any>; // специфичные поля источника
}

export interface ConnectorConfig {
  sourceId: number;
  sourceName: string;
  url: string; // feed_url / telegram:// / https://
  pluginType: ConnectorType;
  fetchTimeoutMs: number;
  fetchDelayMs: number;
  maxItems: number;
  proxyUrl?: string;
}

export interface FetchResult {
  items: RawItem[];
  errors: string[];
}
