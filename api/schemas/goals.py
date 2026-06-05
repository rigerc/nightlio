from pydantic import BaseModel, Field
from typing import Optional


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    frequency_per_week: int = Field(ge=1, le=7)


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    frequency: Optional[int] = Field(default=None, ge=1, le=7)


class GoalIdResponse(BaseModel):
    id: int
