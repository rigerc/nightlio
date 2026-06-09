import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, real, index, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const fitnessConnections = sqliteTable(
  'fitness_connections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt: text('expires_at'),
    lastSyncedAt: text('last_synced_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('fitness_connections_user_provider_unique').on(table.userId, table.provider),
    index('idx_fitness_connections_user').on(table.userId),
  ]
);

export const fitnessData = sqliteTable(
  'fitness_data',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceProvider: text('source_provider').notNull(),
    dataType: text('data_type').notNull(),
    date: text('date').notNull(),
    value: real('value').notNull(),
    // JSON-encoded metadata blob — stored as TEXT (no native JSON in SQLite/D1)
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('fitness_data_user_provider_type_date_unique').on(
      table.userId,
      table.sourceProvider,
      table.dataType,
      table.date
    ),
    index('idx_fitness_data_user_date').on(table.userId, table.date),
  ]
);
