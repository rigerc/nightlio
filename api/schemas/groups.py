from pydantic import BaseModel
from typing import List, Literal, Optional


class GroupCreate(BaseModel):
    name: str
    type: Optional[Literal["category", "slider"]] = None
    slider_min: Optional[int] = None
    slider_max: Optional[int] = None
    slider_labels: Optional[List[str]] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    type: Optional[Literal["category", "slider"]] = None
    slider_min: Optional[int] = None
    slider_max: Optional[int] = None
    slider_labels: Optional[List[str]] = None


class ReorderRequest(BaseModel):
    ordered_ids: List[int]


class OptionCreate(BaseModel):
    name: str


class OptionUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
