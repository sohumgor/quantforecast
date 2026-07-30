from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class RegimeResponse(BaseModel):
    ticker: str
    as_of: date
    label: str
    confidence: float
    posterior: dict[str, float]
    raw_state_id: int
    method: str
    n_states_fit: int


class RegimeTimelinePoint(BaseModel):
    date: date
    label: str
    confidence: float


class RegimeTimelineResponse(BaseModel):
    ticker: str
    points: list[RegimeTimelinePoint]
