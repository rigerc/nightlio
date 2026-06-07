from typing import List, Optional, Dict
from api.database import MoodDatabase
from api.models.mood_entry import MoodEntry


class MoodService:
    def __init__(self, db: MoodDatabase):
        self.db = db

    def create_mood_entry(
        self,
        user_id: int,
        date: str,
        mood: int,
        content: str,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
        slider_values: Optional[Dict[int, int]] = None,
        is_important: Optional[bool] = None,
        important_reason: Optional[str] = None,
    ) -> Dict:
        """Create a new mood entry and check for achievements"""
        if not (1 <= mood <= 5):
            raise ValueError("Mood must be between 1 and 5")

        if not content.strip():
            raise ValueError("Content cannot be empty")

        if is_important and not (important_reason or "").strip():
            raise ValueError("Please provide a reason for marking this day important")

        entry_id = self.db.add_mood_entry(
            user_id, date, mood, content, time, selected_options, slider_values,
            is_important, important_reason,
        )

        # Check for new achievements
        new_achievements = self.db.check_achievements(user_id)

        return {"entry_id": entry_id, "new_achievements": new_achievements}

    def get_all_entries(self, user_id: int) -> List[Dict]:
        """Get all mood entries for a user"""
        return self.db.get_all_mood_entries(user_id)

    def get_entries_by_date_range(
        self, user_id: int, start_date: str, end_date: str
    ) -> List[Dict]:
        """Get mood entries within a date range for a user"""
        return self.db.get_mood_entries_by_date_range(user_id, start_date, end_date)

    def get_entry_by_id(self, user_id: int, entry_id: int) -> Optional[Dict]:
        """Get a specific mood entry by ID for a user"""
        return self.db.get_mood_entry_by_id(user_id, entry_id)

    def update_entry(
        self,
        user_id: int,
        entry_id: int,
        mood: Optional[int] = None,
        content: Optional[str] = None,
        date: Optional[str] = None,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
        slider_values: Optional[Dict[int, int]] = None,
        is_important: Optional[bool] = None,
        important_reason: Optional[str] = None,
    ) -> Optional[Dict]:
        """Update an existing mood entry for a user and return the updated record"""
        if mood is not None and not (1 <= mood <= 5):
            raise ValueError("Mood must be between 1 and 5")

        if content is not None and not content.strip():
            raise ValueError("Content cannot be empty")

        if is_important and not (important_reason or "").strip():
            raise ValueError("Please provide a reason for marking this day important")

        updated = self.db.update_mood_entry(
            user_id,
            entry_id,
            mood=mood,
            content=content,
            date=date,
            time=time,
            selected_options=selected_options,
            slider_values=slider_values,
            is_important=is_important,
            important_reason=important_reason,
        )

        if not updated:
            return None

        entry = self.db.get_mood_entry_by_id(user_id, entry_id)
        if not entry:
            return None

        entry["selections"] = self.db.get_entry_selections(entry_id)
        entry["slider_values"] = self.db.get_entry_slider_values(entry_id)
        return entry

    def add_mood_log(self, user_id: int, entry_id: int, mood: int) -> Dict:
        """Add a mood check-in log to an entry and return the updated mood."""
        if not (1 <= mood <= 5):
            raise ValueError("Mood must be between 1 and 5")
        return self.db.add_mood_log(user_id, entry_id, mood)

    def get_mood_logs(self, user_id: int, entry_id: int) -> List[Dict]:
        """Return all mood logs for an entry, ordered chronologically."""
        return self.db.get_mood_logs(user_id, entry_id)

    def delete_mood_log(self, user_id: int, entry_id: int, log_id: int) -> Optional[Dict]:
        """Delete a mood log and return the updated entry mood, or None if not found."""
        new_mood = self.db.delete_mood_log(user_id, entry_id, log_id)
        if new_mood is None:
            return None
        return {"updated_entry_mood": new_mood}

    def delete_entry(self, user_id: int, entry_id: int) -> bool:
        """Delete a mood entry for a user"""
        return self.db.delete_mood_entry(user_id, entry_id)

    def get_statistics(self, user_id: int) -> Dict:
        """Get mood statistics for a user"""
        # Track statistics view for achievements (Data Lover)
        try:
            self.db.increment_stats_view(user_id)
        except Exception:
            # Metrics should not break stats
            pass
        stats = self.db.get_mood_statistics(user_id)
        mood_counts = self.db.get_mood_counts(user_id)
        current_streak = self.db.get_current_streak(user_id)

        return {
            "statistics": stats,
            "mood_distribution": mood_counts,
            "current_streak": current_streak,
        }

    def get_current_streak(self, user_id: int) -> int:
        """Get current consecutive days streak for a user"""
        return self.db.get_current_streak(user_id)

    def get_entry_selections(self, user_id: int, entry_id: int) -> List[Dict]:
        """Get selected options for an entry (with user verification)"""
        # First verify the entry belongs to the user
        entry = self.db.get_mood_entry_by_id(user_id, entry_id)
        if not entry:
            return []
        return self.db.get_entry_selections(entry_id)

    def get_entry_slider_values(self, user_id: int, entry_id: int) -> List[Dict]:
        """Get slider values for an entry (with user verification)"""
        entry = self.db.get_mood_entry_by_id(user_id, entry_id)
        if not entry:
            return []
        return self.db.get_entry_slider_values(entry_id)
