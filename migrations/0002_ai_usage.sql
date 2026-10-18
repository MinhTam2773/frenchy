CREATE TABLE `ai_usage` (
	`user_id` text NOT NULL,
	`window_start` integer NOT NULL,
	`requests` integer NOT NULL,
	PRIMARY KEY(`user_id`, `window_start`)
);
