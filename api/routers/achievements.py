import logging
from fastapi import APIRouter, Depends, HTTPException
from api.services.achievement_service import AchievementService
from api.dependencies import get_current_user_id
from api.schemas.achievements import AchievementCheckResponse

logger = logging.getLogger(__name__)


def create_achievement_router(achievement_service: AchievementService) -> APIRouter:
    router = APIRouter()

    @router.get("/achievements")
    def get_user_achievements(user_id: int = Depends(get_current_user_id)):
        try:
            return achievement_service.get_user_achievements(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/achievements/check", response_model=AchievementCheckResponse)
    def check_achievements(user_id: int = Depends(get_current_user_id)):
        try:
            new_achievements = achievement_service.check_and_award_achievements(user_id)
            return {"new_achievements": new_achievements, "count": len(new_achievements)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/achievements/progress")
    def achievements_progress(user_id: int = Depends(get_current_user_id)):
        try:
            return achievement_service.db.get_achievements_progress(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
