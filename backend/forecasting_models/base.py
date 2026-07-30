from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252
"""Shared annualization constant. `calibrate()` receives simple (not log) returns,
matching the `return` column convention established in `feature_engineering`."""


@dataclass(frozen=True)
class ModelParams:
    """Base type for calibrated model parameters. Each concrete model defines its
    own frozen dataclass subclass (e.g. `GBMParams(mu, sigma)`) for type safety."""


@dataclass(frozen=True)
class ModelMetadata:
    name: str  # unique registry key, e.g. "gbm"
    display_name: str  # "Geometric Brownian Motion"
    category: str  # "diffusion" | "jump" | "stochastic_vol" | "empirical" | "regime"
    supports_regimes: bool
    is_implemented: bool  # False => placeholder, simulate() raises NotImplementedError
    description: str


@runtime_checkable
class ForecastModel(Protocol):
    """Shared plugin interface implemented by every forecasting model (GBM, GARCH,
    EGARCH, Merton Jump Diffusion, Historical Bootstrap, Heston, Regime-Switching).

    `model_selection` depends only on `ModelMetadata` (via the registry) — never
    on a concrete model's internals — keeping regime detection, model selection,
    and simulation independently composable.
    """

    metadata: ModelMetadata

    def calibrate(self, returns: pd.Series, features: pd.DataFrame | None = None) -> ModelParams:
        """Fit model parameters from historical returns. Deterministic given input."""
        ...

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        """Returns simulated price paths, shape (n_sims, horizon_days)."""
        ...

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        """Human/UI-facing coefficients for Advanced Mode (e.g. {'mu': .., 'sigma': ..})."""
        ...
