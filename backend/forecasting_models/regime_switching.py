from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from forecasting_models.base import ModelMetadata, ModelParams
from forecasting_models.gbm import GBMParams
from forecasting_models.registry import register_model
from regime_detection.contracts import RegimeLabel


@dataclass(frozen=True)
class RegimeSwitchingParams(ModelParams):
    """Per-regime GBM-style parameters plus the regime transition matrix.

    Note: `regime_detection`'s output is consumed here purely as a *feature*
    describing which regime's diffusion parameters to draw from during
    simulation — it is not this module reaching back into the regime
    detector's internals, keeping the dependency direction one-way.
    """

    regime_params: dict[RegimeLabel, GBMParams] = field(default_factory=dict)
    transition_matrix: dict[RegimeLabel, dict[RegimeLabel, float]] = field(default_factory=dict)


@register_model
class RegimeSwitchingModel:
    """Simulates by drawing from regime-conditional diffusion parameters and
    switching regimes according to a fitted transition matrix. Placeholder
    pending a real implementation — the user intends to supply/refine this later."""

    metadata = ModelMetadata(
        name="regime_switching",
        display_name="Regime Switching",
        category="regime",
        supports_regimes=True,
        is_implemented=False,
        description="Simulates prices that transition between distinct volatility/drift regimes.",
    )

    def calibrate(
        self, returns: pd.Series, features: pd.DataFrame | None = None
    ) -> RegimeSwitchingParams:
        raise NotImplementedError("Regime Switching model is not yet implemented")

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        raise NotImplementedError("Regime Switching model is not yet implemented")

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, RegimeSwitchingParams)
        return {
            f"{regime.value}_mu": p.mu for regime, p in params.regime_params.items()
        } | {f"{regime.value}_sigma": p.sigma for regime, p in params.regime_params.items()}
