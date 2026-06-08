PRAGMA foreign_keys=off;

DROP INDEX IF EXISTS `idx_groups_user_sort`;

CREATE TABLE `groups_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer REFERENCES `users`(`id`) ON DELETE cascade,
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

INSERT INTO `groups_new` (`id`, `user_id`, `name`, `color`, `icon`, `sort_order`, `type`, `slider_min`, `slider_max`, `slider_labels`, `created_at`)
SELECT `id`, `user_id`, `name`, `color`, `icon`, `sort_order`, `type`, `slider_min`, `slider_max`, `slider_labels`, `created_at`
FROM `groups`;

DROP TABLE `groups`;
ALTER TABLE `groups_new` RENAME TO `groups`;

CREATE INDEX `idx_groups_user_sort` ON `groups` (`user_id`, `sort_order`);

PRAGMA foreign_keys=on;
