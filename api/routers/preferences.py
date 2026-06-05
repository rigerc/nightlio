import logging
from fastapi import APIRouter, Depends, HTTPException
from api.services.preferences_service import PreferencesService
from api.dependencies import get_current_user_id
from api.schemas.preferences import MoodIconsRequest, MoodIconsResponse

logger = logging.getLogger(__name__)


def create_preferences_router(preferences_service: PreferencesService) -> APIRouter:
    router = APIRouter()

    @router.get("/preferences/mood-icons")
    def get_mood_icons(user_id: int = Depends(get_current_user_id)):
        try:
            icons = preferences_service.get_mood_icons(user_id)
            return {"icons": icons}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/preferences/mood-icons", response_model=MoodIconsResponse)
    def save_mood_icons(body: MoodIconsRequest, user_id: int = Depends(get_current_user_id)):
        try:
            validated = {}
            for k, v in body.icons.items():
                try:
                    mood_val = int(k)
                    if 1 <= mood_val <= 5:
                        validated[str(mood_val)] = str(v)
                except (TypeError, ValueError):
                    pass
            preferences_service.save_mood_icons(user_id, validated)
            return {"status": "success", "icons": validated}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
