CREATE TABLE `cluster_documents` (
	`cluster_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`similarity` real NOT NULL,
	PRIMARY KEY(`cluster_id`, `document_id`),
	FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clusters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`title` text NOT NULL,
	`mentions_count` integer NOT NULL,
	`top_terms_json` text NOT NULL,
	`avg_similarity` real NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`run_id` integer NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`title` text NOT NULL,
	`text_preview` text NOT NULL,
	`published_at` integer,
	`fetched_at` integer NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_normalized_url_unique` ON `documents` (`normalized_url`);--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer,
	`level` text NOT NULL,
	`component` text NOT NULL,
	`message` text NOT NULL,
	`meta_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`stats_json` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`feed_url` text NOT NULL,
	`plugin_type` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
