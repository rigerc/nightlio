"""Group and selection helpers."""

from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional

try:  # pragma: no cover - enable script execution fallback
    from .database_common import DatabaseConnectionMixin
except ImportError:  # pragma: no cover
    from database_common import DatabaseConnectionMixin  # type: ignore


class GroupsMixin(DatabaseConnectionMixin):
    """Provides CRUD helpers for groups and group options."""

    def get_all_groups(self) -> List[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT id, name, color, icon, sort_order FROM groups ORDER BY sort_order ASC, name ASC"
            )
            groups: List[Dict] = []
            for group_row in cursor.fetchall():
                group = dict(group_row)
                options_cursor = conn.execute(
                    """
                    SELECT id, name, icon, sort_order
                      FROM group_options
                     WHERE group_id = ?
                     ORDER BY sort_order ASC, name ASC
                    """,
                    (group["id"],),
                )
                group["options"] = [
                    dict(option_row) for option_row in options_cursor.fetchall()
                ]
                groups.append(group)
            return groups

    def create_group(self, name: str) -> int:
        with self._connect() as conn:
            cursor = conn.execute("INSERT INTO groups (name) VALUES (?)", (name,))
            conn.commit()
            return int(cursor.lastrowid or 0)

    def create_group_option(self, group_id: int, name: str) -> int:
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO group_options (group_id, name) VALUES (?, ?)",
                (group_id, name),
            )
            conn.commit()
            return int(cursor.lastrowid or 0)

    def update_group(self, group_id: int, fields: Dict[str, Any]) -> bool:
        allowed = {"name", "color", "icon", "sort_order"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [group_id]
        with self._connect() as conn:
            cursor = conn.execute(
                f"UPDATE groups SET {set_clause} WHERE id = ?", values
            )
            conn.commit()
            return cursor.rowcount > 0

    def update_group_option(self, option_id: int, fields: Dict[str, Any]) -> bool:
        allowed = {"name", "icon", "sort_order"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [option_id]
        with self._connect() as conn:
            cursor = conn.execute(
                f"UPDATE group_options SET {set_clause} WHERE id = ?", values
            )
            conn.commit()
            return cursor.rowcount > 0

    def reorder_groups(self, ordered_ids: List[int]) -> None:
        with self._connect() as conn:
            conn.executemany(
                "UPDATE groups SET sort_order = ? WHERE id = ?",
                [(i, gid) for i, gid in enumerate(ordered_ids)],
            )
            conn.commit()

    def reorder_group_options(self, group_id: int, ordered_ids: List[int]) -> None:
        with self._connect() as conn:
            conn.executemany(
                "UPDATE group_options SET sort_order = ? WHERE id = ? AND group_id = ?",
                [(i, oid, group_id) for i, oid in enumerate(ordered_ids)],
            )
            conn.commit()

    def delete_group(self, group_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM groups WHERE id = ?", (group_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_group_option(self, option_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM group_options WHERE id = ?",
                (option_id,),
            )
            conn.commit()
            return cursor.rowcount > 0

    def add_entry_selections(self, entry_id: int, option_ids: List[int]) -> None:
        with self._connect() as conn:
            conn.executemany(
                "INSERT INTO entry_selections (entry_id, option_id) VALUES (?, ?)",
                [(entry_id, option_id) for option_id in option_ids],
            )
            conn.commit()

    def get_entry_selections(self, entry_id: int) -> List[Dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT go.id, go.group_id, go.name, go.icon, g.name as group_name, g.color as group_color
                  FROM entry_selections es
                  JOIN group_options go ON es.option_id = go.id
                  JOIN groups g ON go.group_id = g.id
                 WHERE es.entry_id = ?
                 ORDER BY g.sort_order ASC, g.name, go.sort_order ASC, go.name
                """,
                (entry_id,),
            )
            return [dict(row) for row in cursor.fetchall()]


__all__ = ["GroupsMixin"]
