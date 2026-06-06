"""Fitness connection and data storage mixin."""
from __future__ import annotations

import json
import sqlite3
from typing import Dict, List, Optional

try:
    from .database_common import DatabaseConnectionMixin, logger
except ImportError:
    from database_common import DatabaseConnectionMixin, logger  # type: ignore


class FitnessMixin(DatabaseConnectionMixin):
    """CRUD helpers for fitness OAuth connections and synced health data."""

    # --- fitness_connections ---

    def upsert_fitness_connection(
        self,
        user_id: int,
        provider: str,
        access_token_enc: str,
        refresh_token_enc: Optional[str],
        expires_at: Optional[str],
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO fitness_connections
                    (user_id, provider, access_token, refresh_token, expires_at, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, provider) DO UPDATE SET
                    access_token   = excluded.access_token,
                    refresh_token  = excluded.refresh_token,
                    expires_at     = excluded.expires_at,
                    updated_at     = CURRENT_TIMESTAMP
                """,
                (user_id, provider, access_token_enc, refresh_token_enc, expires_at),
            )
            conn.commit()
            logger.debug("Fitness connection upserted for user %s provider %s", user_id, provider)

    def get_fitness_connection(self, user_id: int, provider: str) -> Optional[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM fitness_connections WHERE user_id = ? AND provider = ?",
                (user_id, provider),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_fitness_tokens(
        self,
        user_id: int,
        provider: str,
        access_token_enc: str,
        expires_at: Optional[str],
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE fitness_connections
                SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND provider = ?
                """,
                (access_token_enc, expires_at, user_id, provider),
            )
            conn.commit()

    def update_fitness_last_synced(self, user_id: int, provider: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE fitness_connections
                SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND provider = ?
                """,
                (user_id, provider),
            )
            conn.commit()

    def delete_fitness_connection(self, user_id: int, provider: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM fitness_connections WHERE user_id = ? AND provider = ?",
                (user_id, provider),
            )
            conn.commit()

    # --- fitness_data ---

    def upsert_fitness_data(
        self,
        user_id: int,
        provider: str,
        data_type: str,
        date: str,
        value: float,
        metadata: Optional[Dict] = None,
    ) -> None:
        metadata_json = json.dumps(metadata) if metadata else None
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO fitness_data
                    (user_id, source_provider, data_type, date, value, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, source_provider, data_type, date) DO UPDATE SET
                    value    = excluded.value,
                    metadata = excluded.metadata
                """,
                (user_id, provider, data_type, date, value, metadata_json),
            )
            conn.commit()

    def get_fitness_data(
        self,
        user_id: int,
        *,
        data_types: Optional[List[str]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict]:
        query = "SELECT * FROM fitness_data WHERE user_id = ?"
        params: List = [user_id]
        if data_types:
            placeholders = ",".join("?" * len(data_types))
            query += f" AND data_type IN ({placeholders})"
            params.extend(data_types)
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        query += " ORDER BY date DESC, id ASC"
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
        return [_parse_fitness_row(dict(r)) for r in rows]

    def get_fitness_data_for_dates(
        self, user_id: int, dates: List[str]
    ) -> Dict[str, List[Dict]]:
        if not dates:
            return {}
        placeholders = ",".join("?" * len(dates))
        query = (
            f"SELECT * FROM fitness_data WHERE user_id = ? AND date IN ({placeholders})"
            " ORDER BY date DESC, id ASC"
        )
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, [user_id] + list(dates))
            rows = cursor.fetchall()
        by_date: Dict[str, List[Dict]] = {}
        for row in rows:
            d = _parse_fitness_row(dict(row))
            by_date.setdefault(d["date"], []).append(d)
        return by_date

    def delete_fitness_data_by_provider(self, user_id: int, provider: str) -> int:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM fitness_data WHERE user_id = ? AND source_provider = ?",
                (user_id, provider),
            )
            conn.commit()
            return cursor.rowcount

    def delete_fitness_data_before(self, user_id: int, before_date: str) -> int:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM fitness_data WHERE user_id = ? AND date < ?",
                (user_id, before_date),
            )
            conn.commit()
            return cursor.rowcount

    # --- Entry integration helpers ---

    def get_entry_id_for_date(self, user_id: int, date: str) -> Optional[int]:
        with self._connect() as conn:
            cursor = conn.execute(
                "SELECT id FROM mood_entries WHERE user_id = ? AND date = ?",
                (user_id, date),
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def get_option_id_by_name(self, name: str) -> Optional[int]:
        with self._connect() as conn:
            cursor = conn.execute(
                "SELECT id FROM group_options WHERE LOWER(name) = LOWER(?)",
                (name,),
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def insert_entry_selection_if_absent(
        self, entry_id: int, option_id: int, source: str = "google_health"
    ) -> None:
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT id FROM entry_selections WHERE entry_id = ? AND option_id = ?",
                (entry_id, option_id),
            ).fetchone()
            if not existing:
                conn.execute(
                    "INSERT INTO entry_selections (entry_id, option_id, source) VALUES (?, ?, ?)",
                    (entry_id, option_id, source),
                )
                conn.commit()


def _parse_fitness_row(d: Dict) -> Dict:
    if d.get("metadata"):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except (json.JSONDecodeError, TypeError):
            d["metadata"] = None
    return d


__all__ = ["FitnessMixin"]
