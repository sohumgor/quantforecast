from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from api.config import Settings
from api.dependencies import (
    get_feature_pipeline,
    get_job_store,
    get_monte_carlo_runner,
    get_price_cache,
    get_results_store,
    get_settings,
)
from api.jobs import JobStore
from api.orchestration import get_per_ticker_lookup, submit_backtest_job
from api.schemas.backtest import (
    BacktestDetailResponse,
    BacktestHistoryResponse,
    BacktestJobResponse,
    BacktestRequest,
    BacktestResultResponse,
    BacktestWindowPoint,
    CancelJobResponse,
    PerformanceRow,
    PerformanceTableResponse,
)
from backtesting.engine import BacktestConfig, BacktestEngine, BacktestResult
from backtesting.results_store import ResultsStore
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from forecasting_models.registry import get_model
from model_selection.fallback_priors import load_universal_prior
from simulation.monte_carlo_runner import MonteCarloRunner

router = APIRouter()


@router.post("/backtest", response_model=BacktestJobResponse)
def submit_backtest(
    request: BacktestRequest,
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    runner: MonteCarloRunner = Depends(get_monte_carlo_runner),
    results_store: ResultsStore = Depends(get_results_store),
    settings: Settings = Depends(get_settings),
    jobs: JobStore = Depends(get_job_store),
) -> BacktestJobResponse:
    ticker = request.ticker.upper()
    config = BacktestConfig(
        ticker=ticker,
        train_start=request.train_start,
        train_end=request.train_end,
        test_start=request.test_start,
        test_end=request.test_end,
        horizon_days=request.horizon_days,
        n_sims=request.n_sims,
        models=request.models,
        window_step_days=request.window_step_days,
    )
    engine = BacktestEngine(
        price_cache=cache,
        feature_pipeline=pipeline,
        monte_carlo_runner=runner,
        results_store=results_store,
        lookup_table=get_per_ticker_lookup(ticker, settings),
    )

    job_id = submit_backtest_job(engine, config, jobs)
    return BacktestJobResponse(job_id=job_id, status="queued")


@router.get("/backtest/{job_id}", response_model=BacktestResultResponse)
def get_backtest_status(
    job_id: str, jobs: JobStore = Depends(get_job_store)
) -> BacktestResultResponse:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"No backtest job with id '{job_id}'")

    rankings = None
    run_id = None
    if job.status == "done" and isinstance(job.result, BacktestResult):
        rankings = job.result.rankings
        run_id = job.result.run_id

    return BacktestResultResponse(
        job_id=job.job_id,
        status=job.status,
        run_id=run_id,
        rankings=rankings,
        error=job.error,
        stage=job.stage,
        progress=job.progress,
    )


@router.post("/backtest/{job_id}/cancel", response_model=CancelJobResponse)
def cancel_backtest(job_id: str, jobs: JobStore = Depends(get_job_store)) -> CancelJobResponse:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"No backtest job with id '{job_id}'")
    return CancelJobResponse(job_id=job_id, cancelled=jobs.cancel(job_id))


@router.get("/backtest/{ticker}/history", response_model=BacktestHistoryResponse)
def get_backtest_history(
    ticker: str, results_store: ResultsStore = Depends(get_results_store)
) -> BacktestHistoryResponse:
    ticker = ticker.upper()
    return BacktestHistoryResponse(ticker=ticker, run_ids=results_store.list_runs(ticker))


@router.get("/backtest/{ticker}/performance", response_model=PerformanceTableResponse)
def get_backtest_performance(
    ticker: str, settings: Settings = Depends(get_settings)
) -> PerformanceTableResponse:
    """Regime x model performance table, driving the model-comparison heatmap.
    Falls back to the universal prior (same cold-start convention used by
    `ModelSelectionEngine`) when this ticker has no personal backtest history yet.
    """
    ticker = ticker.upper()
    df = get_per_ticker_lookup(ticker, settings).load()
    used_fallback = df.empty

    if used_fallback:
        universal_prior_path = settings.research_dir / "lookup_tables" / "universal_prior.parquet"
        df = load_universal_prior(universal_prior_path).load()

    rows = (
        [PerformanceRow.model_validate(row) for row in df.to_dict(orient="records")]
        if not df.empty
        else []
    )
    return PerformanceTableResponse(ticker=ticker, used_fallback=used_fallback, rows=rows)


@router.get("/backtest/{ticker}/{run_id}/detail", response_model=BacktestDetailResponse)
def get_backtest_detail(
    ticker: str,
    run_id: str,
    model_name: str | None = None,
    results_store: ResultsStore = Depends(get_results_store),
) -> BacktestDetailResponse:
    """Per-window actual-vs-predicted series for one model in a completed
    backtest run, driving the "how close was the model?" timeline chart.
    Defaults to whichever model had the best mean CRPS in this run.
    """
    ticker = ticker.upper()
    try:
        df = results_store.read(ticker, run_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"No backtest run '{run_id}' for {ticker}"
        ) from exc

    if df.empty:
        raise HTTPException(status_code=404, detail=f"Backtest run '{run_id}' has no results")

    available_models = sorted(df["model_name"].unique().tolist())
    if model_name is None:
        model_name = str(df.groupby("model_name")["crps"].mean().idxmin())
    elif model_name not in available_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not in this run")

    model_df = df[df["model_name"] == model_name].sort_values("window_origin")

    points = [
        BacktestWindowPoint(
            window_origin=pd.Timestamp(row["window_origin"]).date(),
            actual_price=row["actual_price"],
            forecast_median_price=row["forecast_median_price"],
            forecast_p5_price=row["forecast_p5_price"],
            forecast_p95_price=row["forecast_p95_price"],
            regime=row["regime"] if pd.notna(row["regime"]) else None,
        )
        for _, row in model_df.iterrows()
    ]

    pct_error = (model_df["forecast_median_price"] - model_df["actual_price"]).abs() / model_df[
        "actual_price"
    ]

    return BacktestDetailResponse(
        ticker=ticker,
        run_id=run_id,
        model_name=model_name,
        model_display_name=get_model(model_name).metadata.display_name,
        available_models=available_models,
        points=points,
        mean_absolute_pct_error=float(pct_error.mean()),
        coverage_90=float(model_df["within_90"].mean()),
        directional_accuracy=float(model_df["directional_hit"].mean()),
    )
