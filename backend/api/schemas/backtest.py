from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class BacktestRequest(BaseModel):
    ticker: str
    train_start: date
    train_end: date
    test_start: date
    test_end: date
    horizon_days: int
    n_sims: int
    models: list[str] | None = None
    window_step_days: int = 5


class BacktestJobResponse(BaseModel):
    job_id: str
    status: str  # "queued" | "running" | "done" | "failed"


class BacktestResultResponse(BaseModel):
    job_id: str
    status: str
    run_id: str | None = None
    rankings: list[str] | None = None
    error: str | None = None
    # Real progress, not a client-side timer: `stage` is one of
    # "downloading_prices" | "detecting_regime" | "running_backtests" |
    # "aggregating_results" | "done"; `progress` is (completed, total)
    # windows scored, only populated during "running_backtests".
    stage: str | None = None
    progress: tuple[int, int] | None = None


class CancelJobResponse(BaseModel):
    job_id: str
    cancelled: bool  # False if the job had already finished (or never existed)


class BacktestHistoryResponse(BaseModel):
    ticker: str
    run_ids: list[str]


class PerformanceRow(BaseModel):
    regime: str
    model_name: str
    n_observations: float
    mean_mae: float
    mean_rmse: float
    mean_crps: float
    coverage_90: float
    coverage_95: float
    directional_accuracy: float
    mean_var_violations: float
    mean_es_95: float
    source: str


class PerformanceTableResponse(BaseModel):
    ticker: str
    used_fallback: bool  # True if no per-ticker history yet; showing the universal prior instead
    rows: list[PerformanceRow]


class BacktestWindowPoint(BaseModel):
    window_origin: date
    actual_price: float
    forecast_median_price: float
    forecast_p5_price: float
    forecast_p95_price: float
    regime: str | None = None


class BacktestDetailResponse(BaseModel):
    ticker: str
    run_id: str
    model_name: str
    model_display_name: str
    available_models: list[str]
    points: list[BacktestWindowPoint]
    mean_absolute_pct_error: float
    coverage_90: float
    directional_accuracy: float
