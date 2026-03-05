CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`file_path` text,
	`email` text,
	`company` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_slug_unique` ON `people` (`slug`);--> statement-breakpoint
CREATE INDEX `people_slug_idx` ON `people` (`slug`);--> statement-breakpoint
CREATE TABLE `task_people` (
	`task_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_people_task_idx` ON `task_people` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_people_person_idx` ON `task_people` (`person_id`);