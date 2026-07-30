from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from forecasting_models.base import TRADING_DAYS_PER_YEAR, ModelMetadata, ModelParams
from forecasting_models.registry import register_model


@dataclass(frozen=True)
class GBMParams(ModelParams):
    mu: float
    sigma: float


@register_model
class GeometricBrownianMotionModel:
    """Constant-drift, constant-volatility log-normal diffusion:
    dS/S = mu*dt + sigma*dW. The textbook baseline forecasting model.
    """

    metadata = ModelMetadata(
        name="gbm",
        display_name="Geometric Brownian Motion",
        category="diffusion",
        supports_regimes=False,
        is_implemented=True,
        description="Simulates prices as a log-normal random walk with constant drift/volatility.",
    )

    def calibrate(self, returns: pd.Series, features: pd.DataFrame | None = None) -> GBMParams:
        """MLE calibration from simple returns.

        Log returns r_t = ln(S_t/S_{t-1}) ~ N((mu - 0.5*sigma^2)*dt, sigma^2*dt),
        so sigma is the annualized sample std of log returns, and mu (the SDE's
        drift, i.e. the total expected annual return rate) backs out from the
        annualized sample mean plus the variance drag term.
        """
        clean = returns.dropna()
        if len(clean) < 30:
            raise ValueError(f"Need at least 30 returns to calibrate GBM, got {len(clean)}")

        log_returns = np.log1p(clean)
        sigma = float(log_returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR))
        mu = float(log_returns.mean() * TRADING_DAYS_PER_YEAR + 0.5 * sigma**2)
        return GBMParams(mu=mu, sigma=sigma)

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        assert isinstance(params, GBMParams)
        dt = 1 / TRADING_DAYS_PER_YEAR
        z = rng.standard_normal((n_sims, horizon_days))
        log_return_paths = (params.mu - 0.5 * params.sigma**2) * dt + params.sigma * np.sqrt(
            dt
        ) * z
        cumulative_log_return = np.cumsum(log_return_paths, axis=1)
        return start_price * np.exp(cumulative_log_return)

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, GBMParams)
        return {"mu": params.mu, "sigma": params.sigma}
