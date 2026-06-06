"""Fitness API router: Google Health API v4 integration endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.config import get_config
from api.dependencies import get_current_user_id
from api.schemas.fitness import (
    FitnessConnectionStatus,
    FitnessDataResponse,
    FitnessSyncResponse,
    StoreTokensRequest,
)
from api.services.fitness_service import FitnessService

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

DEFAULT_PROVIDER = "google_health"


def create_fitness_router(fitness_service: FitnessService) -> APIRouter:
    router = APIRouter(prefix="/fitness")

    @router.post("/tokens", status_code=204)
    def store_tokens(
        body: StoreTokensRequest,
        user_id: int = Depends(get_current_user_id),
    ):
        """Store OAuth tokens sent by the frontend after PKCE code exchange."""
        cfg = get_config()
        if not cfg.ENABLE_GOOGLE_HEALTH:
            raise HTTPException(status_code=404)
        try:
            fitness_service.store_tokens(
                user_id=user_id,
                provider=body.provider,
                access_token=body.access_token,
                refresh_token=body.refresh_token,
                expires_in=body.expires_in,
                cfg=cfg,
            )
        except Exception as exc:
            logger.error("Failed to store fitness tokens for user %s: %s", user_id, exc)
            raise HTTPException(status_code=500, detail="Failed to store tokens")

    @router.get("/status", response_model=FitnessConnectionStatus)
    def get_status(
        provider: str = Query(default=DEFAULT_PROVIDER),
        user_id: int = Depends(get_current_user_id),
    ):
        return fitness_service.get_connection_status(user_id, provider)

    @router.post("/sync", response_model=FitnessSyncResponse)
    def trigger_sync(
        provider: str = Query(default=DEFAULT_PROVIDER),
        days: int = Query(default=30, ge=1, le=90),
        user_id: int = Depends(get_current_user_id),
    ):
        cfg = get_config()
        if not cfg.ENABLE_GOOGLE_HEALTH:
            raise HTTPException(status_code=404)
        try:
            rows = fitness_service.sync(user_id, provider, cfg, days)
            return {"status": "ok", "rows_synced": rows, "provider": provider}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.error("Fitness sync failed for user %s: %s", user_id, exc)
            raise HTTPException(status_code=500, detail="Sync failed")

    @router.delete("/disconnect", status_code=200)
    def disconnect(
        provider: str = Query(default=DEFAULT_PROVIDER),
        user_id: int = Depends(get_current_user_id),
    ):
        fitness_service.disconnect(user_id, provider)
        return {"status": "ok"}

    @router.get("/data", response_model=FitnessDataResponse)
    def get_data(
        provider: str = Query(default=DEFAULT_PROVIDER),
        start_date: str = Query(default=None),
        end_date: str = Query(default=None),
        user_id: int = Depends(get_current_user_id),
    ):
        data = fitness_service.get_data(user_id, start_date=start_date, end_date=end_date)
        return {"data": data, "provider": provider}

    return router
