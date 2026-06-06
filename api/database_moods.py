"""Mood entry management mixin."""

from __future__ import annotations

import sqlite3
from typing import Dict, List, Optional

try:  # pragma: no cover - allow top-level script usage
    from .database_common import DatabaseConnectionMixin
except ImportError:  # pragma: no cover
    from database_common import DatabaseConnectionMixin  # type: ignore


class MoodEntriesMixin(DatabaseConnectionMixin):
    """CRUD helpers for mood entries and their selections."""

    def _recalculate_average_mood(self, conn: sqlite3.Connection, entry_id: int) -> None:
        """Rewrite mood_entries.mood as ROUND(AVG) of entry_mood_logs. No-op when no logs."""
        row = conn.execute(
            "SELECT ROUND(AVG(mood)) FROM entry_mood_logs WHERE entry_id = ?",
            (entry_id,),
        ).fetchone()
        avg = row[0] if row else None
        if avg is None:
            return
        conn.execute(
            "UPDATE mood_entries SET mood = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (int(avg), entry_id),
        )

    def add_mood_entry(
        self,
        user_id: int,
        date: str,
        mood: int,
        content: str,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
    ) -> int:
        with self._connect() as conn:
            if time:
                cursor = conn.execute(
                    """
                    INSERT INTO mood_entries (user_id, date, mood, content, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, date, mood, content, time),
                )
            else:
                cursor = conn.execute(
                    """
                    INSERT INTO mood_entries (user_id, date, mood, content)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, date, mood, content),
                )

            entry_id = cursor.lastrowid

            if selected_options:
                conn.executemany(
                    "INSERT INTO entry_selections (entry_id, option_id) VALUES (?, ?)",
                    [(entry_id, option_id) for option_id in selected_options],
                )

            # Create the first mood log so future logs produce correct averages
            if time:
                conn.execute(
                    "INSERT INTO entry_mood_logs (entry_id, mood, logged_at) VALUES (?, ?, ?)",
                    (entry_id, mood, time),
                )
            else:
                conn.execute(
                    "INSERT INTO entry_mood_logs (entry_id, mood) VALUES (?, ?)",
                    (entry_id, mood),
                )

            conn.commit()
            return int(entry_id if entry_id is not None else 0)

    def add_mood_log(self, user_id: int, entry_id: int, mood: int) -> Dict:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id FROM mood_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            ).fetchone()
            if not row:
                raise ValueError("Entry not found")
            cursor = conn.execute(
                "INSERT INTO entry_mood_logs (entry_id, mood) VALUES (?, ?)",
                (entry_id, mood),
            )
            log_id = int(cursor.lastrowid)
            self._recalculate_average_mood(conn, entry_id)
            conn.commit()
            log_row = conn.execute(
                "SELECT id, mood, logged_at FROM entry_mood_logs WHERE id = ?",
                (log_id,),
            ).fetchone()
            entry_row = conn.execute(
                "SELECT mood FROM mood_entries WHERE id = ?",
                (entry_id,),
            ).fetchone()
            return {
                "log_id": log_id,
                "mood": log_row[1] if log_row else mood,
                "logged_at": log_row[2] if log_row else None,
                "updated_entry_mood": entry_row[0] if entry_row else mood,
            }

    def get_mood_logs(self, user_id: int, entry_id: int) -> List[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT id FROM mood_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            ).fetchone()
            if not row:
                raise ValueError("Entry not found")
            cursor = conn.execute(
                """
                SELECT id, entry_id, mood, logged_at
                  FROM entry_mood_logs
                 WHERE entry_id = ?
                 ORDER BY logged_at ASC
                """,
                (entry_id,),
            )
            return [dict(r) for r in cursor.fetchall()]

    def delete_mood_log(self, user_id: int, entry_id: int, log_id: int) -> Optional[int]:
        """Delete a mood log and return the updated entry mood, or None if not found."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id FROM mood_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            ).fetchone()
            if not row:
                return None
            cursor = conn.execute(
                "DELETE FROM entry_mood_logs WHERE id = ? AND entry_id = ?",
                (log_id, entry_id),
            )
            if cursor.rowcount == 0:
                return None
            self._recalculate_average_mood(conn, entry_id)
            conn.commit()
            entry_row = conn.execute(
                "SELECT mood FROM mood_entries WHERE id = ?",
                (entry_id,),
            ).fetchone()
            return entry_row[0] if entry_row else None

    def get_all_mood_entries(self, user_id: int) -> List[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT id, date, mood, content, created_at, updated_at
                  FROM mood_entries
                 WHERE user_id = ?
                 ORDER BY created_at DESC, date DESC
                """,
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_mood_entries_by_date_range(
        self,
        user_id: int,
        start_date: str,
        end_date: str,
    ) -> List[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT id, date, mood, content, created_at, updated_at
                  FROM mood_entries
                 WHERE user_id = ? AND date BETWEEN ? AND ?
                 ORDER BY created_at DESC, date DESC
                """,
                (user_id, start_date, end_date),
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_mood_entry_by_id(self, user_id: int, entry_id: int) -> Optional[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT id, date, mood, content, created_at, updated_at
                  FROM mood_entries
                 WHERE id = ? AND user_id = ?
                """,
                (entry_id, user_id),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_mood_entry(
        self,
        user_id: int,
        entry_id: int,
        mood: Optional[int] = None,
        content: Optional[str] = None,
        date: Optional[str] = None,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
    ) -> bool:
        updates: List[str] = []
        params: List[object] = []

        if mood is not None:
            updates.append("mood = ?")
            params.append(mood)
        if content is not None:
            updates.append("content = ?")
            params.append(content)
        if date is not None:
            updates.append("date = ?")
            params.append(date)
        if time is not None:
            updates.append("created_at = ?")
            params.append(time)

        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT id FROM mood_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            ).fetchone()
            if not row:
                return False

            updated = False
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                conn.execute(
                    f"UPDATE mood_entries SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                    params + [entry_id, user_id],
                )
                updated = True
            else:
                conn.execute(
                    """
                    UPDATE mood_entries
                       SET updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND user_id = ?
                    """,
                    (entry_id, user_id),
                )

            if selected_options is not None:
                conn.execute(
                    "DELETE FROM entry_selections WHERE entry_id = ?",
                    (entry_id,),
                )
                if selected_options:
                    conn.executemany(
                        "INSERT INTO entry_selections (entry_id, option_id) VALUES (?, ?)",
                        [(entry_id, option_id) for option_id in selected_options],
                    )
                updated = True

            conn.commit()
            return updated or bool(selected_options is not None)

    def delete_mood_entry(self, user_id: int, entry_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM mood_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0


__all__ = ["MoodEntriesMixin"]
