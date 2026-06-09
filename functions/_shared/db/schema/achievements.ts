import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const achievements = sqliteTable(
  'achievements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementType: text('achievement_type').notNull(),
    earnedAt: text('earned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    nftMinted: integer('nft_minted', { mode: 'boolean' }).notNull().default(false),
    nftTokenId: integer('nft_token_id'),
    nftTxHash: text('nft_tx_hash'),
  },
  (table) => [unique('achievements_user_type_unique').on(table.userId, table.achievementType)]
);
