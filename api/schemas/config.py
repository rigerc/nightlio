from pydantic import BaseModel
from typing import Optional


class ConfigResponse(BaseModel):
    enable_google_oauth: bool
    enable_mood_music: bool
    google_client_id: Optional[str] = None
