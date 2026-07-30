from __future__ import annotations

from functools import lru_cache

from fastapi import Depends

from api.config import Settings
from api.jobs import JobStore
from backtesting.results_store import ResultsStore
from data_ingestion.cache import ParquetPriceCache
from data_ingestion.company_info_cache import CompanyInfoCache
from feature_engineering.pipeline import FeatureEngineeringPipeline
from simulation.monte_carlo_runner import MonteCarloRunner


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_price_cache(settings: Settings = Depends(get_settings)) -> ParquetPriceCache:
    # Not cached: depends on the injected `settings`, so overriding
    # `get_settings` in tests correctly cascades here rather than being
    # silently bypassed by a stale cached instance.
    return ParquetPriceCache(cache_dir=settings.price_cache_dir)


def get_feature_pipeline() -> FeatureEngineeringPipeline:
    return FeatureEngineeringPipeline()


@lru_cache
def get_monte_carlo_runner() -> MonteCarloRunner:
    return MonteCarloRunner()


def get_results_store(settings: Settings = Depends(get_settings)) -> ResultsStore:
    return ResultsStore(settings.research_dir / "backtests")


def get_company_info_cache(settings: Settings = Depends(get_settings)) -> CompanyInfoCache:
    return CompanyInfoCache(cache_dir=settings.company_info_dir)


@lru_cache
def get_job_store() -> JobStore:
    return JobStore()
