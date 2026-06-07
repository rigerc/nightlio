"""Database schema helpers for Waymark."""

from __future__ import annotations

import sqlite3
from typing import Iterable

try:  # pragma: no cover - allow module to run outside package context
    from .database_common import DatabaseConnectionMixin, logger
except ImportError:  # pragma: no cover - fallback for scripts
    from database_common import DatabaseConnectionMixin, logger  # type: ignore


DEFAULT_GROUP_ICONS = {
    "Emotions": "Heart",
    "Sleep": "Moon",
    "Productivity": "Target",
    "Health": "Activity",
    "Social": "Users",
    "Romance": "Heart",
    "Sports": "Dumbbell",
    "Mental": "Brain",
    "Chores": "Home",
    "Hobbies": "Sparkles",
    "Food": "Utensils",
    "Bad Habits": "ZapOff",
}

DEFAULT_OPTION_ICONS = {
    "happy": "Smile", "excited": "Sparkles", "grateful": "Heart", "content": "Smile", "calm": "Leaf",
    "hopeful": "Sun", "proud": "Trophy", "loved": "Heart", "unsure": "Meh", "bored": "Meh",
    "lonely": "CloudRain", "anxious": "Wind", "irritated": "ZapOff", "angry": "Flame", "stressed": "ZapOff", "sad": "Frown",
    "well-rested": "Moon", "refreshed": "Sun", "napped": "Cloud", "tired": "ZapOff", "groggy": "Cloud", "exhausted": "Frown", "restless": "Wind",
    "focused": "Target", "motivated": "Zap", "accomplished": "CircleCheck", "productive": "Briefcase", "creative": "Lightbulb",
    "busy": "Clock", "distracted": "Phone", "scattered": "Wind", "overwhelmed": "CloudRain", "low-energy": "ZapOff",
    "energetic": "Zap", "active": "Activity", "healthy": "Heart", "sick": "Pill", "sore": "Dumbbell", "sluggish": "ZapOff",
    "connected": "Users", "social": "MessageCircle", "supported": "ThumbsUp", "isolated": "Cloud", "missing someone": "Heart",
    "affectionate": "Heart", "romantic": "Sparkles", "intimate": "Heart", "distant": "Cloud", "heartbroken": "Frown", "longing": "Moon",
    "worked out": "Dumbbell", "ran": "Footprints", "cycled": "Bike", "walked": "Footprints", "stretched": "PersonStanding", "yoga": "Leaf", "skipped workout": "ZapOff", "sedentary": "Tv",
    "meditated": "Brain", "journaled": "Pencil", "mindful": "Leaf", "therapy": "MessageCircle", "racing thoughts": "Wind", "burned out": "Flame",
    "cleaned": "Sparkles", "cooked": "Utensils", "groceries": "ShoppingBag", "laundry": "Cloud", "tidied": "Home", "behind on chores": "Clock",
    "read": "BookOpen", "gamed": "Gamepad2", "music": "Music", "art": "Pencil", "crafts": "Sparkles", "outdoor": "TreePine", "learned something new": "Lightbulb",
    "ate well": "Apple", "balanced meals": "Apple", "cooked at home": "Utensils", "skipped meals": "Clock", "junk food": "Pizza", "overate": "Utensils", "alcohol": "Coffee",
    "smoked": "Wind", "drank too much": "Coffee", "late night screen time": "Phone", "skipped meds": "Pill", "no exercise": "ZapOff", "too much caffeine": "Coffee",
}


class DatabaseSchemaMixin(DatabaseConnectionMixin):
    """Provides table creation and bootstrap helpers."""

    def init_database(self) -> None:
        """Initialize the database with required tables and seed data."""
        try:
            logger.info("Initializing database at: %s", self.db_path)
            with sqlite3.connect(self.db_path) as conn:
                logger.info("Database connection successful. Creating tables...")

                # Core tables
                self._create_users_table(conn)
                self._create_mood_entries_table(conn)
                self._create_entry_mood_logs_table(conn)
                self._create_groups_table(conn)
                self._create_group_options_table(conn)
                self._create_entry_selections_table(conn)
                self._create_achievements_table(conn)
                self._create_user_preferences_table(conn)

                # Goals and metrics
                self._create_goals_table(conn)
                self._create_goal_completions_table(conn)
                self._create_user_metrics_table(conn)

                # Fitness tracking
                self._create_fitness_connections_table(conn)
                self._create_fitness_data_table(conn)

                # Shared indexes
                self._create_database_indexes(conn)

                conn.commit()
                logger.info("Database initialization complete")

            self._insert_default_groups()
            self._migrate_entry_mood_logs()
            self._migrate_groups_schema()
            self._migrate_group_options_schema()
            self._migrate_entry_selections_source()
            self._migrate_user_preferences_schema()
            self._add_missing_default_groups()
            self._add_missing_default_options()
            self._seed_default_group_colors()
            self._seed_default_group_icons()
        except Exception as exc:  # pragma: no cover - initialization rarely fails
            logger.error("Database initialization failed: %s", exc)
            raise

    # --- Table creation helpers -------------------------------------------------
    def _create_users_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                name TEXT NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        logger.info("Users table ready")

    def _create_mood_entries_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mood_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
            """
        )
        logger.info("Mood entries table ready")

    def _create_entry_mood_logs_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS entry_mood_logs (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_id INTEGER NOT NULL,
                mood     INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entry_id) REFERENCES mood_entries (id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_entry_mood_logs_entry ON entry_mood_logs(entry_id)"
        )
        logger.info("Entry mood logs table ready")

    def _migrate_entry_mood_logs(self) -> None:
        """Seed one mood log per existing entry that has no logs yet."""
        try:
            with self._connect() as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    """
                    SELECT me.id, me.mood, me.created_at
                      FROM mood_entries me
                      LEFT JOIN entry_mood_logs eml ON me.id = eml.entry_id
                     WHERE eml.id IS NULL
                    """
                ).fetchall()
                if rows:
                    conn.executemany(
                        "INSERT INTO entry_mood_logs (entry_id, mood, logged_at) VALUES (?, ?, ?)",
                        [(r["id"], r["mood"], r["created_at"]) for r in rows],
                    )
                    conn.commit()
                    logger.info("Seeded mood logs for %d existing entries", len(rows))
        except Exception as exc:
            logger.warning("Entry mood logs migration failed (non-critical): %s", exc)

    def _create_groups_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        logger.info("Groups table ready")

    def _create_group_options_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS group_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
            )
            """
        )
        logger.info("Group options table ready")

    def _create_entry_selections_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS entry_selections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_id INTEGER NOT NULL,
                option_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entry_id) REFERENCES mood_entries (id) ON DELETE CASCADE,
                FOREIGN KEY (option_id) REFERENCES group_options (id) ON DELETE CASCADE
            )
            """
        )
        logger.info("Entry selections table ready")

    def _create_achievements_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_type TEXT NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                nft_minted BOOLEAN DEFAULT FALSE,
                nft_token_id INTEGER,
                nft_tx_hash TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_type)
            )
            """
        )
        logger.info("Achievements table ready")

    def _create_goals_table(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    frequency_per_week INTEGER NOT NULL CHECK (frequency_per_week >= 1 AND frequency_per_week <= 7),
                    completed INTEGER NOT NULL DEFAULT 0,
                    streak INTEGER NOT NULL DEFAULT 0,
                    period_start TEXT,
                    last_completed_date TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """
            )
            self._migrate_goals_table_schema(conn)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)")
            logger.info("Goals table ready")
        except sqlite3.Error as exc:
            logger.warning("Goals table creation failed (non-critical): %s", exc)

    def _migrate_goals_table_schema(self, conn: sqlite3.Connection) -> None:
        try:
            cur = conn.execute("PRAGMA table_info(goals)")
            cols: Iterable[str] = {row[1] for row in cur.fetchall()}
            if "last_completed_date" not in cols:
                conn.execute("ALTER TABLE goals ADD COLUMN last_completed_date TEXT")
                logger.info("Goals table migrated to include last_completed_date")
        except sqlite3.Error as exc:
            logger.warning("Goals table migration failed (non-critical): %s", exc)

    def _create_goal_completions_table(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS goal_completions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    goal_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
                    UNIQUE(user_id, goal_id, date)
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_goal_completions_user_goal ON goal_completions(user_id, goal_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_goal_completions_date ON goal_completions(date)"
            )
            logger.info("Goal completions table ready")
        except sqlite3.Error as exc:
            logger.warning(
                "Goal completions table creation failed (non-critical): %s", exc
            )

    def _create_user_preferences_table(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id   INTEGER PRIMARY KEY,
                mood_icons TEXT DEFAULT NULL,
                use_24_hour_time INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
            """
        )
        logger.info("User preferences table ready")

    def _migrate_user_preferences_schema(self) -> None:
        try:
            with self._connect() as conn:
                cur = conn.execute("PRAGMA table_info(user_preferences)")
                cols: Iterable[str] = {row[1] for row in cur.fetchall()}
                if "use_24_hour_time" not in cols:
                    conn.execute("ALTER TABLE user_preferences ADD COLUMN use_24_hour_time INTEGER NOT NULL DEFAULT 0")
                    conn.commit()
                    logger.info("User preferences migrated to include use_24_hour_time")
        except sqlite3.Error as exc:
            logger.warning("User preferences migration failed (non-critical): %s", exc)

    def _migrate_groups_schema(self) -> None:
        try:
            with self._connect() as conn:
                cur = conn.execute("PRAGMA table_info(groups)")
                cols = {row[1] for row in cur.fetchall()}
                if "color" not in cols:
                    conn.execute("ALTER TABLE groups ADD COLUMN color TEXT DEFAULT NULL")
                if "icon" not in cols:
                    conn.execute("ALTER TABLE groups ADD COLUMN icon TEXT DEFAULT NULL")
                if "sort_order" not in cols:
                    conn.execute("ALTER TABLE groups ADD COLUMN sort_order INTEGER DEFAULT 0")
                conn.commit()
                logger.info("Groups table schema migration complete")
        except sqlite3.Error as exc:
            logger.warning("Groups schema migration failed (non-critical): %s", exc)

    def _migrate_group_options_schema(self) -> None:
        try:
            with self._connect() as conn:
                cur = conn.execute("PRAGMA table_info(group_options)")
                cols = {row[1] for row in cur.fetchall()}
                if "icon" not in cols:
                    conn.execute("ALTER TABLE group_options ADD COLUMN icon TEXT DEFAULT NULL")
                if "sort_order" not in cols:
                    conn.execute("ALTER TABLE group_options ADD COLUMN sort_order INTEGER DEFAULT 0")
                conn.commit()
                logger.info("Group options table schema migration complete")
        except sqlite3.Error as exc:
            logger.warning("Group options schema migration failed (non-critical): %s", exc)

    def _create_user_metrics_table(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_metrics (
                    user_id INTEGER PRIMARY KEY,
                    stats_views INTEGER NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """
            )
            logger.info("User metrics table ready")
        except sqlite3.Error as exc:
            logger.warning("User metrics table creation failed (non-critical): %s", exc)

    def _create_fitness_connections_table(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS fitness_connections (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER NOT NULL,
                    provider        TEXT NOT NULL,
                    access_token    TEXT NOT NULL,
                    refresh_token   TEXT,
                    expires_at      TEXT,
                    last_synced_at  TEXT,
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, provider)
                )
                """
            )
            logger.info("Fitness connections table ready")
        except sqlite3.Error as exc:
            logger.warning("Fitness connections table creation failed (non-critical): %s", exc)

    def _create_fitness_data_table(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS fitness_data (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER NOT NULL,
                    source_provider TEXT NOT NULL,
                    data_type       TEXT NOT NULL,
                    date            TEXT NOT NULL,
                    value           REAL NOT NULL,
                    metadata        TEXT,
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, source_provider, data_type, date)
                )
                """
            )
            logger.info("Fitness data table ready")
        except sqlite3.Error as exc:
            logger.warning("Fitness data table creation failed (non-critical): %s", exc)

    def _migrate_entry_selections_source(self) -> None:
        try:
            with self._connect() as conn:
                cur = conn.execute("PRAGMA table_info(entry_selections)")
                cols = {row[1] for row in cur.fetchall()}
                if "source" not in cols:
                    conn.execute(
                        "ALTER TABLE entry_selections ADD COLUMN source TEXT DEFAULT 'user'"
                    )
                    conn.commit()
                    logger.info("entry_selections.source column added")
        except sqlite3.Error as exc:
            logger.warning("entry_selections source migration failed (non-critical): %s", exc)

    def _create_database_indexes(self, conn: sqlite3.Connection) -> None:
        try:
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_fitness_data_user_date ON fitness_data(user_id, date DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_fitness_connections_user ON fitness_connections(user_id)"
            )
            logger.info("Database indexes ready")
        except sqlite3.Error as exc:
            logger.warning("Index creation failed (non-critical): %s", exc)

    # --- Seed helpers -----------------------------------------------------------
    def _insert_default_groups(self) -> None:
        default_groups = {
            "Emotions": [
                "happy", "excited", "grateful", "content", "calm",
                "hopeful", "proud", "loved",
                "unsure", "bored", "lonely", "anxious",
                "irritated", "angry", "stressed", "sad",
            ],
            "Sleep": [
                "well-rested", "refreshed", "napped", "relaxed", "downtime",
                "tired", "groggy", "exhausted", "restless",
            ],
            "Productivity": [
                "focused", "motivated", "accomplished", "productive", "creative",
                "busy", "distracted", "scattered", "overwhelmed", "low-energy",
            ],
            "Health": [
                "energetic", "active", "healthy",
                "sick", "sore", "sluggish",
            ],
            "Social": [
                "connected", "social", "supported", "family time", "quality time",
                "isolated", "missing someone",
            ],
            "Romance": [
                "loved", "affectionate", "romantic", "intimate",
                "distant", "heartbroken", "longing",
            ],
            "Sports": [
                "worked out", "ran", "cycled", "walked", "stretched", "yoga",
                "skipped workout", "sedentary",
            ],
            "Mental": [
                "meditated", "journaled", "mindful", "therapy",
                "racing thoughts", "burned out",
            ],
            "Chores": [
                "cleaned", "cooked", "groceries", "laundry", "tidied",
                "behind on chores",
            ],
            "Hobbies": [
                "read", "gamed", "creative", "music", "art", "crafts",
                "outdoor", "watched a show/movie", "learned something new",
            ],
            "Food": [
                "ate well", "balanced meals", "cooked at home",
                "skipped meals", "junk food", "overate", "alcohol",
            ],
            "Bad Habits": [
                "smoked", "drank too much", "late night screen time",
                "skipped meds", "no exercise", "too much caffeine",
            ],
        }

        with self._connect() as conn:
            for group_name, options in default_groups.items():
                cursor = conn.execute(
                    "SELECT id FROM groups WHERE name = ?",
                    (group_name,),
                )
                group_row = cursor.fetchone()

                if not group_row:
                    cursor = conn.execute(
                        "INSERT INTO groups (name) VALUES (?)",
                        (group_name,),
                    )
                    group_id = cursor.lastrowid
                    for option in options:
                        conn.execute(
                            "INSERT INTO group_options (group_id, name) VALUES (?, ?)",
                            (group_id, option),
                        )

            conn.commit()
            logger.info("Default groups ensured")

    def _add_missing_default_groups(self) -> None:
        """Add new default groups to existing installations that pre-date them."""
        new_groups = {
            "Health": [
                "energetic", "active", "healthy",
                "sick", "sore", "sluggish",
            ],
            "Social": [
                "connected", "social", "supported",
                "isolated", "lonely", "missing someone",
            ],
            "Romance": [
                "loved", "affectionate", "romantic", "intimate",
                "distant", "heartbroken", "longing",
            ],
            "Sports": [
                "worked out", "ran", "cycled", "walked", "stretched", "yoga",
                "skipped workout", "sedentary",
            ],
            "Mental": [
                "meditated", "journaled", "mindful", "therapy",
                "scattered", "racing thoughts", "burned out",
            ],
            "Chores": [
                "cleaned", "cooked", "groceries", "laundry", "tidied",
                "behind on chores",
            ],
            "Hobbies": [
                "read", "gamed", "creative", "music", "art", "crafts",
                "outdoor", "learned something new",
            ],
            "Food": [
                "ate well", "balanced meals", "cooked at home",
                "skipped meals", "junk food", "overate", "alcohol",
            ],
            "Bad Habits": [
                "smoked", "drank too much", "late night screen time",
                "skipped meds", "no exercise", "too much caffeine",
            ],
        }
        try:
            with self._connect() as conn:
                for group_name, options in new_groups.items():
                    cursor = conn.execute(
                        "SELECT id FROM groups WHERE name = ?", (group_name,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        cursor = conn.execute(
                            "INSERT INTO groups (name) VALUES (?)", (group_name,)
                        )
                        group_id = cursor.lastrowid
                        for option in options:
                            conn.execute(
                                "INSERT INTO group_options (group_id, name) VALUES (?, ?)",
                                (group_id, option),
                            )
                conn.commit()
                logger.info("Missing default groups added")
        except sqlite3.Error as exc:
            logger.warning("Adding missing default groups failed (non-critical): %s", exc)

    def _add_missing_default_options(self) -> None:
        """Backfill newly-curated default tags into existing groups (additive only).

        Existing installs keep whatever options they already have — this only adds
        tags that close real gaps in the default set (family/quality time, rest &
        relaxation, entertainment), it never removes or renames anything.
        """
        new_options = {
            "Sleep": ["relaxed", "downtime"],
            "Social": ["family time", "quality time"],
            "Hobbies": ["watched a show/movie"],
        }
        try:
            with self._connect() as conn:
                for group_name, options in new_options.items():
                    cursor = conn.execute(
                        "SELECT id FROM groups WHERE name = ?", (group_name,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        continue
                    group_id = row[0]
                    for option in options:
                        cursor = conn.execute(
                            "SELECT id FROM group_options WHERE group_id = ? AND name = ?",
                            (group_id, option),
                        )
                        if cursor.fetchone():
                            continue
                        conn.execute(
                            "INSERT INTO group_options (group_id, name) VALUES (?, ?)",
                            (group_id, option),
                        )
                conn.commit()
                logger.info("Missing default options added")
        except sqlite3.Error as exc:
            logger.warning("Adding missing default options failed (non-critical): %s", exc)

    def _seed_default_group_icons(self) -> None:
        """Set icons on default groups and activities that have no icon yet."""
        try:
            with self._connect() as conn:
                for name, icon in DEFAULT_GROUP_ICONS.items():
                    conn.execute(
                        "UPDATE groups SET icon = ? WHERE name = ? AND icon IS NULL",
                        (icon, name),
                    )
                for name, icon in DEFAULT_OPTION_ICONS.items():
                    conn.execute(
                        "UPDATE group_options SET icon = ? WHERE name = ? AND icon IS NULL",
                        (icon, name),
                    )
                conn.commit()
                logger.info("Default group icons seeded")
        except sqlite3.Error as exc:
            logger.warning("Seeding default group icons failed (non-critical): %s", exc)

    def _seed_default_group_colors(self) -> None:
        """Set colors on default groups that have no color yet."""
        default_colors = {
            "Emotions":   "#ec4899",
            "Sleep":      "#6366f1",
            "Productivity": "#f59e0b",
            "Health":     "#10b981",
            "Social":     "#3b82f6",
            "Romance":    "#f43f5e",
            "Sports":     "#84cc16",
            "Mental":     "#8b5cf6",
            "Chores":     "#78716c",
            "Hobbies":    "#06b6d4",
            "Food":       "#f97316",
            "Bad Habits": "#64748b",
        }
        try:
            with self._connect() as conn:
                for name, color in default_colors.items():
                    conn.execute(
                        "UPDATE groups SET color = ? WHERE name = ? AND color IS NULL",
                        (color, name),
                    )
                conn.commit()
                logger.info("Default group colors seeded")
        except sqlite3.Error as exc:
            logger.warning("Seeding default group colors failed (non-critical): %s", exc)


__all__ = ["DatabaseSchemaMixin"]
