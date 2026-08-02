from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class DrawdownInfo(BaseModel):
    mean_max_drawdown: float
    worst_case_drawdown: float


class DistributionInfo(BaseModel):
    expected_return: float
    median_return: float
    ci_lower_90: float
    ci_upper_90: float
    prob_positive_return: float
    worst_5pct: float
    best_5pct: float


class RiskAnalyticsInfo(BaseModel):
    value_at_risk_95: float
    expected_shortfall_95: float
    drawdown: DrawdownInfo
    distribution: DistributionInfo


class FanChartInfo(BaseModel):
    horizon_days: list[int]
    percentiles: dict[str, list[float]]
    sample_paths: list[list[float]] = Field(default_factory=list)


class DensityInfo(BaseModel):
    bin_edges: list[float]
    counts: list[float]


class ModelParamsInfo(BaseModel):
    model_name: str
    display_name: str
    params: dict[str, float]


class ExplanationInfo(BaseModel):
    summary: str
    regime_description: str
    regime_confidence_note: str
    performance_basis: str
    driving_features: list[str]


class ForecastRequest(BaseModel):
    ticker: str
    model_name: str | None = None  # None = auto-select via ModelSelectionEngine
    n_sims: int = 5000
    horizon_days: int = Field(default=63, ge=1, le=252)
    start: date | None = None
    end: date | None = None


class ForecastResponse(BaseModel):
    ticker: str
    current_price: float
    auto_selected: bool
    explanation: ExplanationInfo | None = None  # populated only when auto-selected
    model: ModelParamsInfo
    risk_analytics: RiskAnalyticsInfo
    fan_chart: FanChartInfo
    density: DensityInfo
