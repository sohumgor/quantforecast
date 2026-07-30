from __future__ import annotations

from pathlib import Path

from model_selection.lookup_table import PerformanceLookupTable

_REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_UNIVERSAL_PRIOR_PATH = _REPO_ROOT / "research" / "lookup_tables" / "universal_prior.parquet"


def load_universal_prior(path: Path | None = None) -> PerformanceLookupTable:
    """Loads the shipped `research/lookup_tables/universal_prior.parquet`, used
    for cold-start recommendations when a ticker has no personal backtest history.
    Built offline by `research/offline_prior_builder.py`.
    """
    return PerformanceLookupTable(path or DEFAULT_UNIVERSAL_PRIOR_PATH)
