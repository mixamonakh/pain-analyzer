// src/db/tables.ts
import { sqliteTable, integer, text, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  feed_url: text('feed_url').notNull(),
  plugin_type: text('plugin_type').notNull(), // 'rss' | 'telegram' | 'html'
  enabled: integer('enabled').notNull().default(1),
  created_at: integer('created_at').notNull(),
});

export const runs = sqliteTable('runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status').notNull(), // 'pending' | 'running' | 'done' | 'error'
  started_at: integer('started_at'),
  finished_at: integer('finished_at'),
  stats_json: text('stats_json'),
  error_message: text('error_message'),
});

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source_id: integer('source_id').notNull().references(() => sources.id),
  run_id: integer('run_id').notNull().references(() => runs.id),
  url: text('url').notNull(),
  normalized_url: text('normalized_url').notNull(),
  title: text('title').notNull(),
  text_preview: text('text_preview').notNull(),
  published_at: integer('published_at'),
  fetched_at: integer('fetched_at').notNull(),
  content_hash: text('content_hash').notNull(),
  excluded: integer('excluded').notNull().default(0), // 0 = active, 1 = filtered out
  
  // NEW: Status для разделения draft/published
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  
  // NEW FIELDS for processing system
  metadata_json: text('metadata_json'), // Arbitrary data from connectors (VK likes, TG reactions, etc)
}, (t) => ({
  // Уникальный индекс: один published документ на normalized_url
  publishedUrlIdx: uniqueIndex('documents_published_url_idx').on(t.normalized_url, t.status).where(t.status.eq('published')),
  // Индекс для выборки черновиков run
  runStatusIdx: index('documents_run_status_idx').on(t.run_id, t.status),
}));

// NEW TABLE: Сырой контент без потерь
export const raw_items = sqliteTable('raw_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  document_id: integer('document_id').notNull().references(() => documents.id),
  content_type: text('content_type').notNull(), // 'html' | 'json' | 'text'
  content_body: text('content_body').notNull(), // Полный контент как пришёл
  media_json: text('media_json'), // Метаданные медиафайлов (URL, размеры и т.п.)
  fetched_at: integer('fetched_at').notNull(),
});

// NEW TABLE: Сохранённые пайплайны обработки
export const pipelines = sqliteTable('pipelines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  operations_json: text('operations_json').notNull(), // [{"type":"dedup_url"}, ...]
  created_at: integer('created_at').notNull(),
});

// NEW TABLE: Processing versions within a run
export const run_versions = sqliteTable('run_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  run_id: integer('run_id').notNull().references(() => runs.id),
  version: integer('version').notNull(),
  pipeline_json: text('pipeline_json').notNull(), // Pipeline config for reproducibility
  created_at: integer('created_at').notNull(),
  stats_json: text('stats_json'), // Top-level: total documents, clusters, duration
  full_storage: integer('full_storage').notNull().default(0), // Flag for future full document storage
});

// NEW TABLE: Processing stage statistics
export const run_version_stages = sqliteTable('run_version_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  run_version_id: integer('run_version_id').notNull().references(() => run_versions.id),
  stage_order: integer('stage_order').notNull(),
  processor_id: text('processor_id').notNull(),
  processor_name: text('processor_name').notNull(),
  items_in: integer('items_in').notNull(),
  items_out: integer('items_out').notNull(),
  items_removed: integer('items_removed').notNull(),
  clusters_created: integer('clusters_created'),
  duration_ms: integer('duration_ms').notNull(),
  metadata_json: text('metadata_json'), // Additional processor info
});

// NEW TABLE: Sample documents for preview and LLM analysis
export const run_version_samples = sqliteTable('run_version_samples', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  run_version_id: integer('run_version_id').notNull().references(() => run_versions.id),
  stage_order: integer('stage_order').notNull(),
  sample_items_json: text('sample_items_json').notNull(), // 20-50 documents after this stage
  sample_clusters_json: text('sample_clusters_json'), // If stage performed clustering
});

// NEW TABLE: Credentials для коннекторов (Telegram session и т.п.)
export const connector_credentials = sqliteTable('connector_credentials', {
  source_id: integer('source_id').primaryKey().references(() => sources.id),
  credentials_json: text('credentials_json').notNull(), // Зашифрованные данные
  updated_at: integer('updated_at').notNull(),
});

export const clusters = sqliteTable('clusters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  run_id: integer('run_id').notNull().references(() => runs.id),
  title: text('title').notNull(),
  mentions_count: integer('mentions_count').notNull(),
  top_terms_json: text('top_terms_json').notNull(),
  avg_similarity: real('avg_similarity').notNull(),
});

export const cluster_documents = sqliteTable(
  'cluster_documents',
  {
    cluster_id: integer('cluster_id').notNull().references(() => clusters.id),
    document_id: integer('document_id').notNull().references(() => documents.id),
    similarity: real('similarity').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cluster_id, t.document_id] }),
  })
);

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  run_id: integer('run_id').references(() => runs.id),
  level: text('level').notNull(), // 'info' | 'warn' | 'error'
  component: text('component').notNull(), // 'worker' | 'fetch' | 'cluster'
  message: text('message').notNull(),
  meta_json: text('meta_json'),
  created_at: integer('created_at').notNull(),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description').notNull(),
});