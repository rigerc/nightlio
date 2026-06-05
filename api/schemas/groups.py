from pydantic import BaseModel
from typing import List, Optional


class GroupCreate(BaseModel):
    name: str


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None


class ReorderRequest(BaseModel):
    ordered_ids: List[int]


class OptionCreate(BaseModel):
    name: str


class OptionUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
