import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, real, index, unique } from 'drizzle-orm/sqlite-core';

export const fitnessConnections = sqliteTable(
  'fitness_connections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    provider: text('provider').notNull().unique(),
    lastSyncedAt: text('last_synced_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  }
);

export const fitnessData = sqliteTable(
  'fitness_data',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceProvider: text('source_provider').notNull(),
    dataType: text('data_type').notNull(),
    date: text('date').notNull(),
    value: real('value').notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('fitness_data_provider_type_date_unique').on(
      table.sourceProvider,
      table.dataType,
      table.date
    ),
    index('idx_fitness_data_date').on(table.date),
  ]
);
