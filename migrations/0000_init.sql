CREATE TABLE `activity_minutes` (
	`user_id` text NOT NULL,
	`minute` integer NOT NULL,
	PRIMARY KEY(`user_id`, `minute`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`cloze_answer` text,
	`hint` text,
	`note` text,
	`source_kind` text NOT NULL,
	`source_ref` text NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` text NOT NULL,
	`last_review` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cards_user_due_idx` ON `cards` (`user_id`,`due`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_user_type_front_uq` ON `cards` (`user_id`,`type`,`front`);--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`reviews` integer DEFAULT 0 NOT NULL,
	`readings` integer DEFAULT 0 NOT NULL,
	`freeze_used` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_chapter_id` text,
	`time_zone` text NOT NULL,
	`daily_goal_minutes` integer NOT NULL,
	`settings` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_user_reviewed_at_idx` ON `reviews` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `text_reads` (
	`user_id` text NOT NULL,
	`text_id` text NOT NULL,
	`date` text NOT NULL,
	`finished_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `text_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `translation_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`text` text NOT NULL,
	`result` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `word_status` (
	`user_id` text NOT NULL,
	`lemma` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `lemma`)
);
