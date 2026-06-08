ALTER TABLE `users` ADD COLUMN `clerk_user_id` text;
CREATE UNIQUE INDEX `users_clerk_user_id_unique` ON `users` (`clerk_user_id`);

ALTER TABLE `groups` ADD COLUMN `user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;
CREATE INDEX `idx_groups_user_sort` ON `groups` (`user_id`, `sort_order`);
