from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from arch import arch_model

from forecasting_models.base import ModelMetadata, ModelParams
from forecasting_models.registry import register_model


@dataclass(frozen=True)
class Garch11Params(ModelParams):
    mu: float
    omega: float
    alpha: float
    beta: float
    last_variance: float  # last in-sample conditional variance, seeds the forward simulation
    last_residual: float  # last in-sample residual (eps_T)


@register_model
class Garch11Model:
    """GARCH(1,1) conditional volatility diffusion: sigma_t^2 = omega +
    alpha*eps_{t-1}^2 + beta*sigma_{t-1}^2, fit via the `arch` package with a
    constant mean and Gaussian innovations.
    """

    metadata = ModelMetadata(
        name="garch11",
        display_name="GARCH(1,1)",
        category="stochastic_vol",
        supports_regimes=False,
        is_implemented=True,
        description="Simulates prices with volatility that clusters and mean-reverts (GARCH(1,1)).",
    )

    def calibrate(
        self, returns: pd.Series, features: pd.DataFrame | None = None
    ) -> Garch11Params:
        clean = returns.dropna()
        if len(clean) < 100:
            raise ValueError(f"Need at least 100 returns to fit GARCH(1,1), got {len(clean)}")

        model = arch_model(
            clean, mean="Constant", vol="GARCH", p=1, q=1, dist="normal", rescale=False
        )
        result = model.fit(disp="off")
        p = result.params

        return Garch11Params(
            mu=float(p["mu"]),
            omega=float(p["omega"]),
            alpha=float(p["alpha[1]"]),
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
        assert isinstance(params, Garch11Params)
        sigma2 = np.full(n_sims, max(params.last_variance, 1e-12))
        eps_prev = np.full(n_sims, params.last_residual)
        z = rng.standard_normal((n_sims, horizon_days))

        returns_path = np.empty((n_sims, horizon_days))
        for t in range(horizon_days):
            sigma2 = params.omega + params.alpha * eps_prev**2 + params.beta * sigma2
            sigma2 = np.maximum(sigma2, 1e-12)
            eps = np.sqrt(sigma2) * z[:, t]
            returns_path[:, t] = params.mu + eps
            eps_prev = eps

        returns_path = np.maximum(returns_path, -0.999)  # keep prices strictly positive
        cumulative_growth = np.cumprod(1 + returns_path, axis=1)
        return start_price * cumulative_growth

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, Garch11Params)
        return {
            "mu": params.mu,
            "omega": params.omega,
            "alpha": params.alpha,
            "beta": params.beta,
            "last_variance": params.last_variance,
        }
