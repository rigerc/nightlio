import logging
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests as http_requests
from api.services.user_service import UserService
from api.config import get_config
from api.schemas.auth import GoogleAuthRequest, LocalLoginResponse, UserOut, VerifyResponse

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

JWT_TOKEN_EXPIRES_SECONDS = 3600


def _generate_jwt_token(user_id: int, jwt_secret: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "exp": now + timedelta(seconds=JWT_TOKEN_EXPIRES_SECONDS),
        "iat": now,
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def _verify_google_token(token: str, expected_client_id: str) -> dict | None:
    try:
        resp = http_requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=10
        )
        if resp.status_code != 200:
            return None
        user_info = resp.json()
        if user_info.get("aud") != expected_client_id:
            return None
        return user_info
    except Exception as e:
        logger.error(f"Google token verification error: {e}")
        return None


def create_auth_router(user_service: UserService) -> APIRouter:
    router = APIRouter(prefix="/auth")

    @router.post("/google")
    def google_auth(body: GoogleAuthRequest):
        try:
            cfg = get_config()
            if not cfg.GOOGLE_CLIENT_ID:
                raise HTTPException(status_code=400, detail="Google OAuth not configured")

            user_info = _verify_google_token(body.token, cfg.GOOGLE_CLIENT_ID)
            if not user_info:
                raise HTTPException(status_code=401, detail="Invalid Google token")

            user = user_service.get_or_create_user(
                google_id=user_info["sub"],
                email=user_info["email"],
                name=user_info["name"],
                avatar_url=user_info.get("picture"),
            )
            token = _generate_jwt_token(user["id"], cfg.JWT_SECRET)
            return {
                "token": token,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "avatar_url": user.get("avatar_url"),
                },
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Google auth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")

    @router.post("/verify")
    def verify_token(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ):
        if not credentials:
            raise HTTPException(status_code=401, detail="Authorization header required")
        try:
            cfg = get_config()
            payload = jwt.decode(credentials.credentials, cfg.JWT_SECRET, algorithms=["HS256"])
            user = user_service.get_user_by_id(payload["user_id"])
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return {
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "avatar_url": user.get("avatar_url"),
                }
            }
        except HTTPException:
            raise
        except JWTError as e:
            detail = "Token expired" if "expired" in str(e).lower() else "Invalid token"
            raise HTTPException(status_code=401, detail=detail)
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(status_code=500, detail="Token verification failed")

    @router.post("/local/login")
    def local_login(request: Request):
        try:
            cfg = get_config()
            default_name = os.getenv("SELFHOST_USER_NAME") or "Me"
            default_email = os.getenv("SELFHOST_USER_EMAIL") or f"{cfg.DEFAULT_SELF_HOST_ID}@localhost"

            user = user_service.ensure_local_user(cfg.DEFAULT_SELF_HOST_ID, default_name, default_email)
            token = _generate_jwt_token(user["id"], cfg.JWT_SECRET)
            return {
                "token": token,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user.get("email"),
                    "avatar_url": user.get("avatar_url"),
                },
            }
        except Exception as e:
            logger.error(f"Local login error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")

    return router
