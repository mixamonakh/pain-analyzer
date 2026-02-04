-- Migration: Add processing system tables
-- Created: 2026-02-04
-- Purpose: Support pipeline-based document processing with versioning

-- 1. Add new fields to documents table
ALTER TABLE documents ADD COLUMN published INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN metadata_json TEXT;

-- 2. Create run_versions table
CREATE TABLE `run_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`version` integer NOT NULL,
	`pipeline_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`stats_json` text,
	`full_storage` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `idx_run_versions_unique` ON `run_versions` (`run_id`,`version`);

-- 3. Create run_version_stages table
CREATE TABLE `run_version_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_version_id` integer NOT NULL,
	`stage_order` integer NOT NULL,
	`processor_id` text NOT NULL,
	`processor_name` text NOT NULL,
	`items_in` integer NOT NULL,
	`items_out` integer NOT NULL,
	`items_removed` integer NOT NULL,
	`clusters_created` integer,
	`duration_ms` integer NOT NULL,
	`metadata_json` text,
	FOREIGN KEY (`run_version_id`) REFERENCES `run_versions`(`id`) ON UPDATE no action ON DELETE no action
);

-- 4. Create run_version_samples table
CREATE TABLE `run_version_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_version_id` integer NOT NULL,
	`stage_order` integer NOT NULL,
	`sample_items_json` text NOT NULL,
	`sample_clusters_json` text,
	FOREIGN KEY (`run_version_id`) REFERENCES `run_versions`(`id`) ON UPDATE no action ON DELETE no action
);

-- 5. Migrate existing data: set all existing documents to published
-- (считаем что уже существующие документы были опубликованы)
UPDATE documents SET published = 1 WHERE published IS NULL OR published = 0;

-- 6. Create default version 1 for existing runs
-- (для каждого существующего run создаём версию v1 с пустым пайплайном)
INSERT INTO run_versions (run_id, version, pipeline_json, created_at, full_storage)
SELECT 
  id as run_id,
  1 as version,
  '{"processors":[]}' as pipeline_json,
  COALESCE(finished_at, started_at, strftime('%s', 'now')) as created_at,
  0 as full_storage
FROM runs;