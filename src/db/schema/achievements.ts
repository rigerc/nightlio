import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

export const achievements = sqliteTable(
  'achievements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    achievementType: text('achievement_type').notNull(),
    earnedAt: text('earned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique('achievements_type_unique').on(table.achievementType)]
);
