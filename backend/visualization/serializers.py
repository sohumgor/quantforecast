from __future__ import annotations

import numpy as np
import pandas as pd

from regime_detection.regime_timeline import RegimeTimeline
from simulation.path_result import SimulationPaths
from visualization.chart_payloads import (
    DensityPayload,
    FanChartPayload,
    ModelHeatmapPayload,
    RegimeTimelinePayload,
)

DEFAULT_FAN_PERCENTILES: tuple[float, ...] = (5, 25, 50, 75, 95)
DEFAULT_N_SAMPLE_PATHS = 40


def serialize_fan_chart(
    paths: SimulationPaths,
    percentiles: tuple[float, ...] = DEFAULT_FAN_PERCENTILES,
    n_sample_paths: int = DEFAULT_N_SAMPLE_PATHS,
) -> FanChartPayload:
    """Converts simulated paths into JSON-safe percentile-band traces for a
    Plotly fan chart. Serialization only — no server-side chart rendering or
    styling, which stays entirely frontend-owned.
    """
    horizon_days = list(range(1, paths.paths.shape[1] + 1))
    percentile_values = np.percentile(paths.paths, percentiles, axis=0)
    percentile_bands = {
        f"p{p:g}": percentile_values[i].tolist() for i, p in enumerate(percentiles)
    }
    n_sims = paths.paths.shape[0]
    sample_size = min(n_sample_paths, n_sims)
    sample_idx = np.random.default_rng().choice(n_sims, size=sample_size, replace=False)
    sample_paths = paths.paths[sample_idx].tolist()
    return FanChartPayload(
        horizon_days=horizon_days, percentiles=percentile_bands, sample_paths=sample_paths
    )


def serialize_density(paths: SimulationPaths, n_bins: int = 50) -> DensityPayload:
    counts, bin_edges = np.histogram(paths.terminal_values, bins=n_bins)
    return DensityPayload(bin_edges=bin_edges.tolist(), counts=counts.tolist())


def serialize_model_heatmap(rankings: list[dict[str, float]]) -> ModelHeatmapPayload:
    raise NotImplementedError("serialize_model_heatmap lands in Phase 9")


def serialize_regime_timeline(timeline: RegimeTimeline) -> RegimeTimelinePayload:
    frame = timeline.frame
    dates = [str(pd.Timestamp(idx).date()) for idx in frame.index]
    return RegimeTimelinePayload(
        dates=dates,
        labels=frame["label"].tolist(),
        confidence=frame["confidence"].tolist(),
    )
