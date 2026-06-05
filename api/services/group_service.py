from typing import Any, Dict, List
from api.database import MoodDatabase


class GroupService:
    def __init__(self, db: MoodDatabase):
        self.db = db

    def get_all_groups(self) -> List[Dict]:
        """Get all groups with their options"""
        return self.db.get_all_groups()

    def create_group(self, name: str) -> int:
        """Create a new group"""
        if not name.strip():
            raise ValueError("Group name cannot be empty")
        return self.db.create_group(name.strip())

    def create_group_option(self, group_id: int, name: str) -> int:
        """Create a new option for a group"""
        if not name.strip():
            raise ValueError("Option name cannot be empty")
        return self.db.create_group_option(group_id, name.strip())

    def update_group(self, group_id: int, **kwargs: Any) -> bool:
        """Update group properties (name, color, icon, sort_order)"""
        if "name" in kwargs and not str(kwargs["name"]).strip():
            raise ValueError("Group name cannot be empty")
        if "name" in kwargs:
            kwargs["name"] = str(kwargs["name"]).strip()
        return self.db.update_group(group_id, kwargs)

    def update_group_option(self, option_id: int, **kwargs: Any) -> bool:
        """Update group option properties (name, icon, sort_order)"""
        if "name" in kwargs and not str(kwargs["name"]).strip():
            raise ValueError("Option name cannot be empty")
        if "name" in kwargs:
            kwargs["name"] = str(kwargs["name"]).strip()
        return self.db.update_group_option(option_id, kwargs)

    def reorder_groups(self, ordered_ids: List[int]) -> None:
        """Reorder groups by providing list of IDs in desired order"""
        self.db.reorder_groups(ordered_ids)

    def reorder_group_options(self, group_id: int, ordered_ids: List[int]) -> None:
        """Reorder options within a group"""
        self.db.reorder_group_options(group_id, ordered_ids)

    def delete_group(self, group_id: int) -> bool:
        """Delete a group and all its options"""
        return self.db.delete_group(group_id)

    def delete_group_option(self, option_id: int) -> bool:
        """Delete a group option"""
        return self.db.delete_group_option(option_id)
