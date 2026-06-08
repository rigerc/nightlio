import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLogin: text('last_login').notNull().default(sql`CURRENT_TIMESTAMP`),
});
