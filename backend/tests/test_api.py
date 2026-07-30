from __future__ import annotations

import time
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.config import Settings
from api.dependencies import get_price_cache, get_settings
from api.main import app
from api.orchestration import build_auto_backtest_config, get_per_ticker_lookup, recommend_model
from data_ingestion.cache import ParquetPriceCache
from regime_detection.contracts import RegimeLabel, RegimeResult

ALL_MODEL_NAMES = {
    "gbm",
    "garch11",
    "egarch",
    "historical_bootstrap",
    "merton_jump_diffusion",
    "heston",
    "regime_switching",
}


def _seed_price_series(cache_dir: Path, ticker: str, n: int = 1600, seed: int = 0) -> None:
    # ~6.3 years of business days ending today, so the API's default 5-year
    # lookback (start=today-5y, end=today) is always fully cache-covered and
    # never falls through to a real (network) yfinance call.
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=n)
    prices = 100 * np.exp(np.cumsum(rng.normal(0.0004, 0.014, n)))
    bars = pd.DataFrame(
        {
            "open": prices,
            "high": prices * 1.005,
            "low": prices * 0.995,
            "close": prices,
            "adj_close": prices,
            "volume": rng.integers(1_000_000, 5_000_000, n),
        },
        index=pd.DatetimeIndex(idx, name="date"),
    )
    cache_dir.mkdir(parents=True, exist_ok=True)
    bars.to_parquet(cache_dir / f"{ticker}.parquet")


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    # research_dir is the single source of truth: price_cache_dir derives
    # from it, so seeding here and overriding only get_settings is enough —
    # get_price_cache properly cascades via its own Depends(get_settings).
    _seed_price_series(tmp_path / "price_cache", "SYN")
    test_settings = Settings(research_dir=tmp_path)

    app.dependency_overrides[get_settings] = lambda: test_settings
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


class TestHealthAndModels:
    def test_health(self, client: TestClient) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_models_list_includes_all_seven(self, client: TestClient) -> None:
        response = client.get("/api/models")
        assert response.status_code == 200
        names = {m["name"] for m in response.json()["models"]}
        assert names == ALL_MODEL_NAMES


class TestCompanyInfo:
    def test_returns_cached_info_without_network_call(
        self, client: TestClient, tmp_path: Path
    ) -> None:
        import json

        company_dir = tmp_path / "company_info"
        company_dir.mkdir(parents=True, exist_ok=True)
        (company_dir / "SYN.json").write_text(
            json.dumps(
                {
                    "ticker": "SYN",
                    "name": "Synthetic Corp.",
                    "description": "Makes synthetic test fixtures.",
                    "website": "https://www.synthetic.example",
                    "sector": "Technology",
                    "industry": "Software",
                }
            )
        )

        response = client.get("/api/company/SYN")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Synthetic Corp."
        assert body["description"] == "Makes synthetic test fixtures."
        assert body["website"] == "https://www.synthetic.example"

    def test_corrupted_cache_file_falls_through_to_fetch(
        self, client: TestClient, tmp_path: Path
    ) -> None:
        from unittest.mock import patch

        from data_ingestion.schemas import CompanyInfo

        company_dir = tmp_path / "company_info"
        company_dir.mkdir(parents=True, exist_ok=True)
        (company_dir / "SYN.json").write_text("not valid json")

        fake_info = CompanyInfo(
            ticker="SYN",
            name="Synthetic Corp.",
            description="Makes synthetic test fixtures.",
            website=None,
            sector=None,
            industry=None,
        )
        with patch(
            "data_ingestion.yfinance_client.YFinanceClient.fetch_company_info",
            return_value=fake_info,
        ):
            response = client.get("/api/company/SYN")
        assert response.status_code == 200
        assert response.json()["name"] == "Synthetic Corp."


class TestDataAndFeatures:
    def test_data_endpoint(self, client: TestClient) -> None:
        response = client.get("/api/data/SYN")
        assert response.status_code == 200
        body = response.json()
        assert body["ticker"] == "SYN"
        assert len(body["bars"]) > 0

    def test_features_endpoint(self, client: TestClient) -> None:
        response = client.get("/api/features/SYN")
        assert response.status_code == 200
        assert len(response.json()["rows"]) > 0

    def test_unknown_ticker_returns_404(self, client: TestClient, tmp_path: Path) -> None:
        # Use a client backed by a cache whose underlying fetch always raises
        # (simulating an unknown ticker) rather than hitting the network.
        failing_client = MagicMock()
        failing_client.fetch_history.side_effect = ValueError("No price history for 'NOPE'")
        app.dependency_overrides[get_price_cache] = lambda: ParquetPriceCache(
            cache_dir=tmp_path / "empty_cache", client=failing_client
        )

        response = client.get("/api/data/NOPE")
        assert response.status_code == 404


class TestRegime:
    def test_current_regime(self, client: TestClient) -> None:
        response = client.get("/api/regime/SYN")
        assert response.status_code == 200
        body = response.json()
        assert 0.0 <= body["confidence"] <= 1.0
        assert abs(sum(body["posterior"].values()) - 1.0) < 1e-6

    def test_regime_history(self, client: TestClient) -> None:
        response = client.get("/api/regime/SYN/history")
        assert response.status_code == 200
        assert len(response.json()["points"]) > 0


class TestAnalyze:
    def test_analyze_end_to_end_falls_back_gracefully(self, client: TestClient) -> None:
        # No per-ticker or universal-prior data exists in this isolated test
        # environment, so this also exercises the "no data anywhere" fallback.
        payload = {"ticker": "SYN", "n_sims": 300, "horizon_days": 10}
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert body["ticker"] == "SYN"
        assert body["used_fallback"] is True
        assert body["selected_model"]["model_name"] == "gbm"
        risk = body["risk_analytics"]
        assert risk["expected_shortfall_95"] >= risk["value_at_risk_95"]
        assert len(body["fan_chart"]["horizon_days"]) == 10
        assert sum(body["density"]["counts"]) == 300


class TestForecast:
    def test_explicit_model_skips_explanation(self, client: TestClient) -> None:
        response = client.post(
            "/api/forecast",
            json={
                "ticker": "SYN",
                "model_name": "historical_bootstrap",
                "n_sims": 300,
                "horizon_days": 10,
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["auto_selected"] is False
        assert body["explanation"] is None
        assert body["model"]["model_name"] == "historical_bootstrap"

    def test_auto_select_falls_back_to_gbm_with_explanation(self, client: TestClient) -> None:
        response = client.post(
            "/api/forecast", json={"ticker": "SYN", "n_sims": 300, "horizon_days": 10}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["auto_selected"] is True
        assert body["explanation"] is not None
        assert body["model"]["model_name"] == "gbm"

    def test_unknown_model_returns_404(self, client: TestClient) -> None:
        payload = {
            "ticker": "SYN",
            "model_name": "not_a_real_model",
            "n_sims": 300,
            "horizon_days": 10,
        }
        response = client.post("/api/forecast", json=payload)
        assert response.status_code == 404

    def test_placeholder_model_returns_422(self, client: TestClient) -> None:
        response = client.post(
            "/api/forecast",
            json={"ticker": "SYN", "model_name": "heston", "n_sims": 300, "horizon_days": 10},
        )
        assert response.status_code == 422


class TestBacktest:
    def test_submit_poll_and_history_lifecycle(self, client: TestClient) -> None:
        payload = {
            "ticker": "SYN",
            "train_start": "2021-01-01",
            "train_end": "2021-10-01",
            "test_start": "2021-10-01",
            "test_end": "2022-06-01",
            "horizon_days": 10,
            "n_sims": 100,
            "window_step_days": 15,
            "models": ["gbm"],
        }
        submit_response = client.post("/api/backtest", json=payload)
        assert submit_response.status_code == 200
        job_id = submit_response.json()["job_id"]
        assert submit_response.json()["status"] == "queued"

        final = self._poll_until_terminal(client, job_id)
        assert final["status"] == "done"
        assert final["rankings"] == ["gbm"]

        history_response = client.get("/api/backtest/SYN/history")
        assert history_response.json()["ticker"] == "SYN"
        assert final["run_id"] in history_response.json()["run_ids"]

        performance_response = client.get("/api/backtest/SYN/performance")
        assert performance_response.status_code == 200
        performance_body = performance_response.json()
        assert performance_body["ticker"] == "SYN"
        assert performance_body["used_fallback"] is False
        assert len(performance_body["rows"]) > 0
        assert all(row["model_name"] == "gbm" for row in performance_body["rows"])

        detail_response = client.get(f"/api/backtest/SYN/{final['run_id']}/detail")
        assert detail_response.status_code == 200
        detail_body = detail_response.json()
        assert detail_body["model_name"] == "gbm"
        assert detail_body["available_models"] == ["gbm"]
        assert len(detail_body["points"]) > 0
        first_point = detail_body["points"][0]
        assert first_point["forecast_p5_price"] <= first_point["forecast_median_price"]
        assert first_point["forecast_median_price"] <= first_point["forecast_p95_price"]
        assert 0.0 <= detail_body["coverage_90"] <= 1.0
        assert 0.0 <= detail_body["directional_accuracy"] <= 1.0

    def test_detail_unknown_run_returns_404(self, client: TestClient) -> None:
        response = client.get("/api/backtest/SYN/doesnotexist/detail")
        assert response.status_code == 404

    def test_performance_falls_back_when_no_history(self, client: TestClient) -> None:
        response = client.get("/api/backtest/NEVERBACKTESTED/performance")
        assert response.status_code == 200
        body = response.json()
        assert body["used_fallback"] is True
        assert body["rows"] == []  # no universal_prior.parquet in this isolated test env either

    def test_unknown_job_id_returns_404(self, client: TestClient) -> None:
        response = client.get("/api/backtest/doesnotexist")
        assert response.status_code == 404

    @staticmethod
    def _poll_until_terminal(client: TestClient, job_id: str, timeout_s: float = 15.0) -> dict:
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            status_response = client.get(f"/api/backtest/{job_id}")
            body = status_response.json()
            if body["status"] in ("done", "failed"):
                return body
            time.sleep(0.2)
        raise AssertionError(f"backtest job {job_id} did not finish within {timeout_s}s")


class TestAutomaticTickerAnalysisWorkflow:
    """Covers the auto-backtest-before-forecast workflow: a ticker with no
    history is "stale", triggering its own backtest makes it "fresh" and
    updates the per-ticker lookup table, and a cancelled run leaves no trace
    (so the next `/analyze` call still falls back cleanly)."""

    def test_status_no_history_is_stale(self, client: TestClient) -> None:
        response = client.get("/api/analyze/SYN/status")
        assert response.status_code == 200
        body = response.json()
        assert body["stale"] is True
        assert body["reason"] == "no_history"
        assert body["last_backtest_at"] is None

    def test_status_stale_after_max_age(self, client: TestClient, tmp_path: Path) -> None:
        from datetime import UTC, datetime, timedelta

        settings = Settings(research_dir=tmp_path)
        lookup = get_per_ticker_lookup("SYN", settings)
        old_timestamp = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        lookup.upsert(
            pd.DataFrame(
                [
                    {
                        "regime": "low_vol",
                        "model_name": "gbm",
                        "n_observations": 20,
                        "mean_mae": 1.0,
                        "mean_rmse": 1.5,
                        "mean_crps": 0.8,
                        "coverage_90": 0.9,
                        "coverage_95": 0.95,
                        "directional_accuracy": 0.55,
                        "mean_var_violations": 0.05,
                        "mean_es_95": 0.1,
                        "last_updated": old_timestamp,
                        "source": "ticker_backtest",
                    }
                ]
            )
        )

        response = client.get("/api/analyze/SYN/status")
        body = response.json()
        assert body["stale"] is True
        assert body["reason"] == "stale"
        assert body["last_backtest_at"] is not None

    def test_auto_backtest_makes_status_fresh_and_populates_lookup(
        self, client: TestClient
    ) -> None:
        submit_response = client.post("/api/analyze/SYN/backtest")
        assert submit_response.status_code == 200
        job_id = submit_response.json()["job_id"]

        final = TestBacktest._poll_until_terminal(client, job_id)
        assert final["status"] == "done"
        assert final["stage"] == "done"

        status_response = client.get("/api/analyze/SYN/status")
        status_body = status_response.json()
        assert status_body["stale"] is False
        assert status_body["reason"] == "fresh"

        performance_response = client.get("/api/backtest/SYN/performance")
        performance_body = performance_response.json()
        assert performance_body["used_fallback"] is False
        assert len(performance_body["rows"]) > 0

    def test_cancel_leaves_no_lookup_table_behind(self, client: TestClient) -> None:
        submit_response = client.post("/api/analyze/SYN/backtest")
        job_id = submit_response.json()["job_id"]

        cancel_response = client.post(f"/api/backtest/{job_id}/cancel")
        assert cancel_response.status_code == 200

        deadline = time.monotonic() + 15.0
        body = {}
        while time.monotonic() < deadline:
            body = client.get(f"/api/backtest/{job_id}").json()
            if body["status"] in ("done", "failed", "cancelled"):
                break
            time.sleep(0.1)
        assert body["status"] == "cancelled"

        status_response = client.get("/api/analyze/SYN/status")
        assert status_response.json()["reason"] == "no_history"

    def test_build_auto_backtest_config_splits_train_test_by_fraction(self, tmp_path: Path) -> None:
        cache_dir = tmp_path / "price_cache"
        _seed_price_series(cache_dir, "SYN", n=1600)
        settings = Settings(research_dir=tmp_path, auto_backtest_test_fraction=0.3)
        cache = ParquetPriceCache(cache_dir=cache_dir)

        config = build_auto_backtest_config("SYN", settings, cache)

        assert config.ticker == "SYN"
        assert config.train_start < config.test_start < config.test_end
        assert config.train_end == config.test_start
        assert config.n_sims == settings.auto_backtest_n_sims
        assert config.window_step_days == settings.auto_backtest_window_step_days

    def test_cancel_unknown_job_returns_404(self, client: TestClient) -> None:
        response = client.post("/api/backtest/doesnotexist/cancel")
        assert response.status_code == 404

    def test_cancel_already_finished_job_returns_false(self, client: TestClient) -> None:
        submit_response = client.post(
            "/api/backtest",
            json={
                "ticker": "SYN",
                "train_start": "2021-01-01",
                "train_end": "2021-10-01",
                "test_start": "2021-10-01",
                "test_end": "2022-06-01",
                "horizon_days": 10,
                "n_sims": 100,
                "window_step_days": 30,
                "models": ["gbm"],
            },
        )
        job_id = submit_response.json()["job_id"]
        TestBacktest._poll_until_terminal(client, job_id)

        cancel_response = client.post(f"/api/backtest/{job_id}/cancel")
        assert cancel_response.json() == {"job_id": job_id, "cancelled": False}


class TestRecommendationsDivergeAcrossTickers:
    """The whole point of the auto-backtest workflow: once two tickers each
    have their own per-ticker performance history, model selection should be
    able to pick different winners for them instead of both landing on
    whatever the universal prior favors (previously: egarch, almost always)."""

    def test_different_per_ticker_history_yields_different_recommendations(
        self, tmp_path: Path
    ) -> None:
        settings = Settings(research_dir=tmp_path)
        regime = RegimeResult(
            ticker="A",
            as_of=pd.Timestamp("2024-01-01").date(),
            label=RegimeLabel.LOW_VOL,
            confidence=0.9,
            posterior={RegimeLabel.LOW_VOL: 0.9},
            raw_state_id=0,
            method="hmm",
            n_states_fit=5,
        )

        def _rows(best_model: str, worst_model: str) -> pd.DataFrame:
            def row(model_name: str, mean_crps: float) -> dict[str, object]:
                return {
                    "regime": "low_vol",
                    "model_name": model_name,
                    "n_observations": 20,
                    "mean_mae": mean_crps,
                    "mean_rmse": mean_crps,
                    "mean_crps": mean_crps,
                    "coverage_90": 0.9,
                    "coverage_95": 0.95,
                    "directional_accuracy": 0.55,
                    "mean_var_violations": 0.05,
                    "mean_es_95": 0.1,
                    "last_updated": "2024-01-01",
                    "source": "ticker_backtest",
                }

            return pd.DataFrame([row(best_model, 0.5), row(worst_model, 5.0)])

        get_per_ticker_lookup("TICKERA", settings).upsert(_rows("gbm", "historical_bootstrap"))
        get_per_ticker_lookup("TICKERB", settings).upsert(_rows("historical_bootstrap", "gbm"))

        rec_a = recommend_model("TICKERA", regime, settings)
        rec_b = recommend_model("TICKERB", regime, settings)

        assert rec_a.used_fallback is False
        assert rec_b.used_fallback is False
        assert rec_a.recommended[0] == "gbm"
        assert rec_b.recommended[0] == "historical_bootstrap"
        assert rec_a.recommended[0] != rec_b.recommended[0]
