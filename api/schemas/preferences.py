from pydantic import BaseModel
from typing import Dict


class MoodIconsRequest(BaseModel):
    icons: Dict[str, str]


class MoodIconsResponse(BaseModel):
    status: str
    icons: Dict[str, str]
