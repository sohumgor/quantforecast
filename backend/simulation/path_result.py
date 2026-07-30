from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class SimulationPaths:
    """The output of a Monte Carlo run: `paths` has shape (n_sims, horizon_days)."""

    ticker: str
    model_name: str
    paths: np.ndarray
    terminal_values: np.ndarray
    dt: float
