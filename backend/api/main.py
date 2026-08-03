from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import Settings
from api.routers import (
    analysis,
    backtest,
    company,
    data,
    features,
    forecast,
    health,
    models,
    regime,
)


def create_app() -> FastAPI:
    settings = Settings()
    app = FastAPI(title="QuantForecast API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(company.router, prefix="/api", tags=["company"])
    app.include_router(data.router, prefix="/api", tags=["data"])
    app.include_router(features.router, prefix="/api", tags=["features"])
    app.include_router(regime.router, prefix="/api", tags=["regime"])
    app.include_router(models.router, prefix="/api", tags=["models"])
    app.include_router(forecast.router, prefix="/api", tags=["forecast"])
    app.include_router(analysis.router, prefix="/api", tags=["analysis"])
    app.include_router(backtest.router, prefix="/api", tags=["backtest"])
    return app


app = create_app()
