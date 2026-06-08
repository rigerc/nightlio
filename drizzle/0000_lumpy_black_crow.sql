CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_login` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE TABLE `group_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'category' NOT NULL,
	`slider_min` integer DEFAULT 1,
	`slider_max` integer DEFAULT 5,
	`slider_labels` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE TABLE `entry_mood_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`mood` integer NOT NULL CHECK (`mood` >= 1 AND `mood` <= 5),
	`logged_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `mood_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entry_mood_logs_entry` ON `entry_mood_logs` (`entry_id`);--> statement-breakpoint
CREATE TABLE `entry_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`option_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `mood_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `group_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry_slider_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`value` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `mood_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_slider_values_entry_group_unique` ON `entry_slider_values` (`entry_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `mood_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`mood` integer NOT NULL CHECK (`mood` >= 1 AND `mood` <= 5),
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_important` integer DEFAULT false NOT NULL,
	`important_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mood_entries_date` ON `mood_entries` (`date`);--> statement-breakpoint
CREATE TABLE `goal_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`goal_id` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_goal_completions_user_goal` ON `goal_completions` (`user_id`,`goal_id`);--> statement-breakpoint
CREATE INDEX `idx_goal_completions_date` ON `goal_completions` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `goal_completions_user_goal_date_unique` ON `goal_completions` (`user_id`,`goal_id`,`date`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`frequency_per_week` integer NOT NULL CHECK (`frequency_per_week` >= 1 AND `frequency_per_week` <= 7),
	`completed` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`period_start` text,
	`last_completed_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_goals_user` ON `goals` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_metrics` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`stats_views` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`mood_icons` text,
	`use_24_hour_time` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`achievement_type` text NOT NULL,
	`earned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`nft_minted` integer DEFAULT false NOT NULL,
	`nft_token_id` integer,
	`nft_tx_hash` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_user_type_unique` ON `achievements` (`user_id`,`achievement_type`);--> statement-breakpoint
CREATE TABLE `fitness_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` text,
	`last_synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fitness_connections_user` ON `fitness_connections` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_connections_user_provider_unique` ON `fitness_connections` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `fitness_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`source_provider` text NOT NULL,
	`data_type` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fitness_data_user_date` ON `fitness_data` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_data_user_provider_type_date_unique` ON `fitness_data` (`user_id`,`source_provider`,`data_type`,`date`);