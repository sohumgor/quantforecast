from __future__ import annotations

import threading
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from backtesting.contracts import BacktestConfig
from backtesting.engine import BacktestEngine
from backtesting.metrics import (
    _crps_from_sample,
    aggregate_by_regime_and_model,
    aggregate_window_results,
    evaluate_window,
)
from backtesting.results_store import ResultsStore
from backtesting.windowing import generate_windows
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from model_selection.lookup_table import PerformanceLookupTable
from simulation.monte_carlo_runner import MonteCarloRunner
from simulation.path_result import SimulationPaths


def _synthetic_price_series(n: int = 900, seed: int = 0) -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range("2019-01-01", periods=n)
    prices = 100 * np.exp(np.cumsum(rng.normal(0.0004, 0.014, n)))
    return pd.Series(prices, index=idx)


class TestGenerateWindows:
    def test_respects_min_train_rows_and_horizon(self) -> None:
        prices = _synthetic_price_series()
        config = BacktestConfig(
            ticker="SYN",
            train_start=date(2019, 1, 1),
            train_end=date(2021, 1, 1),
            test_start=date(2021, 1, 1),
            test_end=date(2022, 6, 1),
            horizon_days=21,
            n_sims=100,
            window_step_days=15,
        )
        windows = list(generate_windows(config, prices))
        assert len(windows) > 0
        for train_slice, actual_future_slice in windows:
            assert len(train_slice) >= 30
            assert len(actual_future_slice) == config.horizon_days
            assert train_slice.index[-1] < actual_future_slice.index[0]

    def test_step_size_is_respected(self) -> None:
        prices = _synthetic_price_series()
        config = BacktestConfig(
            ticker="SYN",
            train_start=date(2019, 1, 1),
            train_end=date(2021, 1, 1),
            test_start=date(2021, 1, 1),
            test_end=date(2021, 6, 1),
            horizon_days=10,
            n_sims=100,
            window_step_days=20,
        )
        origins = [train.index[-1] for train, _ in generate_windows(config, prices)]
        gaps = np.diff([prices.index.get_loc(o) for o in origins])
        assert (gaps == 20).all()


class TestCRPS:
    def test_matches_brute_force_pairwise_computation(self) -> None:
        rng = np.random.default_rng(1)
        sample = rng.normal(0, 1, 300)
        actual = 0.5

        brute_force = (
            np.mean(np.abs(sample - actual))
            - 0.5 * np.abs(sample[:, None] - sample[None, :]).mean()
        )

        assert _crps_from_sample(sample, actual) == pytest.approx(brute_force, abs=1e-9)

    def test_matches_closed_form_gaussian_crps(self) -> None:
        from scipy.stats import norm

        rng = np.random.default_rng(2)
        mu, sigma, actual = 100.0, 15.0, 110.0
        sample = rng.normal(mu, sigma, 200_000)

        z = (actual - mu) / sigma
        closed_form = sigma * (z * (2 * norm.cdf(z) - 1) + 2 * norm.pdf(z) - 1 / np.sqrt(np.pi))

        assert _crps_from_sample(sample, actual) == pytest.approx(closed_form, rel=0.02)


class TestEvaluateWindow:
    def test_returns_expected_keys_and_ranges(self) -> None:
        rng = np.random.default_rng(3)
        paths = 100 * np.exp(np.cumsum(rng.normal(0.0005, 0.015, (2000, 21)), axis=1))
        sim = SimulationPaths(
            ticker="TEST", model_name="gbm", paths=paths, terminal_values=paths[:, -1], dt=1 / 252
        )
        actual_future = np.linspace(101, 106, 21)

        row = evaluate_window(sim, actual_future, start_price=100.0)

        assert set(row) == {
            "mae",
            "squared_error",
            "crps",
            "within_90",
            "within_95",
            "directional_hit",
            "var_95_violated",
            "es_95",
            "start_price",
            "actual_price",
            "forecast_median_price",
            "forecast_p5_price",
            "forecast_p95_price",
        }
        assert row["within_90"] in (0.0, 1.0)
        assert row["directional_hit"] in (0.0, 1.0)
        assert row["mae"] >= 0
        assert row["crps"] >= 0


class TestCoverageCalibration:
    def test_well_calibrated_forecaster_achieves_target_coverage(self) -> None:
        rng = np.random.default_rng(4)
        mu, sigma = 100.0, 10.0
        rows = []
        for _ in range(400):
            terminal = rng.normal(mu, sigma, 2000)
            paths = np.tile(terminal[:, None], (1, 5))
            sim = SimulationPaths(
                ticker="X", model_name="x", paths=paths, terminal_values=terminal, dt=1 / 252
            )
            actual = rng.normal(mu, sigma)  # drawn from the same distribution: well-calibrated
            row = evaluate_window(sim, np.full(5, actual), start_price=100.0)
            rows.append(row)

        agg = aggregate_window_results(pd.DataFrame(rows))
        assert agg["coverage_90"] == pytest.approx(0.90, abs=0.05)

    def test_overconfident_forecaster_undershoots_target_coverage(self) -> None:
        rng = np.random.default_rng(4)
        mu, sigma = 100.0, 10.0
        rows = []
        for _ in range(400):
            terminal = rng.normal(mu, sigma, 2000)  # forecast: narrow distribution
            paths = np.tile(terminal[:, None], (1, 5))
            sim = SimulationPaths(
                ticker="X", model_name="x", paths=paths, terminal_values=terminal, dt=1 / 252
            )
            # actual outcomes are far more dispersed than the forecast admits
            actual = rng.normal(mu, sigma * 4)
            row = evaluate_window(sim, np.full(5, actual), start_price=100.0)
            rows.append(row)

        agg = aggregate_window_results(pd.DataFrame(rows))
        assert agg["coverage_90"] < 0.70


class TestAggregateByRegimeAndModel:
    def test_groups_correctly_and_drops_missing_regime(self) -> None:
        rows = pd.DataFrame(
            [
                {**_dummy_metrics(), "regime": "low_vol", "model_name": "gbm"},
                {**_dummy_metrics(), "regime": "low_vol", "model_name": "gbm"},
                {**_dummy_metrics(), "regime": "high_vol", "model_name": "gbm"},
                {**_dummy_metrics(), "regime": None, "model_name": "gbm"},
            ]
        )
        agg = aggregate_by_regime_and_model(rows, source="ticker_backtest")

        assert set(zip(agg["regime"], agg["model_name"], strict=True)) == {
            ("low_vol", "gbm"),
            ("high_vol", "gbm"),
        }
        low_vol_row = agg[agg["regime"] == "low_vol"].iloc[0]
        assert low_vol_row["n_observations"] == 2


def _dummy_metrics() -> dict[str, float]:
    return {
        "mae": 1.0,
        "squared_error": 1.0,
        "crps": 1.0,
        "within_90": 1.0,
        "within_95": 1.0,
        "directional_hit": 1.0,
        "var_95_violated": 0.0,
        "es_95": 0.1,
    }


class TestResultsStore:
    def test_write_read_roundtrip(self, tmp_path: Path) -> None:
        store = ResultsStore(tmp_path)
        df = pd.DataFrame({"mae": [1.0, 2.0], "model_name": ["gbm", "gbm"]})

        store.write("AAPL", "run123", df)
        loaded = store.read("AAPL", "run123")

        assert len(loaded) == 2
        assert list(loaded["model_name"]) == ["gbm", "gbm"]

    def test_list_runs_returns_all_written_runs(self, tmp_path: Path) -> None:
        store = ResultsStore(tmp_path)
        store.write("AAPL", "run1", pd.DataFrame({"a": [1]}))
        store.write("AAPL", "run2", pd.DataFrame({"a": [2]}))
        store.write("MSFT", "run1", pd.DataFrame({"a": [3]}))

        assert store.list_runs("AAPL") == ["run1", "run2"]
        assert store.list_runs("MSFT") == ["run1"]
        assert store.list_runs("GOOG") == []


class TestPerformanceLookupTableUpsert:
    def test_new_ticker_creates_file(self, tmp_path: Path) -> None:
        table = PerformanceLookupTable(tmp_path / "lookup.parquet")
        rows = pd.DataFrame(
            [{"regime": "low_vol", "model_name": "gbm", "n_observations": 5, **_dummy_agg()}]
        )
        table.upsert(rows)
        loaded = table.load()
        assert len(loaded) == 1
        assert loaded.iloc[0]["n_observations"] == 5

    def test_upsert_merges_with_weighted_average(self, tmp_path: Path) -> None:
        table = PerformanceLookupTable(tmp_path / "lookup.parquet")
        table.upsert(
            pd.DataFrame(
                [
                    {
                        "regime": "low_vol",
                        "model_name": "gbm",
                        "n_observations": 10,
                        **_dummy_agg(mean_mae=1.0),
                    }
                ]
            )
        )
        table.upsert(
            pd.DataFrame(
                [
                    {
                        "regime": "low_vol",
                        "model_name": "gbm",
                        "n_observations": 30,
                        **_dummy_agg(mean_mae=5.0),
                    }
                ]
            )
        )
        loaded = table.load()
        assert loaded.iloc[0]["n_observations"] == 40
        # weighted mean: (1.0*10 + 5.0*30) / 40 = 4.0
        assert loaded.iloc[0]["mean_mae"] == pytest.approx(4.0)


def _dummy_agg(mean_mae: float = 1.0) -> dict[str, float | str]:
    return {
        "mean_mae": mean_mae,
        "mean_rmse": 1.0,
        "mean_crps": 1.0,
        "coverage_90": 0.9,
        "coverage_95": 0.95,
        "directional_accuracy": 0.55,
        "mean_var_violations": 0.05,
        "mean_es_95": 0.1,
        "last_updated": "2024-01-01",
        "source": "ticker_backtest",
    }


class TestBacktestEngineIntegration:
    def test_run_populates_results_store_and_lookup_table(self, tmp_path: Path) -> None:
        prices = _synthetic_price_series()
        bars = pd.DataFrame(
            {
                "open": prices,
                "high": prices * 1.005,
                "low": prices * 0.995,
                "close": prices,
                "adj_close": prices,
                "volume": np.full(len(prices), 2_000_000),
            }
        )
        cache_dir = tmp_path / "price_cache"
        cache_dir.mkdir()
        bars.to_parquet(cache_dir / "SYN.parquet")

        engine = BacktestEngine(
            price_cache=ParquetPriceCache(cache_dir=cache_dir),
            feature_pipeline=FeatureEngineeringPipeline(),
            monte_carlo_runner=MonteCarloRunner(),
            results_store=ResultsStore(tmp_path / "backtests"),
            lookup_table=PerformanceLookupTable(tmp_path / "lookup.parquet"),
        )
        config = BacktestConfig(
            ticker="SYN",
            train_start=date(2019, 1, 1),
            train_end=date(2021, 1, 1),
            test_start=date(2021, 1, 1),
            test_end=date(2021, 9, 1),
            horizon_days=21,
            n_sims=300,
            window_step_days=20,
            models=["gbm", "historical_bootstrap"],
        )

        result = engine.run(config)

        assert result.run_id
        assert set(result.rankings) == {"gbm", "historical_bootstrap"}

        raw = engine._results_store.read("SYN", result.run_id)
        assert len(raw) > 0
        assert set(raw["model_name"].unique()) == {"gbm", "historical_bootstrap"}

        lookup_df = engine._lookup_table.load()
        assert len(lookup_df) > 0
        assert "mean_crps" in lookup_df.columns

    def test_on_progress_reports_real_stages_and_window_counts(self, tmp_path: Path) -> None:
        prices = _synthetic_price_series()
        bars = pd.DataFrame(
            {
                "open": prices,
                "high": prices * 1.005,
                "low": prices * 0.995,
                "close": prices,
                "adj_close": prices,
                "volume": np.full(len(prices), 2_000_000),
            }
        )
        cache_dir = tmp_path / "price_cache"
        cache_dir.mkdir()
        bars.to_parquet(cache_dir / "SYN.parquet")

        engine = BacktestEngine(
            price_cache=ParquetPriceCache(cache_dir=cache_dir),
            feature_pipeline=FeatureEngineeringPipeline(),
            monte_carlo_runner=MonteCarloRunner(),
            results_store=ResultsStore(tmp_path / "backtests"),
            lookup_table=PerformanceLookupTable(tmp_path / "lookup.parquet"),
        )
        config = BacktestConfig(
            ticker="SYN",
            train_start=date(2019, 1, 1),
            train_end=date(2021, 1, 1),
            test_start=date(2021, 1, 1),
            test_end=date(2021, 9, 1),
            horizon_days=21,
            n_sims=300,
            window_step_days=20,
            models=["gbm"],
        )

        calls: list[tuple[str, int | None, int | None]] = []

        def on_progress(stage: str, done: int | None, total: int | None) -> None:
            calls.append((stage, done, total))

        engine.run(config, on_progress=on_progress)

        stages_seen = [c[0] for c in calls]
        assert stages_seen[0] == "downloading_prices"
        assert "detecting_regime" in stages_seen
        assert "running_backtests" in stages_seen
        assert stages_seen[-1] == "done"

        running_calls = [c for c in calls if c[0] == "running_backtests"]
        assert len(running_calls) > 1  # more than just the initial (0, total) call
        completed_values = [c[1] for c in running_calls]
        assert completed_values == sorted(completed_values)  # monotonically increasing
        _, _, total = running_calls[-1]
        assert total is not None and total > 0
        assert running_calls[-1][1] == total  # finishes fully caught up

    def test_cancellation_stops_early_and_skips_persistence(self, tmp_path: Path) -> None:
        prices = _synthetic_price_series()
        bars = pd.DataFrame(
            {
                "open": prices,
                "high": prices * 1.005,
                "low": prices * 0.995,
                "close": prices,
                "adj_close": prices,
                "volume": np.full(len(prices), 2_000_000),
            }
        )
        cache_dir = tmp_path / "price_cache"
        cache_dir.mkdir()
        bars.to_parquet(cache_dir / "SYN.parquet")

        results_store = ResultsStore(tmp_path / "backtests")
        lookup_table = PerformanceLookupTable(tmp_path / "lookup.parquet")
        engine = BacktestEngine(
            price_cache=ParquetPriceCache(cache_dir=cache_dir),
            feature_pipeline=FeatureEngineeringPipeline(),
            monte_carlo_runner=MonteCarloRunner(),
            results_store=results_store,
            lookup_table=lookup_table,
        )
        config = BacktestConfig(
            ticker="SYN",
            train_start=date(2019, 1, 1),
            train_end=date(2021, 1, 1),
            test_start=date(2021, 1, 1),
            test_end=date(2021, 9, 1),
            horizon_days=21,
            n_sims=300,
            window_step_days=20,
            models=["gbm", "historical_bootstrap"],
        )

        cancel_after_first_window = threading.Event()

        def on_progress(stage: str, completed: int | None, total: int | None) -> None:
            if stage == "running_backtests" and completed and completed >= 1:
                cancel_after_first_window.set()

        result = engine.run(config, on_progress=on_progress, cancellation=cancel_after_first_window)

        assert result.cancelled is True
        assert result.rankings == []
        assert lookup_table.load().empty  # cancellation must not upsert partial results
        assert results_store.list_runs("SYN") == []  # nor persist a partial run
