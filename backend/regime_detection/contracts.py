from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Literal, Protocol

import pandas as pd

REGIME_FEATURE_COLUMNS: tuple[str, ...] = (
    "log_return",
    "rolling_vol_21d",
    "momentum_10d",
    "drawdown",
    "rolling_skew_63d",
    "rolling_kurtosis_63d",
)


class RegimeLabel(StrEnum):
    LOW_VOL = "low_vol"
    MEDIUM_VOL = "medium_vol"
    HIGH_VOL = "high_vol"
    HIGH_VOL_JUMPS = "high_vol_jumps"
    TRENDING = "trending"
    SIDEWAYS = "sideways"
    STRESS_CRISIS = "stress_crisis"


@dataclass(frozen=True)
class RegimeResult:
    """The outcome of classifying the market regime as of a given date.

    Regime *detection* is deliberately separate from forecasting-model
    *selection* — this type is consumed by `model_selection`, never used to
    directly pick a model.
    """

    ticker: str
    as_of: date
    label: RegimeLabel
    confidence: float  # posterior probability of the winning state, 0-1
    posterior: dict[RegimeLabel, float]  # full distribution across all detected regimes
    raw_state_id: int  # underlying HMM/GMM state index, pre semantic-label mapping
    method: Literal["hmm", "gmm"]
    n_states_fit: int


class RegimeDetector(Protocol):
    """Implemented by `HMMRegimeDetector` (primary) and `GMMRegimeDetector` (secondary).

    Each instance is scoped to one ticker (set at construction), since a
    distinct model is fit per ticker's historical feature series.
    """

    ticker: str

    def fit(self, features: pd.DataFrame) -> RegimeDetector: ...

    def predict(self, features: pd.DataFrame) -> RegimeResult: ...

    def predict_proba(self, features: pd.DataFrame) -> pd.DataFrame:
        """Posterior probability of each state for every row in `features`."""
        ...

    @property
    def state_labels(self) -> dict[int, RegimeLabel]:
        """The fitted deterministic mapping from raw state ID to semantic label."""
        ...
