from __future__ import annotations

from forecasting_models.base import TRADING_DAYS_PER_YEAR, ForecastModel, ModelParams
from simulation.path_result import SimulationPaths
from simulation.seeding import make_rng


class MonteCarloRunner:
    """Generic Monte Carlo execution harness: calls `model.simulate(...)` without
    knowing which concrete model it is running. Owns RNG/seeding concerns so
    every model gets reproducible, consistently-shaped output.
    """

    def run(
        self,
        ticker: str,
        model: ForecastModel,
        params: ModelParams,
        n_sims: int,
        horizon_days: int,
        start_price: float,
        seed: int | None = None,
    ) -> SimulationPaths:
        if n_sims <= 0:
            raise ValueError(f"n_sims must be positive, got {n_sims}")
        if horizon_days <= 0:
            raise ValueError(f"horizon_days must be positive, got {horizon_days}")

        rng = make_rng(seed)
        paths = model.simulate(params, n_sims, horizon_days, start_price, rng)

        return SimulationPaths(
            ticker=ticker,
            model_name=model.metadata.name,
            paths=paths,
            terminal_values=paths[:, -1],
            dt=1 / TRADING_DAYS_PER_YEAR,
        )
