from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from forecasting_models.base import ModelMetadata, ModelParams
from forecasting_models.registry import register_model


@dataclass(frozen=True)
class HestonParams(ModelParams):
    mu: float
    kappa: float  # mean-reversion speed of variance
    theta: float  # long-run variance
    xi: float  # volatility of variance ("vol of vol")
    rho: float  # correlation between price and variance shocks
    v0: float  # initial variance


@register_model
class HestonModel:
    """Stochastic-volatility model where variance itself follows a mean-reverting
    CIR process, correlated with price shocks. Placeholder pending a real
    implementation — the user intends to supply/refine this later."""

    metadata = ModelMetadata(
        name="heston",
        display_name="Heston Stochastic Volatility",
        category="stochastic_vol",
        supports_regimes=False,
        is_implemented=False,
        description="Volatility follows a mean-reverting random process, correlated with price.",
    )

    def calibrate(self, returns: pd.Series, features: pd.DataFrame | None = None) -> HestonParams:
        raise NotImplementedError("Heston model is not yet implemented")

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        raise NotImplementedError("Heston model is not yet implemented")

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, HestonParams)
        return {
            "mu": params.mu,
            "kappa": params.kappa,
            "theta": params.theta,
            "xi": params.xi,
            "rho": params.rho,
            "v0": params.v0,
        }
