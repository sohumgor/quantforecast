from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from forecasting_models.base import TRADING_DAYS_PER_YEAR, ModelMetadata, ModelParams
from forecasting_models.registry import register_model


@dataclass(frozen=True)
class MertonJumpDiffusionParams(ModelParams):
    mu: float
    sigma: float
    jump_intensity: float  # lambda: expected jumps per year
    jump_mean: float  # mean log-jump size
    jump_std: float  # std of log-jump size


@register_model
class MertonJumpDiffusionModel:
    """GBM plus a compound Poisson jump process (Merton, 1976) — captures
    sudden large moves that pure diffusion models underweight.

    Calibration uses a standard threshold-filtering approach: log returns
    more than `jump_threshold_std` sample standard deviations from the mean
    are classified as jumps; the diffusion parameters (mu, sigma) are
    estimated from the remaining "normal" returns, and the jump parameters
    (intensity, mean, std) from the filtered-out jump returns.
    """

    metadata = ModelMetadata(
        name="merton_jump_diffusion",
        display_name="Merton Jump Diffusion",
        category="jump",
        supports_regimes=False,
        is_implemented=True,
        description="GBM with occasional sudden jumps, modeled as a compound Poisson process.",
    )

    def __init__(self, jump_threshold_std: float = 3.0) -> None:
        self.jump_threshold_std = jump_threshold_std

    def calibrate(
        self, returns: pd.Series, features: pd.DataFrame | None = None
    ) -> MertonJumpDiffusionParams:
        clean = returns.dropna()
        if len(clean) < 100:
            raise ValueError(
                f"Need at least 100 returns to calibrate Merton Jump Diffusion, got {len(clean)}"
            )

        log_returns = np.log1p(clean)
        mean_lr = log_returns.mean()
        std_lr = log_returns.std()

        threshold = self.jump_threshold_std * std_lr
        is_jump = (log_returns - mean_lr).abs() > threshold

        normal_returns = log_returns[~is_jump]
        jump_returns = log_returns[is_jump]
        n_jumps = int(is_jump.sum())

        jump_intensity = (n_jumps / len(log_returns)) * TRADING_DAYS_PER_YEAR
        if n_jumps >= 2:
            jump_mean = float(jump_returns.mean())
            jump_std = float(jump_returns.std())
        else:
            # Too few detected jumps to estimate a spread; lambda~0 makes this
            # fallback inconsequential (a Poisson(0) process never fires).
            jump_mean = 0.0
            jump_std = float(std_lr)

        sigma = float(normal_returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR))
        mu = float(normal_returns.mean() * TRADING_DAYS_PER_YEAR + 0.5 * sigma**2)

        return MertonJumpDiffusionParams(
            mu=mu,
            sigma=sigma,
            jump_intensity=jump_intensity,
            jump_mean=jump_mean,
            jump_std=jump_std,
        )

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        assert isinstance(params, MertonJumpDiffusionParams)
        dt = 1 / TRADING_DAYS_PER_YEAR

        diffusion = (params.mu - 0.5 * params.sigma**2) * dt + params.sigma * np.sqrt(
            dt
        ) * rng.standard_normal((n_sims, horizon_days))

        n_jumps = rng.poisson(params.jump_intensity * dt, size=(n_sims, horizon_days))
        # Sum of n iid Normal(jump_mean, jump_std^2) is exactly
        # Normal(n*jump_mean, n*jump_std^2) — no loop needed.
        jump_sum = n_jumps * params.jump_mean + params.jump_std * np.sqrt(
            n_jumps
        ) * rng.standard_normal((n_sims, horizon_days))

        log_return_paths = diffusion + jump_sum
        cumulative_log_return = np.cumsum(log_return_paths, axis=1)
        return start_price * np.exp(cumulative_log_return)

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, MertonJumpDiffusionParams)
        return {
            "mu": params.mu,
            "sigma": params.sigma,
            "jump_intensity": params.jump_intensity,
            "jump_mean": params.jump_mean,
            "jump_std": params.jump_std,
        }
