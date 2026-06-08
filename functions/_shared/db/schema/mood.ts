import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { groups, groupOptions } from './groups';

export const moodEntries = sqliteTable(
  'mood_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    // CHECK (mood >= 1 AND mood <= 5) authored as raw SQL in the migration; Zod enforces at the API boundary
    mood: integer('mood').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    isImportant: integer('is_important', { mode: 'boolean' }).notNull().default(false),
    importantReason: text('important_reason'),
  },
  (table) => [index('idx_mood_entries_date').on(table.date)]
);

export const entryMoodLogs = sqliteTable(
  'entry_mood_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entryId: integer('entry_id')
      .notNull()
      .references(() => moodEntries.id, { onDelete: 'cascade' }),
    mood: integer('mood').notNull(),
    loggedAt: text('logged_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_entry_mood_logs_entry').on(table.entryId)]
);

export const entrySelections = sqliteTable('entry_selections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id')
    .notNull()
    .references(() => moodEntries.id, { onDelete: 'cascade' }),
  optionId: integer('option_id')
    .notNull()
    .references(() => groupOptions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  source: text('source').notNull().default('user'),
});

export const entrySliderValues = sqliteTable(
  'entry_slider_values',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entryId: integer('entry_id')
      .notNull()
      .references(() => moodEntries.id, { onDelete: 'cascade' }),
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique('entry_slider_values_entry_group_unique').on(table.entryId, table.groupId)]
);
