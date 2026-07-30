from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class PriceBar(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    adj_close: float
    volume: int


class PriceHistoryResponse(BaseModel):
    ticker: str
    bars: list[PriceBar]


class FeatureRow(BaseModel):
    date: date
    values: dict[str, float]


class FeatureSetResponse(BaseModel):
    ticker: str
    rows: list[FeatureRow]
    latest: dict[str, float]
    metadata: dict[str, str]
