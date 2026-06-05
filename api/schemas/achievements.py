from pydantic import BaseModel
from typing import Any, List


class AchievementCheckResponse(BaseModel):
    new_achievements: List[Any]
    count: int
