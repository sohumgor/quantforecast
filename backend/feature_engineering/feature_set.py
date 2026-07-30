from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd


@dataclass(frozen=True)
class FeatureSet:
    """Engineered statistical features for a single ticker.

    `frame` has one row per date and one column per engineered feature.
    `metadata` maps each column name to a plain-language description, driving
    the frontend's info-tooltip glossary.
    """

    ticker: str
    frame: pd.DataFrame
    latest: pd.Series
    metadata: dict[str, str] = field(default_factory=dict)
