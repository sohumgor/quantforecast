"""Shared orchestration helpers used by multiple API routers (`analyze`,
`forecast`, and the plain `data`/`features`/`regime` routers), so the actual
route handlers stay thin controllers with no duplicated business logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Literal

import pandas as pd

from api.config import Settings
from api.jobs import JobCancelled, JobStore
from backtesting.contracts import BacktestConfig, BacktestResult
from backtesting.engine import BacktestEngine
from data_ingestion.cache import ParquetPriceCache
from data_ingestion.schemas import PriceSeries
from feature_engineering.feature_set import FeatureSet
from feature_engineering.pipeline import FeatureEngineeringPipeline
from forecasting_models.base import ForecastModel, ModelParams
from forecasting_models.registry import get_model
from model_selection.contracts import Explanation, ModelScore, RecommendationResult
from model_selection.explanation_builder import REGIME_DESCRIPTIONS
from model_selection.fallback_priors import load_universal_prior
from model_selection.lookup_table import PerformanceLookupTable
from model_selection.selector import ModelSelectionEngine
from regime_detection.contracts import RegimeResult
from regime_detection.hmm_detector import HMMRegimeDetector
from simulation.monte_carlo_runner import MonteCarloRunner
from simulation.path_result import SimulationPaths

StalenessReason = Literal["no_history", "stale", "fresh"]


@dataclass(frozen=True)
class AnalysisStatus:
    """Whether a ticker's per-ticker backtest history is fresh enough to
    drive model selection as-is, or needs (re)running before the next
    `/analyze` call would otherwise fall back to the universal prior."""

    ticker: str
    stale: bool
    reason: StalenessReason
    last_backtest_at: datetime | None
    max_age_days: int


def resolve_date_range(
    settings: Settings, start: date | None, end: date | None
) -> tuple[date, date]:
    resolved_end = end or date.today()
    resolved_start = start or resolved_end - timedelta(days=365 * settings.default_lookback_years)
    return resolved_start, resolved_end


def fetch_series(
    ticker: str,
    cache: ParquetPriceCache,
    settings: Settings,
    start: date | None,
    end: date | None,
) -> PriceSeries:
    resolved_start, resolved_end = resolve_date_range(settings, start, end)
    return cache.get_or_fetch(ticker, resolved_start, resolved_end)


def compute_features(series: PriceSeries, pipeline: FeatureEngineeringPipeline) -> FeatureSet:
    return pipeline.transform(series)


def detect_current_regime(ticker: str, feature_frame: pd.DataFrame) -> RegimeResult:
    detector = HMMRegimeDetector(ticker=ticker.upper())
    detector.fit(feature_frame)
    return detector.predict(feature_frame)


def get_per_ticker_lookup(ticker: str, settings: Settings) -> PerformanceLookupTable:
    path = settings.research_dir / "lookup_tables" / "per_ticker" / f"{ticker.upper()}.parquet"
    return PerformanceLookupTable(path)


def check_staleness(ticker: str, settings: Settings) -> AnalysisStatus:
    """Decides whether `ticker` needs a fresh ticker-specific backtest before
    the next `/analyze` call: no per-ticker rows yet (never analyzed), or the
    most recent backtest is older than `auto_backtest_max_age_days`. This is
    the only thing that decides "cold start" now — the universal prior stays
    a pure fallback for when a backtest is attempted and fails or is
    insufficient, not the default path.
    """
    max_age_days = settings.auto_backtest_max_age_days
    df = get_per_ticker_lookup(ticker, settings).load()
    if df.empty:
        return AnalysisStatus(
            ticker=ticker,
            stale=True,
            reason="no_history",
            last_backtest_at=None,
            max_age_days=max_age_days,
        )

    last_updated = pd.to_datetime(df["last_updated"]).max()
    if last_updated.tzinfo is None:
        last_updated = last_updated.tz_localize("UTC")
    last_updated_dt = last_updated.to_pydatetime()
    stale = (datetime.now(UTC) - last_updated_dt) > timedelta(days=max_age_days)

    return AnalysisStatus(
        ticker=ticker,
        stale=stale,
        reason="stale" if stale else "fresh",
        last_backtest_at=last_updated_dt,
        max_age_days=max_age_days,
    )


def build_auto_backtest_config(
    ticker: str, settings: Settings, cache: ParquetPriceCache
) -> BacktestConfig:
    """Builds a `BacktestConfig` spanning a ticker's available history with no
    user input required, so a backtest can be triggered automatically from
    just a ticker symbol. Splits available history train/test by
    `auto_backtest_test_fraction` (most recent slice held out as the
    walk-forward test period) — the same convention the manual `/backtest`
    form defaults to, just computed instead of user-entered. Uses coarser
    `n_sims`/`window_step_days` than a live forecast since this evaluates
    every implemented model across many windows.
    """
    end = date.today()
    start = end - timedelta(days=365 * settings.auto_backtest_lookback_years)
    series = cache.get_or_fetch(ticker, start, end)
    dates = series.bars.index
    if len(dates) < 2:
        raise ValueError(f"Not enough price history for {ticker} to run a backtest.")

    split_pos = min(
        max(int(len(dates) * (1 - settings.auto_backtest_test_fraction)), 1), len(dates) - 1
    )
    train_start = dates[0].date()
    test_start = dates[split_pos].date()
    test_end = dates[-1].date()

    return BacktestConfig(
        ticker=ticker,
        train_start=train_start,
        train_end=test_start,
        test_start=test_start,
        test_end=test_end,
        horizon_days=63,
        n_sims=settings.auto_backtest_n_sims,
        window_step_days=settings.auto_backtest_window_step_days,
    )


def recommend_model(ticker: str, regime: RegimeResult, settings: Settings) -> RecommendationResult:
    """Recommends a model for the given regime, falling back to the universal
    prior on cold start, and to a hardcoded GBM default if even the universal
    prior has no data for this particular regime (a real possibility: only
    the regimes actually observed in the offline basket backtest are present).
    """
    universal_prior_path = settings.research_dir / "lookup_tables" / "universal_prior.parquet"
    engine = ModelSelectionEngine(
        get_per_ticker_lookup(ticker, settings), load_universal_prior(universal_prior_path)
    )
    try:
        return engine.recommend(ticker, regime)
    except ValueError:
        return _no_data_fallback(ticker, regime)


def _no_data_fallback(ticker: str, regime: RegimeResult) -> RecommendationResult:
    return RecommendationResult(
        ticker=ticker,
        regime=regime,
        ranked_models=[
            ModelScore(name="gbm", composite_score=0.0, confidence=0.0, n_observations=0)
        ],
        recommended=["gbm"],
        explanation=Explanation(
            summary=(
                "No backtest performance data is available yet for this regime; defaulting "
                "to Geometric Brownian Motion, the standard baseline model."
            ),
            regime_description=REGIME_DESCRIPTIONS.get(regime.label, regime.label.value),
            regime_confidence_note=f"Regime classification confidence: {regime.confidence:.0%}.",
            performance_basis="no backtest data available for this regime yet",
            driving_features=[],
        ),
        used_fallback=True,
    )


def submit_backtest_job(
    engine: BacktestEngine, config: BacktestConfig, jobs: JobStore, source: str = "ticker_backtest"
) -> str:
    """Submits `engine.run(config)` to `jobs`, wiring the job's own
    stage/progress reporting and cancellation flag through to the engine so
    `GET /backtest/{job_id}` reflects real progress and `POST
    /backtest/{job_id}/cancel` actually stops the run early. Shared by the
    manual `/backtest` form and the automatic `/analyze/{ticker}/backtest`
    trigger — both submit the exact same engine, just with different configs.
    """

    def _run(job_id: str) -> BacktestResult:
        result = engine.run(
            config,
            source=source,
            on_progress=lambda stage, completed, total: jobs.report_progress(
                job_id, stage, completed, total
            ),
            cancellation=jobs.cancel_event(job_id),
        )
        if result.cancelled:
            raise JobCancelled
        return result

    return jobs.submit(_run)


def run_simulation(
    model_name: str,
    feature_frame: pd.DataFrame,
    ticker: str,
    current_price: float,
    n_sims: int,
    horizon_days: int,
    runner: MonteCarloRunner,
) -> tuple[ForecastModel, ModelParams, SimulationPaths]:
    model = get_model(model_name)
    params = model.calibrate(feature_frame["return"])
    sim = runner.run(ticker, model, params, n_sims, horizon_days, current_price)
    return model, params, sim
