from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from api.schemas.forecast import (
    DensityInfo,
    ExplanationInfo,
    FanChartInfo,
    ModelParamsInfo,
    RiskAnalyticsInfo,
)


class RegimeInfo(BaseModel):
    label: str
    confidence: float
    posterior: dict[str, float]
    as_of: date


class ModelScoreInfo(BaseModel):
    name: str
    display_name: str
    composite_score: float
    confidence: float
    n_observations: int


class AnalysisStatusResponse(BaseModel):
    """Drives the pre-flight check the frontend makes before rendering the
    dashboard: whether `ticker` already has a fresh, ticker-specific backtest
    (safe to jump straight to `/analyze`), or needs a new one run first."""

    ticker: str
    stale: bool
    reason: Literal["no_history", "stale", "fresh"]
    last_backtest_at: datetime | None
    max_age_days: int


class AnalyzeRequest(BaseModel):
    ticker: str
    n_sims: int = 5000
    # Matches config/defaults.yaml's simulation.max_horizon_days: forecasting
    # further than a year ahead isn't a supported preset in the UI.
    horizon_days: int = Field(default=63, ge=1, le=252)
    start: date | None = None
    end: date | None = None


class AnalysisResponse(BaseModel):
    ticker: str
    current_price: float
    regime: RegimeInfo
    used_fallback: bool
    ranked_models: list[ModelScoreInfo]
    explanation: ExplanationInfo
    selected_model: ModelParamsInfo
    risk_analytics: RiskAnalyticsInfo
    fan_chart: FanChartInfo
    density: DensityInfo
