"""User preferences database helpers."""

from __future__ import annotations

import json
import sqlite3
from typing import Dict

try:
    from .database_common import DatabaseConnectionMixin
except ImportError:
    from database_common import DatabaseConnectionMixin  # type: ignore


class UserPreferencesMixin(DatabaseConnectionMixin):
    """Provides CRUD helpers for user preferences (mood icon overrides, etc.)."""

    def get_user_mood_icons(self, user_id: int) -> Dict[str, str]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT mood_icons FROM user_preferences WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if row and row["mood_icons"]:
                try:
                    return json.loads(row["mood_icons"])
                except (json.JSONDecodeError, TypeError):
                    return {}
            return {}

    def save_user_mood_icons(self, user_id: int, icons: Dict[str, str]) -> None:
        icons_json = json.dumps(icons)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO user_preferences (user_id, mood_icons, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    mood_icons = excluded.mood_icons,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, icons_json),
            )
            conn.commit()

    def get_user_use_24_hour_time(self, user_id: int) -> bool:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT use_24_hour_time FROM user_preferences WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            return bool(row and row["use_24_hour_time"])

    def save_user_use_24_hour_time(self, user_id: int, use_24_hour_time: bool) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO user_preferences (user_id, use_24_hour_time, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    use_24_hour_time = excluded.use_24_hour_time,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, 1 if use_24_hour_time else 0),
            )
            conn.commit()


__all__ = ["UserPreferencesMixin"]
