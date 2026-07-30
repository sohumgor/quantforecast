from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class BacktestConfig:
    ticker: str
    train_start: date
    train_end: date
    test_start: date
    test_end: date
    horizon_days: int
    n_sims: int
    models: list[str] | None = None  # None = all implemented models
    window_step_days: int = 5  # rolling-window stride through the test period


@dataclass(frozen=True)
class BacktestResult:
    config: BacktestConfig
    run_id: str
    rankings: list[str]  # model names, best first (by mean CRPS across all windows)
    cancelled: bool = False  # True if cooperative cancellation cut the run short
