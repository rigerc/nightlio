from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from api.config import get_config

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    token = credentials.credentials
    cfg = get_config()
    try:
        payload = jwt.decode(token, cfg.JWT_SECRET, algorithms=["HS256"])
        return int(payload["user_id"])
    except JWTError as exc:
        detail = "Token expired" if "expired" in str(exc).lower() else "Invalid token"
        raise HTTPException(status_code=401, detail=detail)
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")
