import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from api.config import get_config
from api.services.mood_service import MoodService
from api.dependencies import get_current_user_id
from api.schemas.mood import MoodCreate, MoodUpdate, MoodCreateResponse, MoodUpdateResponse

logger = logging.getLogger(__name__)


def create_mood_router(mood_service: MoodService, fitness_service=None) -> APIRouter:
    router = APIRouter()

    @router.post("/mood", status_code=201, response_model=MoodCreateResponse)
    def create_mood_entry(
        body: MoodCreate,
        user_id: int = Depends(get_current_user_id),
    ):
        try:
            result = mood_service.create_mood_entry(
                user_id,
                body.date,
                body.mood,
                body.content,
                body.time,
                body.selected_options,
            )
            return {
                "status": "success",
                "entry_id": result["entry_id"],
                "new_achievements": result["new_achievements"],
                "message": "Mood entry created successfully",
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Create mood entry error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def _enrich_with_fitness(entries, user_id: int):
        """Attach fitness data to entries when Google Health is enabled."""
        if not fitness_service:
            return entries
        try:
            cfg = get_config()
            if not cfg.ENABLE_GOOGLE_HEALTH:
                return entries
            dates = [e["date"] for e in entries] if isinstance(entries, list) else [entries["date"]]
            fitness_by_date = fitness_service.get_data_for_dates(user_id, dates)
            if isinstance(entries, list):
                for entry in entries:
                    entry["fitness"] = fitness_by_date.get(entry["date"], [])
            else:
                entries["fitness"] = fitness_by_date.get(entries["date"], [])
        except Exception as exc:
            logger.warning("Failed to attach fitness data: %s", exc)
        return entries

    @router.get("/moods")
    def get_mood_entries(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_id: int = Depends(get_current_user_id),
    ):
        try:
            if start_date and end_date:
                entries = mood_service.get_entries_by_date_range(user_id, start_date, end_date)
            else:
                entries = mood_service.get_all_entries(user_id)
            return _enrich_with_fitness(entries, user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/mood/{entry_id}")
    def get_mood_entry(entry_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            entry = mood_service.get_entry_by_id(user_id, entry_id)
            if entry is None:
                raise HTTPException(status_code=404, detail="Entry not found")
            return _enrich_with_fitness(entry, user_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/mood/{entry_id}", response_model=MoodUpdateResponse)
    def update_mood_entry(
        entry_id: int,
        body: MoodUpdate,
        user_id: int = Depends(get_current_user_id),
    ):
        try:
            fields = body.model_dump(exclude_unset=True)
            if not fields:
                raise HTTPException(status_code=400, detail="No update fields provided")

            updated = mood_service.update_entry(
                user_id,
                entry_id,
                mood=body.mood,
                content=body.content,
                date=body.date,
                time=body.time,
                selected_options=body.selected_options,
            )
            if updated is None:
                raise HTTPException(status_code=404, detail="Entry not found or no changes made")
            return {
                "status": "success",
                "message": "Mood entry updated successfully",
                "entry": updated,
            }
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/mood/{entry_id}")
    def delete_mood_entry(entry_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            success = mood_service.delete_entry(user_id, entry_id)
            if not success:
                raise HTTPException(status_code=404, detail="Entry not found")
            return {"status": "success", "message": "Mood entry deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/statistics")
    def get_mood_statistics(user_id: int = Depends(get_current_user_id)):
        try:
            return mood_service.get_statistics(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/streak")
    def get_current_streak(user_id: int = Depends(get_current_user_id)):
        try:
            streak = mood_service.get_current_streak(user_id)
            return {
                "current_streak": streak,
                "message": f'Current streak: {streak} day{"s" if streak != 1 else ""}',
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/mood/{entry_id}/selections")
    def get_entry_selections(entry_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            return mood_service.get_entry_selections(user_id, entry_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
