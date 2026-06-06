from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root before anything else reads env vars
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path)

from typing import Optional
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from api.config import Config, get_config
from api.database import MoodDatabase
from api.services.mood_service import MoodService
from api.services.goal_service import GoalService
from api.services.group_service import GroupService
from api.services.user_service import UserService
from api.services.achievement_service import AchievementService
from api.services.preferences_service import PreferencesService
from api.middleware.security import SecurityHeadersMiddleware
from api.routers import misc
from api.routers import config as config_router
from api.routers.auth import create_auth_router
from api.routers.mood import create_mood_router
from api.routers.goals import create_goal_router
from api.routers.groups import create_group_router
from api.routers.achievements import create_achievement_router
from api.routers.preferences import create_preferences_router

limiter = Limiter(key_func=get_remote_address)


def create_app(db_path: Optional[str] = None) -> FastAPI:
    flask_cfg = Config()
    cfg = get_config()

    app = FastAPI(title="Waymark API", docs_url="/api/docs", redoc_url="/api/redoc")

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": exc.errors()})

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=flask_cfg.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    db = MoodDatabase(db_path or flask_cfg.DATABASE_PATH)
    mood_service = MoodService(db)
    group_service = GroupService(db)
    goal_service = GoalService(db)
    user_service = UserService(db)
    achievement_service = AchievementService(db)
    preferences_service = PreferencesService(db)

    fitness_service = None
    if cfg.ENABLE_GOOGLE_HEALTH:
        try:
            from api.services.fitness_service import FitnessService
            from api.routers.fitness import create_fitness_router
            fitness_service = FitnessService(db)
            app.include_router(create_fitness_router(fitness_service), prefix="/api")
        except Exception as e:
            import logging as _logging
            _logging.getLogger(__name__).warning(
                f"ENABLE_GOOGLE_HEALTH is true but fitness router unavailable: {e}"
            )

    app.include_router(misc.router, prefix="/api")
    app.include_router(config_router.router, prefix="/api")
    app.include_router(create_auth_router(user_service), prefix="/api")
    app.include_router(create_mood_router(mood_service, fitness_service=fitness_service), prefix="/api")
    app.include_router(create_goal_router(goal_service), prefix="/api")
    app.include_router(create_group_router(group_service), prefix="/api")
    app.include_router(create_achievement_router(achievement_service), prefix="/api")
    app.include_router(create_preferences_router(preferences_service), prefix="/api")

    if cfg.ENABLE_GOOGLE_OAUTH:
        try:
            from api.auth.oauth import oauth_router
            app.include_router(oauth_router, prefix="/api")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"ENABLE_GOOGLE_OAUTH is true but OAuth router not available: {e}"
            )

    return app


app = create_app()
