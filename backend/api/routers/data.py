from __future__ import annotations

from datetime import date
from typing import cast

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from api.config import Settings
from api.dependencies import get_price_cache, get_settings
from api.orchestration import fetch_series
from api.schemas.common import PriceBar, PriceHistoryResponse
from data_ingestion.cache import ParquetPriceCache

router = APIRouter()


@router.get("/data/{ticker}", response_model=PriceHistoryResponse)
def get_price_history(
    ticker: str,
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    cache: ParquetPriceCache = Depends(get_price_cache),
    settings: Settings = Depends(get_settings),
) -> PriceHistoryResponse:
    try:
        series = fetch_series(ticker, cache, settings, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    bars = [
        PriceBar(
            date=cast(pd.Timestamp, idx).date(),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
            adj_close=float(row["adj_close"]),
            volume=int(row["volume"]),
        )
        for idx, row in series.bars.iterrows()
    ]
    return PriceHistoryResponse(ticker=series.ticker, bars=bars)
