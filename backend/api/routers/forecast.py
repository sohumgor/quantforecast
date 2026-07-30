from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException

from analytics.distribution_summary import RiskAnalyticsBuilder
from api.config import Settings
from api.dependencies import (
    get_feature_pipeline,
    get_monte_carlo_runner,
    get_price_cache,
    get_settings,
)
from api.orchestration import (
    compute_features,
    detect_current_regime,
    fetch_series,
    recommend_model,
    run_simulation,
)
from api.schemas.forecast import (
    DensityInfo,
    DistributionInfo,
    DrawdownInfo,
    ExplanationInfo,
    FanChartInfo,
    ForecastRequest,
    ForecastResponse,
    ModelParamsInfo,
    RiskAnalyticsInfo,
)
from data_ingestion.cache import ParquetPriceCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from simulation.monte_carlo_runner import MonteCarloRunner
from visualization.serializers import serialize_density, serialize_fan_chart

router = APIRouter()


@router.post("/forecast", response_model=ForecastResponse)
def forecast(
    request: ForecastRequest,
    cache: ParquetPriceCache = Depends(get_price_cache),
    pipeline: FeatureEngineeringPipeline = Depends(get_feature_pipeline),
    runner: MonteCarloRunner = Depends(get_monte_carlo_runner),
    settings: Settings = Depends(get_settings),
) -> ForecastResponse:
    ticker = request.ticker.upper()
    try:
        series = fetch_series(ticker, cache, settings, request.start, request.end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    feature_set = compute_features(series, pipeline)
    current_price = float(series.bars["adj_close"].iloc[-1])

    explanation_info: ExplanationInfo | None = None
    if request.model_name:
        model_name = request.model_name
    else:
        try:
            regime = detect_current_regime(ticker, feature_set.frame)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        recommendation = recommend_model(ticker, regime, settings)
        model_name = recommendation.recommended[0]
        explanation_info = ExplanationInfo(**asdict(recommendation.explanation))

    try:
        model, params, sim = run_simulation(
            model_name,
            feature_set.frame,
            ticker,
            current_price,
            request.n_sims,
            request.horizon_days,
            runner,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown model '{model_name}'") from exc
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    risk = RiskAnalyticsBuilder().build(sim, current_price)
    fan = serialize_fan_chart(sim)
    density = serialize_density(sim)

    return ForecastResponse(
        ticker=ticker,
        current_price=current_price,
        auto_selected=explanation_info is not None,
        explanation=explanation_info,
        model=ModelParamsInfo(
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
        fan_chart=FanChartInfo(horizon_days=fan.horizon_days, percentiles=fan.percentiles),
        density=DensityInfo(bin_edges=density.bin_edges, counts=density.counts),
    )
