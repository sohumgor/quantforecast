from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from forecasting_models.base import ModelMetadata, ModelParams
from forecasting_models.registry import register_model


@dataclass(frozen=True)
class HistoricalBootstrapParams(ModelParams):
    returns_pool: tuple[float, ...]  # historical simple returns resampled from
    block_size: int = 1

    @property
    def returns_pool_size(self) -> int:
        return len(self.returns_pool)


@register_model
class HistoricalBootstrapModel:
    """Resamples (blocks of) historical returns directly, making no parametric
    distributional assumption. With `block_size > 1` this is a moving-block
    bootstrap, which better preserves short-term serial dependence
    (volatility clustering, autocorrelation) than plain i.i.d. resampling.
    """

    metadata = ModelMetadata(
        name="historical_bootstrap",
        display_name="Historical Bootstrap",
        category="empirical",
        supports_regimes=False,
        is_implemented=True,
        description="Simulates future paths by resampling blocks of actual historical returns.",
    )

    def __init__(self, block_size: int = 1) -> None:
        self.block_size = block_size

    def calibrate(
        self, returns: pd.Series, features: pd.DataFrame | None = None
    ) -> HistoricalBootstrapParams:
        clean = returns.dropna()
        if len(clean) < max(30, self.block_size):
            raise ValueError(
                f"Need at least {max(30, self.block_size)} returns to bootstrap from, "
                f"got {len(clean)}"
            )
        return HistoricalBootstrapParams(
            returns_pool=tuple(clean.to_numpy()), block_size=self.block_size
        )

    def simulate(
        self,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        rng: np.random.Generator,
    ) -> np.ndarray:
        assert isinstance(params, HistoricalBootstrapParams)
        pool = np.asarray(params.returns_pool)
        block = params.block_size
        n_pool = len(pool)

        if block <= 1:
            sampled_idx = rng.integers(0, n_pool, size=(n_sims, horizon_days))
            sampled_returns = pool[sampled_idx]
        else:
            if block > n_pool:
                raise ValueError(f"block_size ({block}) exceeds returns pool size ({n_pool})")
            n_blocks_needed = -(-horizon_days // block)  # ceil division
            block_starts = rng.integers(0, n_pool - block + 1, size=(n_sims, n_blocks_needed))
            offsets = np.arange(block)
            block_idx = block_starts[:, :, None] + offsets[None, None, :]
            sampled_returns = pool[block_idx].reshape(n_sims, -1)[:, :horizon_days]

        cumulative_growth = np.cumprod(1 + sampled_returns, axis=1)
        return start_price * cumulative_growth

    def param_summary(self, params: ModelParams) -> dict[str, float]:
        assert isinstance(params, HistoricalBootstrapParams)
        return {
            "returns_pool_size": float(params.returns_pool_size),
            "block_size": float(params.block_size),
        }
