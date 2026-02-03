-- Migration: Add modular architecture tables
-- Created: 2026-02-02

-- 1. Добавить поле excluded в documents
ALTER TABLE documents ADD COLUMN excluded INTEGER DEFAULT 0 NOT NULL;

-- 2. Создать таблицу raw_items (сырой контент)
CREATE TABLE IF NOT EXISTS raw_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_body TEXT NOT NULL,
  media_json TEXT,
  fetched_at INTEGER NOT NULL
);

CREATE INDEX idx_raw_items_document_id ON raw_items(document_id);
CREATE INDEX idx_raw_items_fetched_at ON raw_items(fetched_at);

-- 3. Создать таблицу pipelines (сохранённые обработки)
CREATE TABLE IF NOT EXISTS pipelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  operations_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 4. Создать таблицу connector_credentials (учётные данные коннекторов)
CREATE TABLE IF NOT EXISTS connector_credentials (
  source_id INTEGER PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  credentials_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 5. Обновить существующие документы: excluded = 0 по умолчанию
UPDATE documents SET excluded = 0 WHERE excluded IS NULL;
