from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="QFP_")

    research_dir: Path = _REPO_ROOT / "research"
    cors_allow_origins: list[str] = ["http://localhost:3000"]
    default_lookback_years: int = 5

    # Mirrors config/defaults.yaml's `auto_backtest` section: drives the
    # automatic, ticker-specific backtest that runs before the first (or
    # first stale) forecast for a ticker.
    auto_backtest_lookback_years: int = 5
    auto_backtest_test_fraction: float = 0.3
    auto_backtest_n_sims: int = 1500
    auto_backtest_window_step_days: int = 10
    auto_backtest_max_age_days: int = 7

    @property
    def price_cache_dir(self) -> Path:
        return self.research_dir / "price_cache"

    @property
    def regime_timelines_dir(self) -> Path:
        return self.research_dir / "regime_timelines"

    @property
    def company_info_dir(self) -> Path:
        return self.research_dir / "company_info"
