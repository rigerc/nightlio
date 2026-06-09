import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const userPreferences = sqliteTable('user_preferences', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // JSON-encoded map of mood value -> Lucide icon name, e.g. '{"1":"Frown","5":"Heart"}'
  moodIcons: text('mood_icons', { mode: 'json' }).$type<Record<string, string> | null>(),
  use24HourTime: integer('use_24_hour_time', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userMetrics = sqliteTable('user_metrics', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  statsViews: integer('stats_views').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
