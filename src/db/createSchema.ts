import { expo } from './client';

export function createSchema(): void {
  expo.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS "groups" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" TEXT NOT NULL,
      "color" TEXT,
      "icon" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "type" TEXT NOT NULL DEFAULT 'category',
      "slider_min" INTEGER DEFAULT 1,
      "slider_max" INTEGER DEFAULT 5,
      "slider_labels" TEXT,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "group_options" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "group_id" INTEGER NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "icon" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "mood_entries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "date" TEXT NOT NULL,
      "mood" INTEGER NOT NULL,
      "content" TEXT NOT NULL DEFAULT '',
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "is_important" INTEGER NOT NULL DEFAULT 0,
      "important_reason" TEXT
    );

    CREATE INDEX IF NOT EXISTS "idx_mood_entries_date" ON "mood_entries" ("date");

    CREATE TABLE IF NOT EXISTS "entry_mood_logs" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "entry_id" INTEGER NOT NULL REFERENCES "mood_entries"("id") ON DELETE CASCADE,
      "mood" INTEGER NOT NULL,
      "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "idx_entry_mood_logs_entry" ON "entry_mood_logs" ("entry_id");

    CREATE TABLE IF NOT EXISTS "entry_selections" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "entry_id" INTEGER NOT NULL REFERENCES "mood_entries"("id") ON DELETE CASCADE,
      "option_id" INTEGER NOT NULL REFERENCES "group_options"("id") ON DELETE CASCADE,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "source" TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS "entry_slider_values" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "entry_id" INTEGER NOT NULL REFERENCES "mood_entries"("id") ON DELETE CASCADE,
      "group_id" INTEGER NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
      "value" INTEGER NOT NULL,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("entry_id", "group_id")
    );

    CREATE TABLE IF NOT EXISTS "goals" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "frequency_per_week" INTEGER NOT NULL,
      "completed" INTEGER NOT NULL DEFAULT 0,
      "streak" INTEGER NOT NULL DEFAULT 0,
      "period_start" TEXT,
      "last_completed_date" TEXT,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "idx_goals_created" ON "goals" ("created_at");

    CREATE TABLE IF NOT EXISTS "goal_completions" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "goal_id" INTEGER NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
      "date" TEXT NOT NULL,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("goal_id", "date")
    );

    CREATE INDEX IF NOT EXISTS "idx_goal_completions_goal" ON "goal_completions" ("goal_id");
    CREATE INDEX IF NOT EXISTS "idx_goal_completions_date" ON "goal_completions" ("date");

    CREATE TABLE IF NOT EXISTS "achievements" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "achievement_type" TEXT NOT NULL,
      "earned_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("achievement_type")
    );

    CREATE TABLE IF NOT EXISTS "fitness_connections" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "provider" TEXT NOT NULL UNIQUE,
      "last_synced_at" TEXT,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "fitness_data" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "source_provider" TEXT NOT NULL,
      "data_type" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "value" REAL NOT NULL,
      "metadata" TEXT,
      "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("source_provider", "data_type", "date")
    );

    CREATE INDEX IF NOT EXISTS "idx_fitness_data_date" ON "fitness_data" ("date");

    CREATE TABLE IF NOT EXISTS "user_preferences" (
      "id" INTEGER PRIMARY KEY DEFAULT 1,
      "mood_icons" TEXT,
      "use_24_hour_time" INTEGER NOT NULL DEFAULT 0,
      "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
