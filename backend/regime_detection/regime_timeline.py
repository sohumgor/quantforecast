from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from regime_detection.contracts import RegimeDetector


@dataclass(frozen=True)
class RegimeTimeline:
    """Full historical regime history for a ticker.

    `frame` is indexed by date with columns [label, confidence, raw_state_id, posterior_*].
    This is the single source of truth consumed by the backtesting engine (regime-at-window)
    and the frontend Regime Timeline chart.
    """

    ticker: str
    frame: pd.DataFrame


class RegimeTimelineBuilder:
    """Builds and persists a `RegimeTimeline` by decoding a detector across full history."""

    def build(
        self, ticker: str, features: pd.DataFrame, detector: RegimeDetector
    ) -> RegimeTimeline:
        detector.fit(features)
        proba = detector.predict_proba(features)  # columns: state_0..state_{k-1}
        state_labels = detector.state_labels

        label_for_column = {
            col: state_labels[int(col.removeprefix("state_"))].value for col in proba.columns
        }
        by_label = proba.rename(columns=label_for_column).T.groupby(level=0).sum().T

        assigned_label = by_label.idxmax(axis=1)
        confidence = by_label.max(axis=1)
        raw_state_id = proba.to_numpy().argmax(axis=1)

        frame = pd.DataFrame(
            {"label": assigned_label, "confidence": confidence, "raw_state_id": raw_state_id},
            index=proba.index,
        )
        frame = frame.join(by_label.add_prefix("posterior_"))
        return RegimeTimeline(ticker=ticker, frame=frame)

    def persist(self, timeline: RegimeTimeline, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        timeline.frame.to_parquet(path)

    def load(self, ticker: str, path: Path) -> RegimeTimeline:
        return RegimeTimeline(ticker=ticker, frame=pd.read_parquet(path))
