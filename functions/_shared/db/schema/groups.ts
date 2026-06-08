import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const groups = sqliteTable(
  'groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    type: text('type', { enum: ['category', 'slider'] }).notNull().default('category'),
    sliderMin: integer('slider_min').default(1),
    sliderMax: integer('slider_max').default(5),
    // JSON-encoded string array, e.g. '["Low","Medium","High"]' — stored as TEXT (no native JSON in SQLite/D1)
    sliderLabels: text('slider_labels', { mode: 'json' }).$type<string[] | null>(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_groups_user_sort').on(table.userId, table.sortOrder)]
);

export const groupOptions = sqliteTable('group_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
