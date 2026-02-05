CREATE TABLE `connector_credentials` (
	`source_id` integer PRIMARY KEY NOT NULL,
	`credentials_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`operations_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `raw_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`content_type` text NOT NULL,
	`content_body` text NOT NULL,
	`media_json` text,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `run_version_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_version_id` integer NOT NULL,
	`stage_order` integer NOT NULL,
	`sample_items_json` text NOT NULL,
	`sample_clusters_json` text,
	FOREIGN KEY (`run_version_id`) REFERENCES `run_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
DROP INDEX `documents_normalized_url_unique`;--> statement-breakpoint
ALTER TABLE `documents` ADD `excluded` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `metadata_json` text;--> statement-breakpoint
CREATE UNIQUE INDEX `documents_published_url_idx` ON `documents` (`normalized_url`) WHERE "documents"."status" = 'published';--> statement-breakpoint
CREATE INDEX `documents_run_status_idx` ON `documents` (`run_id`,`status`);