PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`file_path` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_areas`("id", "slug", "title", "file_path", "tags", "updated_at") SELECT "id", "slug", "title", "file_path", "tags", "updated_at" FROM `areas`;--> statement-breakpoint
DROP TABLE `areas`;--> statement-breakpoint
ALTER TABLE `__new_areas` RENAME TO `areas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `areas_slug_unique` ON `areas` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `areas_file_path_unique` ON `areas` (`file_path`);--> statement-breakpoint
CREATE TABLE `__new_daily_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`file_path` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_daily_notes`("id", "date", "file_path", "content", "updated_at") SELECT "id", "date", "file_path", "content", "updated_at" FROM `daily_notes`;--> statement-breakpoint
DROP TABLE `daily_notes`;--> statement-breakpoint
ALTER TABLE `__new_daily_notes` RENAME TO `daily_notes`;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_notes_date_unique` ON `daily_notes` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `daily_notes_file_path_unique` ON `daily_notes` (`file_path`);--> statement-breakpoint
CREATE INDEX `daily_notes_date_idx` ON `daily_notes` (`date`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`file_path` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "slug", "title", "status", "file_path", "tags", "updated_at") SELECT "id", "slug", "title", "status", "file_path", "tags", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_file_path_unique` ON `projects` (`file_path`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text,
	`title` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`due_date` text,
	`done_date` text,
	`scheduled_date` text,
	`created_date` text,
	`start_date` text,
	`recurrence` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`file_path` text NOT NULL,
	`line_number` integer,
	`project_id` integer,
	`area_id` integer,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "task_id", "title", "completed", "priority", "due_date", "done_date", "scheduled_date", "created_date", "start_date", "recurrence", "tags", "notes", "file_path", "line_number", "project_id", "area_id", "updated_at") SELECT "id", "task_id", "title", "completed", "priority", "due_date", "done_date", "scheduled_date", "created_date", "start_date", "recurrence", "tags", "notes", "file_path", "line_number", "project_id", "area_id", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
CREATE INDEX `tasks_file_path_idx` ON `tasks` (`file_path`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_completed_idx` ON `tasks` (`completed`);--> statement-breakpoint
CREATE INDEX `tasks_project_id_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_area_id_idx` ON `tasks` (`area_id`);