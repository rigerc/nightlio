import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey().default(1),
  moodIcons: text('mood_icons', { mode: 'json' }).$type<Record<string, string> | null>(),
  use24HourTime: integer('use_24_hour_time', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
