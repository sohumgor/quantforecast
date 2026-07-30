from __future__ import annotations

from pathlib import Path
from typing import cast

import pandas as pd

from regime_detection.contracts import RegimeLabel

# Note: `composite_score` is deliberately NOT persisted here. Ranking weights
# are a `model_selection` concern (configurable, may be tuned without
# re-running backtests), and `backtesting` must never import
# `model_selection`'s scoring logic — only this raw-metrics table, which it
# reaches via `feedback_loop.py`. `ModelSelectionEngine` computes
# `composite_score` from these raw columns at recommend-time instead.
LOOKUP_TABLE_COLUMNS: tuple[str, ...] = (
    "regime",
    "model_name",
    "n_observations",
    "mean_mae",
    "mean_rmse",
    "mean_crps",
    "coverage_90",
    "coverage_95",
    "directional_accuracy",
    "mean_var_violations",
    "mean_es_95",
    "last_updated",
    "source",
)

_METRIC_COLUMNS: tuple[str, ...] = (
    "mean_mae",
    "mean_rmse",
    "mean_crps",
    "coverage_90",
    "coverage_95",
    "directional_accuracy",
    "mean_var_violations",
    "mean_es_95",
)


class PerformanceLookupTable:
    """Loads/queries/upserts the on-disk (regime, model) performance table that
    `ModelSelectionEngine` ranks against. Backed by Parquet, not a database.
    """

    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> pd.DataFrame:
        if not self._path.exists():
            return pd.DataFrame(columns=list(LOOKUP_TABLE_COLUMNS))
        return pd.read_parquet(self._path)

    def query(self, regime: RegimeLabel) -> pd.DataFrame:
        df = self.load()
        if df.empty:
            return df
        return df[df["regime"] == regime.value].reset_index(drop=True)

    def upsert(self, rows: pd.DataFrame) -> None:
        """Weighted-average upsert keyed by (regime, model_name): combines
        `n_observations` and recomputes the observation-weighted mean of each
        metric, so lookup quality strictly improves as more backtests run.
        Never overwrites a (regime, model) row wholesale.
        """
        if rows.empty:
            return

        existing = self.load()
        keys = set(zip(rows["regime"], rows["model_name"], strict=True))
        if not existing.empty:
            keys |= set(zip(existing["regime"], existing["model_name"], strict=True))

        merged_rows: list[dict[str, object]] = []
        for regime_value, model_name in keys:
            key_mask_existing = (existing.get("regime") == regime_value) & (
                existing.get("model_name") == model_name
            )
            existing_match = existing[key_mask_existing] if not existing.empty else existing
            key_mask_new = (rows["regime"] == regime_value) & (rows["model_name"] == model_name)
            new_match = rows[key_mask_new]

            if not existing_match.empty and not new_match.empty:
                merged_rows.append(_weighted_merge(existing_match.iloc[0], new_match.iloc[0]))
            elif not new_match.empty:
                merged_rows.append(cast(dict[str, object], new_match.iloc[0].to_dict()))
            else:
                merged_rows.append(cast(dict[str, object], existing_match.iloc[0].to_dict()))

        result = pd.DataFrame(merged_rows, columns=list(LOOKUP_TABLE_COLUMNS))
        self._path.parent.mkdir(parents=True, exist_ok=True)
        result.to_parquet(self._path)


def _weighted_merge(existing_row: pd.Series, new_row: pd.Series) -> dict[str, object]:
    existing_n = float(existing_row["n_observations"])
    new_n = float(new_row["n_observations"])
    total_n = existing_n + new_n

    merged: dict[str, object] = {
        "regime": existing_row["regime"],
        "model_name": existing_row["model_name"],
        "n_observations": total_n,
        "last_updated": new_row["last_updated"],
        "source": new_row["source"],
    }
    for col in _METRIC_COLUMNS:
        merged[col] = (existing_row[col] * existing_n + new_row[col] * new_n) / total_n
    return merged
