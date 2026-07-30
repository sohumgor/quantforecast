from __future__ import annotations

from datetime import date
from typing import cast

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from api.config import Settings
from api.dependencies import get_feature_pipeline, get_price_cache, get_settings
from api.orchestration import compute_features, fetch_series
from api.schemas.common import FeatureRow, FeatureSetResponse
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline

router = APIRouter()


@router.get("/features/{ticker}", response_model=FeatureSetResponse)
def get_features(
    ticker: str,
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    settings: Settings = Depends(get_settings),
) -> FeatureSetResponse:
    try:
        series = fetch_series(ticker, cache, settings, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    feature_set = compute_features(series, pipeline)
    rows = [
        FeatureRow(
            date=cast(pd.Timestamp, idx).date(),
            values={str(k): float(v) for k, v in row.dropna().items()},
        )
        for idx, row in feature_set.frame.iterrows()
    ]
    latest = {str(k): float(v) for k, v in feature_set.latest.dropna().items()}
    return FeatureSetResponse(
        ticker=feature_set.ticker,
        rows=rows,
        latest=latest,
        metadata=feature_set.metadata,
    )
