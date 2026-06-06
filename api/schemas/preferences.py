from pydantic import BaseModel
from typing import Dict


class MoodIconsRequest(BaseModel):
    icons: Dict[str, str]


class MoodIconsResponse(BaseModel):
    status: str
    icons: Dict[str, str]


class TimeFormatRequest(BaseModel):
    use_24_hour_time: bool


class TimeFormatResponse(BaseModel):
    status: str
    use_24_hour_time: bool
