import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from api.services.goal_service import GoalService
from api.dependencies import get_current_user_id
from api.schemas.goals import GoalCreate, GoalUpdate

logger = logging.getLogger(__name__)


def create_goal_router(goal_service: GoalService) -> APIRouter:
    router = APIRouter()

    @router.get("/goals")
    def list_goals(user_id: int = Depends(get_current_user_id)):
        try:
            return goal_service.list_goals(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/goals", status_code=201)
    def create_goal(body: GoalCreate, user_id: int = Depends(get_current_user_id)):
        try:
            title = body.title.strip()
            if not title:
                raise HTTPException(status_code=400, detail="Title is required")
            description = (body.description or "").strip()
            goal_id = goal_service.create_goal(user_id, title, description, body.frequency_per_week)
            return {"id": goal_id}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/goals/{goal_id}")
    def get_goal(goal_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            goal = goal_service.get_goal(user_id, goal_id)
            if not goal:
                raise HTTPException(status_code=404, detail="Not found")
            return goal
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/goals/{goal_id}")
    @router.patch("/goals/{goal_id}")
    def update_goal(goal_id: int, body: GoalUpdate, user_id: int = Depends(get_current_user_id)):
        try:
            frequency = body.frequency_per_week if body.frequency_per_week is not None else body.frequency
            success = goal_service.update_goal(
                user_id,
                goal_id,
                body.title,
                body.description,
                int(frequency) if frequency is not None else None,
            )
            if not success:
                raise HTTPException(status_code=404, detail="No changes or goal not found")
            return {"status": "ok"}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/goals/{goal_id}")
    def delete_goal(goal_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            success = goal_service.delete_goal(user_id, goal_id)
            if not success:
                raise HTTPException(status_code=404, detail="Not found")
            return {"status": "ok"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/goals/{goal_id}/progress")
    def increment_progress(goal_id: int, user_id: int = Depends(get_current_user_id)):
        try:
            updated = goal_service.increment_progress(user_id, goal_id)
            if not updated:
                raise HTTPException(status_code=404, detail="Not found")
            return updated
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/goals/{goal_id}/completions")
    @router.get("/goal/{goal_id}/completions")
    def get_completions(
        goal_id: int,
        start: Optional[str] = None,
        end: Optional[str] = None,
        user_id: int = Depends(get_current_user_id),
    ):
        try:
            return goal_service.get_completions(user_id, goal_id, start, end)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
