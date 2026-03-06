CREATE TABLE `api_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`name` text DEFAULT 'default' NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`location` text,
	`description` text,
	`calendar_name` text,
	`date` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_external_id_unique` ON `calendar_events` (`external_id`);--> statement-breakpoint
CREATE INDEX `calendar_events_date_idx` ON `calendar_events` (`date`);--> statement-breakpoint
CREATE INDEX `calendar_events_external_id_idx` ON `calendar_events` (`external_id`);