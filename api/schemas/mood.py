from pydantic import BaseModel, Field
from typing import Any, List, Optional


class SelectionOut(BaseModel):
    id: int
    name: str
    icon: str
    group_id: int
    group_color: str


class MoodCreate(BaseModel):
    mood: int = Field(ge=1, le=5)
    date: str
    content: str
    time: Optional[str] = None
    selected_options: List[int] = []


class MoodUpdate(BaseModel):
    mood: Optional[int] = Field(default=None, ge=1, le=5)
    date: Optional[str] = None
    content: Optional[str] = None
    time: Optional[str] = None
    selected_options: Optional[List[int]] = None


class MoodCreateResponse(BaseModel):
    status: str
    entry_id: int
    new_achievements: List[Any]
    message: str


class MoodUpdateResponse(BaseModel):
    status: str
    message: str
    entry: Any
