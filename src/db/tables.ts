// File: src/db/tables.ts
import { sqliteTable, integer, text, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  feed_url: text('feed_url').notNull(),
  plugin_type: text('plugin_type').notNull(),
  enabled: integer('enabled').notNull().default(1),
  created_at: integer('created_at').notNull(),
});

export const runs = sqliteTable('runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status').notNull(),
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
  normalized_url: text('normalized_url').notNull().unique(),
  title: text('title').notNull(),
  text_preview: text('text_preview').notNull(),
  published_at: integer('published_at'),
  fetched_at: integer('fetched_at').notNull(),
  content_hash: text('content_hash').notNull(),
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
  level: text('level').notNull(),
  component: text('component').notNull(),
  message: text('message').notNull(),
  meta_json: text('meta_json'),
  created_at: integer('created_at').notNull(),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description').notNull(),
});
