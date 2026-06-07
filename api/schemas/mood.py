from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


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
    slider_values: Dict[int, int] = {}
    is_important: Optional[bool] = None
    important_reason: Optional[str] = None


class MoodUpdate(BaseModel):
    mood: Optional[int] = Field(default=None, ge=1, le=5)
    date: Optional[str] = None
    content: Optional[str] = None
    time: Optional[str] = None
    selected_options: Optional[List[int]] = None
    slider_values: Optional[Dict[int, int]] = None
    is_important: Optional[bool] = None
    important_reason: Optional[str] = None


class MoodCreateResponse(BaseModel):
    status: str
    entry_id: int
    new_achievements: List[Any]
    message: str


class MoodUpdateResponse(BaseModel):
    status: str
    message: str
    entry: Any


class MoodLogCreate(BaseModel):
    mood: int = Field(ge=1, le=5)


class MoodLogOut(BaseModel):
    id: int
    entry_id: int
    mood: int
    logged_at: str


class MoodLogAddResponse(BaseModel):
    status: str
    log_id: int
    mood: int
    logged_at: Optional[str]
    updated_entry_mood: int
    message: str


class MoodLogDeleteResponse(BaseModel):
    status: str
    updated_entry_mood: int
    message: str
