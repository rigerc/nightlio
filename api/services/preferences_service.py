import json
from typing import Dict
from api.database import MoodDatabase


class PreferencesService:
    def __init__(self, db: MoodDatabase):
        self.db = db

    def get_mood_icons(self, user_id: int) -> Dict[str, str]:
        """Get user's custom mood icon overrides"""
        return self.db.get_user_mood_icons(user_id)

    def save_mood_icons(self, user_id: int, icons: Dict[str, str]) -> None:
        """Save user's custom mood icon overrides"""
        self.db.save_user_mood_icons(user_id, icons)

    def get_use_24_hour_time(self, user_id: int) -> bool:
        """Get user's time display preference"""
        return self.db.get_user_use_24_hour_time(user_id)

    def save_use_24_hour_time(self, user_id: int, use_24_hour_time: bool) -> None:
        """Save user's time display preference"""
        self.db.save_user_use_24_hour_time(user_id, use_24_hour_time)
