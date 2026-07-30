from __future__ import annotations

import threading
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import cast

import pandas as pd

from backtesting.contracts import BacktestConfig, BacktestResult
from backtesting.feedback_loop import update_lookup_table
from backtesting.metrics import aggregate_by_regime_and_model, evaluate_window
from backtesting.results_store import ResultsStore
from backtesting.windowing import generate_windows
from data_ingestion.cache import ParquetPriceCache
from data_ingestion.schemas import PriceSeries
from feature_engineering.pipeline import FeatureEngineeringPipeline
from forecasting_models.registry import get_model, list_models
from model_selection.lookup_table import PerformanceLookupTable
from regime_detection.hmm_detector import HMMRegimeDetector
from regime_detection.regime_timeline import RegimeTimelineBuilder
from simulation.monte_carlo_runner import MonteCarloRunner

__all__ = ["BacktestConfig", "BacktestEngine", "BacktestResult"]


class BacktestEngine:
    """Orchestrates out-of-sample evaluation: fetches history, builds features
    and a regime timeline once, generates rolling windows, calibrates and
    simulates every in-scope model per window, scores with `backtesting.metrics`,
    persists results, and hands aggregated regime-conditioned rows to
    `feedback_loop` to upsert into `model_selection`'s lookup table.
    """

    def __init__(
        self,
        price_cache: ParquetPriceCache,
        feature_pipeline: FeatureEngineeringPipeline,
        monte_carlo_runner: MonteCarloRunner,
        results_store: ResultsStore,
        lookup_table: PerformanceLookupTable,
    ) -> None:
        self._cache = price_cache
        self._pipeline = feature_pipeline
        self._runner = monte_carlo_runner
        self._results_store = results_store
        self._lookup_table = lookup_table

    def run(
        self,
        config: BacktestConfig,
        source: str = "ticker_backtest",
        on_progress: Callable[[str, int | None, int | None], None] | None = None,
        cancellation: threading.Event | None = None,
    ) -> BacktestResult:
        """`on_progress(stage, completed, total)` is called at each major
        stage; `completed`/`total` are only set for the (potentially long)
        per-window scoring stage, letting callers report real progress
        instead of a client-side timer. `cancellation`, if set mid-run, stops
        the scoring loop early and skips persisting/upserting results —
        the caller sees an empty, `cancelled=True` result and any existing
        per-ticker lookup data (or the universal prior) keeps driving
        recommendations, exactly as if this run had never happened.
        """

        def report(stage: str, completed: int | None = None, total: int | None = None) -> None:
            if on_progress is not None:
                on_progress(stage, completed, total)

        report("downloading_prices")
        series = self._cache.get_or_fetch(config.ticker, config.train_start, config.test_end)
        prices = series.bars["adj_close"]

        model_names = config.models or [m.name for m in list_models(only_implemented=True)]

        report("detecting_regime")
        regime_by_date = self._build_regime_lookup(config.ticker, series)

        windows = list(generate_windows(config, prices))
        total_units = len(model_names) * len(windows)

        per_window_rows: list[dict[str, object]] = []
        completed_units = 0
        cancelled = False
        report("running_backtests", completed_units, total_units)
        for model_name in model_names:
            model = get_model(model_name)
            for train_slice, actual_future_slice in windows:
                if cancellation is not None and cancellation.is_set():
                    cancelled = True
                    break

                completed_units += 1
                train_returns = train_slice.pct_change().dropna()
                try:
                    params = model.calibrate(train_returns)
                except ValueError:
                    report("running_backtests", completed_units, total_units)
                    continue  # not enough history yet for this model at this window

                origin_price = float(train_slice.iloc[-1])
                sim = self._runner.run(
                    config.ticker, model, params, config.n_sims, config.horizon_days, origin_price
                )
                metrics = evaluate_window(sim, actual_future_slice.to_numpy(), origin_price)
                origin_date = train_slice.index[-1]
                row: dict[str, object] = {**metrics}
                row["model_name"] = model_name
                row["window_origin"] = origin_date
                row["regime"] = regime_by_date.get(origin_date) if regime_by_date else None
                per_window_rows.append(row)
                report("running_backtests", completed_units, total_units)
            if cancelled:
                break

        run_id = f"{uuid.uuid4().hex[:10]}_{datetime.now(UTC):%Y%m%dT%H%M%S}"

        if cancelled:
            return BacktestResult(config=config, run_id=run_id, rankings=[], cancelled=True)

        results_df = pd.DataFrame(per_window_rows)

        if not results_df.empty:
            report("aggregating_results")
            self._results_store.write(config.ticker, run_id, results_df)
            aggregated = aggregate_by_regime_and_model(results_df, source=source)
            if not aggregated.empty:
                update_lookup_table(config.ticker, aggregated, self._lookup_table)

        report("done")
        return BacktestResult(
            config=config, run_id=run_id, rankings=self._rank_models_overall(results_df)
        )

    def _build_regime_lookup(
        self, ticker: str, series: PriceSeries
    ) -> dict[pd.Timestamp, str] | None:
        try:
            feature_set = self._pipeline.transform(series)
            detector = HMMRegimeDetector(ticker=ticker)
            timeline = RegimeTimelineBuilder().build(ticker, feature_set.frame, detector)
            return {
                cast(pd.Timestamp, idx): str(row["label"]) for idx, row in timeline.frame.iterrows()
            }
        except ValueError:
            return None  # not enough history to fit regimes; windows still scored, just unregimed

    def _rank_models_overall(self, results_df: pd.DataFrame) -> list[str]:
        if results_df.empty:
            return []
        mean_crps_by_model = results_df.groupby("model_name")["crps"].mean()
        return mean_crps_by_model.sort_values().index.tolist()
