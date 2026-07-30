from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from arch import arch_model

from forecasting_models.base import ModelMetadata, ModelParams
from forecasting_models.registry import register_model

_E_ABS_Z = np.sqrt(2 / np.pi)  # E|z| for a standard normal z


@dataclass(frozen=True)
class EGARCHParams(ModelParams):
    mu: float
    omega: float
    alpha: float
    gamma: float
    beta: float
    last_variance: float  # seeds the forward simulation
    last_residual: float


@register_model
class EGARCHModel:
    """Exponential GARCH (Nelson 1991): models log-variance, so it can capture
    asymmetric volatility response to positive vs. negative shocks (the
    leverage effect) without needing to constrain parameters to keep variance
    positive:

        ln(sigma_t^2) = omega + alpha*(|e_{t-1}| - E|e_{t-1}|) + gamma*e_{t-1}
                        + beta*ln(sigma_{t-1}^2),   e_t = eps_t / sigma_t
    """

    metadata = ModelMetadata(
        name="egarch",
        display_name="EGARCH",
        category="stochastic_vol",
        supports_regimes=False,
        is_implemented=True,
        description="Like GARCH(1,1); negative shocks raise volatility more than positive ones.",
    )

    def calibrate(
        self, returns: pd.Series, features: pd.DataFrame | None = None
    ) -> EGARCHParams:
        clean = returns.dropna()
        if len(clean) < 100:
            raise ValueError(f"Need at least 100 returns to fit EGARCH, got {len(clean)}")

        model = arch_model(
            clean, mean="Constant", vol="EGARCH", p=1, o=1, q=1, dist="normal", rescale=False
        )
        result = model.fit(disp="off")
        p = result.params

        return EGARCHParams(
            mu=float(p["mu"]),
            omega=float(p["omega"]),
            alpha=float(p["alpha[1]"]),
            gamma=float(p["gamma[1]"]),
            beta=float(p["beta[1]"]),
            last_variance=float(np.asarray(result.conditional_volatility)[-1] ** 2),
            last_residual=float(np.asarray(result.resid)[-1]),
        )

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        assert isinstance(params, EGARCHParams)
        last_variance = max(params.last_variance, 1e-12)
        log_sigma2 = np.full(n_sims, np.log(last_variance))
        last_z = np.full(n_sims, params.last_residual / np.sqrt(last_variance))

        returns_path = np.empty((n_sims, horizon_days))
        for t in range(horizon_days):
            log_sigma2 = (
                params.omega
                + params.alpha * (np.abs(last_z) - _E_ABS_Z)
                + params.gamma * last_z
                + params.beta * log_sigma2
            )
            sigma2 = np.exp(np.clip(log_sigma2, -50, 50))
            z = rng.standard_normal(n_sims)
            eps = np.sqrt(sigma2) * z
            returns_path[:, t] = params.mu + eps
            last_z = z

        returns_path = np.maximum(returns_path, -0.999)  # keep prices strictly positive
        cumulative_growth = np.cumprod(1 + returns_path, axis=1)
        return start_price * cumulative_growth

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, EGARCHParams)
        return {
            "mu": params.mu,
            "omega": params.omega,
            "alpha": params.alpha,
            "gamma": params.gamma,
            "beta": params.beta,
            "last_variance": params.last_variance,
        }
