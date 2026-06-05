from pydantic import BaseModel
from typing import Optional


class GoogleAuthRequest(BaseModel):
    token: str


class UserOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class LocalLoginResponse(BaseModel):
    token: str
    user: UserOut


class VerifyResponse(BaseModel):
    user: UserOut
