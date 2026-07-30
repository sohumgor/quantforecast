"""Builds the shipped universal (regime, model) performance prior by running
the full backtesting engine across a fixed, cross-sector basket of tickers.

This is what `ModelSelectionEngine` falls back to for cold-start recommendations
— a ticker with no personal backtest history yet still gets a sensible,
regime-conditioned model recommendation on first use.

Run manually/offline (not part of the API request path):

    cd research && uv run --project ../backend python offline_prior_builder.py

or, equivalently, from `backend/` with this file's path:

    cd backend && uv run python ../research/offline_prior_builder.py
"""

from __future__ import annotations

import sys
import warnings
from datetime import date
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(_BACKEND_DIR))

from backtesting.engine import BacktestConfig, BacktestEngine  # noqa: E402
from backtesting.results_store import ResultsStore  # noqa: E402
from data_ingestion.cache import ParquetPriceCache  # noqa: E402
from feature_engineering.pipeline import FeatureEngineeringPipeline  # noqa: E402
from model_selection.lookup_table import PerformanceLookupTable  # noqa: E402
from simulation.monte_carlo_runner import MonteCarloRunner  # noqa: E402

RESEARCH_DIR = Path(__file__).resolve().parent

# A small, cross-sector, cross-volatility-profile basket. Not exhaustive —
# enough to give the universal prior some diversity of regime history without
# an excessively long build time.
BASKET: tuple[str, ...] = ("SPY", "AAPL", "MSFT", "JPM", "XOM")

TRAIN_START = date(2016, 1, 1)
TRAIN_END = date(2020, 1, 1)
TEST_START = date(2020, 1, 1)
TEST_END = date(2024, 1, 1)
HORIZON_DAYS = 21
N_SIMS = 2000
WINDOW_STEP_DAYS = 10


def build_engine() -> BacktestEngine:
    universal_prior_path = RESEARCH_DIR / "lookup_tables" / "universal_prior.parquet"
    return BacktestEngine(
        price_cache=ParquetPriceCache(cache_dir=RESEARCH_DIR / "price_cache"),
        feature_pipeline=FeatureEngineeringPipeline(),
        monte_carlo_runner=MonteCarloRunner(),
        results_store=ResultsStore(RESEARCH_DIR / "backtests"),
        lookup_table=PerformanceLookupTable(universal_prior_path),
    )


def main() -> None:
    warnings.filterwarnings("ignore")  # noisy but harmless arch/hmmlearn library warnings
    engine = build_engine()

    for ticker in BASKET:
        config = BacktestConfig(
            ticker=ticker,
            train_start=TRAIN_START,
            train_end=TRAIN_END,
            test_start=TEST_START,
            test_end=TEST_END,
            horizon_days=HORIZON_DAYS,
            n_sims=N_SIMS,
            window_step_days=WINDOW_STEP_DAYS,
        )
        print(f"Backtesting {ticker}...")
        try:
            result = engine.run(config, source="universal_prior")
        except Exception as exc:  # keep the basket run going even if one ticker fails
            print(f"  skipped {ticker}: {exc}")
            continue
        print(f"  run_id={result.run_id}  ranking={result.rankings}")

    output_path = RESEARCH_DIR / "lookup_tables" / "universal_prior.parquet"
    print(f"\nUniversal prior written to {output_path}")


if __name__ == "__main__":
    main()
