from __future__ import annotations

from datetime import date
from typing import cast

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from api.config import Settings
from api.dependencies import get_feature_pipeline, get_price_cache, get_settings
from api.orchestration import compute_features, detect_current_regime, fetch_series
from api.schemas.regime import RegimeResponse, RegimeTimelinePoint, RegimeTimelineResponse
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from regime_detection.hmm_detector import HMMRegimeDetector
from regime_detection.regime_timeline import RegimeTimelineBuilder

router = APIRouter()


def _load_feature_frame(
    ticker: str,
    cache: ParquetPriceCache,
    pipeline: FeatureEngineeringPipeline,
    settings: Settings,
    start: date | None,
    end: date | None,
) -> pd.DataFrame:
    try:
        series = fetch_series(ticker, cache, settings, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return compute_features(series, pipeline).frame


@router.get("/regime/{ticker}", response_model=RegimeResponse)
def get_current_regime(
    ticker: str,
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    settings: Settings = Depends(get_settings),
) -> RegimeResponse:
    frame = _load_feature_frame(ticker, cache, pipeline, settings, start, end)
    try:
        result = detect_current_regime(ticker, frame)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return RegimeResponse(
        ticker=result.ticker,
        as_of=result.as_of,
        label=result.label.value,
        confidence=result.confidence,
        posterior={label.value: prob for label, prob in result.posterior.items()},
        raw_state_id=result.raw_state_id,
        method=result.method,
        n_states_fit=result.n_states_fit,
    )


@router.get("/regime/{ticker}/history", response_model=RegimeTimelineResponse)
def get_regime_history(
    ticker: str,
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    settings: Settings = Depends(get_settings),
) -> RegimeTimelineResponse:
    frame = _load_feature_frame(ticker, cache, pipeline, settings, start, end)
    ticker_upper = ticker.upper()
    detector = HMMRegimeDetector(ticker=ticker_upper)
    builder = RegimeTimelineBuilder()
    try:
        timeline = builder.build(ticker_upper, frame, detector)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    builder.persist(timeline, settings.regime_timelines_dir / f"{ticker_upper}.parquet")

    points = [
        RegimeTimelinePoint(
            date=cast(pd.Timestamp, idx).date(),
            label=str(row["label"]),
            confidence=float(row["confidence"]),
        )
        for idx, row in timeline.frame.iterrows()
    ]
    return RegimeTimelineResponse(ticker=timeline.ticker, points=points)
