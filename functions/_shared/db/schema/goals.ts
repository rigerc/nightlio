import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const goals = sqliteTable(
  'goals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    // CHECK (frequency_per_week BETWEEN 1 AND 7) authored as raw SQL in the migration
    frequencyPerWeek: integer('frequency_per_week').notNull(),
    completed: integer('completed').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    periodStart: text('period_start'),
    lastCompletedDate: text('last_completed_date'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_goals_user').on(table.userId)]
);

export const goalCompletions = sqliteTable(
  'goal_completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    goalId: integer('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('goal_completions_user_goal_date_unique').on(table.userId, table.goalId, table.date),
    index('idx_goal_completions_user_goal').on(table.userId, table.goalId),
    index('idx_goal_completions_date').on(table.date),
  ]
);
