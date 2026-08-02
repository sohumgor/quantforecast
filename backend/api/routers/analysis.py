from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException

from analytics.distribution_summary import RiskAnalyticsBuilder
from api.config import Settings
from api.dependencies import (
    get_feature_pipeline,
    get_job_store,
    get_monte_carlo_runner,
    get_price_cache,
    get_results_store,
    get_settings,
)
from api.jobs import JobStore
from api.orchestration import (
    build_auto_backtest_config,
    check_staleness,
    compute_features,
    detect_current_regime,
    fetch_series,
    get_per_ticker_lookup,
    recommend_model,
    run_simulation,
    submit_backtest_job,
)
from api.schemas.analysis import (
    AnalysisResponse,
    AnalysisStatusResponse,
    AnalyzeRequest,
    ModelScoreInfo,
    RegimeInfo,
)
from api.schemas.backtest import BacktestJobResponse
from api.schemas.forecast import (
    DensityInfo,
    DistributionInfo,
    DrawdownInfo,
    ExplanationInfo,
    FanChartInfo,
    ModelParamsInfo,
    RiskAnalyticsInfo,
)
from backtesting.engine import BacktestEngine
from backtesting.results_store import ResultsStore
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from forecasting_models.registry import get_model
from simulation.monte_carlo_runner import MonteCarloRunner
from visualization.serializers import serialize_density, serialize_fan_chart

router = APIRouter()


@router.get("/analyze/{ticker}/status", response_model=AnalysisStatusResponse)
def get_analysis_status(
    ticker: str, settings: Settings = Depends(get_settings)
) -> AnalysisStatusResponse:
    """Pre-flight check the frontend makes before rendering the dashboard:
    tells it whether to jump straight to `/analyze` (fresh per-ticker
    backtest already on file) or to run `/analyze/{ticker}/backtest` first
    so the recommendation is grounded in this ticker's own history instead
    of the universal-prior cold start.
    """
    status = check_staleness(ticker.upper(), settings)
    return AnalysisStatusResponse(
        ticker=status.ticker,
        stale=status.stale,
        reason=status.reason,
        last_backtest_at=status.last_backtest_at,
        max_age_days=status.max_age_days,
    )


@router.post("/analyze/{ticker}/backtest", response_model=BacktestJobResponse)
def trigger_analysis_backtest(
    ticker: str,
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    runner: MonteCarloRunner = Depends(get_monte_carlo_runner),
    results_store: ResultsStore = Depends(get_results_store),
    settings: Settings = Depends(get_settings),
    jobs: JobStore = Depends(get_job_store),
) -> BacktestJobResponse:
    """Runs the automatic, ticker-specific backtest that now precedes a
    ticker's first (or first stale) forecast — same `BacktestEngine` the
    manual `/backtest` form drives, just with a config computed from the
    ticker alone instead of user-entered dates.
    """
    ticker = ticker.upper()
    try:
        config = build_auto_backtest_config(ticker, settings, cache)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    engine = BacktestEngine(
        price_cache=cache,
        feature_pipeline=pipeline,
        monte_carlo_runner=runner,
        results_store=results_store,
        lookup_table=get_per_ticker_lookup(ticker, settings),
    )
    job_id = submit_backtest_job(engine, config, jobs, source="ticker_backtest")
    return BacktestJobResponse(job_id=job_id, status="queued")


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(
    request: AnalyzeRequest,
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    runner: MonteCarloRunner = Depends(get_monte_carlo_runner),
    settings: Settings = Depends(get_settings),
) -> AnalysisResponse:
    ticker = request.ticker.upper()
    try:
        series = fetch_series(ticker, cache, settings, request.start, request.end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    feature_set = compute_features(series, pipeline)
    current_price = float(series.bars["adj_close"].iloc[-1])

    try:
        regime = detect_current_regime(ticker, feature_set.frame)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    recommendation = recommend_model(ticker, regime, settings)
    selected_model_name = recommendation.recommended[0]

    try:
        model, params, sim = run_simulation(
            selected_model_name,
            feature_set.frame,
            ticker,
            current_price,
            request.n_sims,
            request.horizon_days,
            runner,
        )
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    risk = RiskAnalyticsBuilder().build(sim, current_price)
    fan = serialize_fan_chart(sim)
    density = serialize_density(sim)

    return AnalysisResponse(
        ticker=ticker,
        current_price=current_price,
        regime=RegimeInfo(
            label=regime.label.value,
            confidence=regime.confidence,
            posterior={label.value: prob for label, prob in regime.posterior.items()},
            as_of=regime.as_of,
        ),
        used_fallback=recommendation.used_fallback,
        ranked_models=[
            ModelScoreInfo(
                name=score.name,
                display_name=get_model(score.name).metadata.display_name,
                composite_score=score.composite_score,
                confidence=score.confidence,
                n_observations=score.n_observations,
            )
            for score in recommendation.ranked_models
        ],
        explanation=ExplanationInfo(**asdict(recommendation.explanation)),
        selected_model=ModelParamsInfo(
            model_name=model.metadata.name,
            display_name=model.metadata.display_name,
            params=model.param_summary(params),
        ),
        risk_analytics=RiskAnalyticsInfo(
            value_at_risk_95=risk.value_at_risk_95,
            expected_shortfall_95=risk.expected_shortfall_95,
            drawdown=DrawdownInfo(**asdict(risk.drawdown)),
            distribution=DistributionInfo(**asdict(risk.distribution)),
        ),
        fan_chart=FanChartInfo(
            horizon_days=fan.horizon_days,
            percentiles=fan.percentiles,
            sample_paths=fan.sample_paths,
        ),
        density=DensityInfo(bin_edges=density.bin_edges, counts=density.counts),
    )
