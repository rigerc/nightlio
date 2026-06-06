"""Pydantic schemas for the fitness API."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class StoreTokensRequest(BaseModel):
    provider: str
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None


class FitnessConnectionStatus(BaseModel):
    connected: bool
    provider: Optional[str] = None
    last_synced_at: Optional[str] = None


class FitnessDataPointOut(BaseModel):
    id: int
    data_type: str
    date: str
    value: float
    metadata: Optional[Dict[str, Any]] = None
    source_provider: str
    created_at: str


class FitnessSyncResponse(BaseModel):
    status: str
    rows_synced: int
    provider: str


class FitnessDataResponse(BaseModel):
    data: List[FitnessDataPointOut]
    provider: Optional[str] = None
