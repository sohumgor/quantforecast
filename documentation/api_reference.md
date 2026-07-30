# API Reference

All endpoints are implemented. Full request/response schemas live in `backend/api/schemas/`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Liveness check. |
| `/api/data/{ticker}` | GET | Raw OHLCV history. Query params: `start`, `end` (ISO dates, default to a 5-year lookback). |
| `/api/features/{ticker}` | GET | Engineered feature set (one row per date) plus the latest row and a column→description glossary. |
| `/api/regime/{ticker}` | GET | Current market regime classification: label, confidence, full posterior over regimes, raw HMM state ID. |
| `/api/regime/{ticker}/history` | GET | Full historical regime timeline (one label+confidence per date), persisted to `research/regime_timelines/{TICKER}.parquet`. |
| `/api/models` | GET | Catalog of all 7 registered forecasting models with metadata (`is_implemented`, category, description). |
| `/api/forecast` | POST | Runs one model (`model_name` optional — omit to auto-select via `ModelSelectionEngine`). Returns calibrated params, risk analytics, and chart payloads. `explanation` is populated only when auto-selected. Sync. |
| `/api/analyze` | POST | The "do everything" endpoint: data → features → regime → recommendation → simulation → risk analytics → chart payloads, in one call. Sync. |
| `/api/backtest` | POST | Submits a backtest as a background job; returns `{job_id, status: "queued"}` immediately. |
| `/api/backtest/{job_id}` | GET | Poll job status (`queued`/`running`/`done`/`failed`); returns `run_id` + model rankings once done. |
| `/api/backtest/{ticker}/history` | GET | Lists past backtest run IDs for a ticker, from `research/backtests/`. |

## Design notes

- **Sync vs. async**: single-ticker analysis (`/analyze`, `/forecast`) stays synchronous — a
  few thousand simulated paths over a horizon of months completes in low single-digit
  seconds locally. Backtests use an in-process job store (`api/jobs.py`, a
  `ThreadPoolExecutor` + in-memory dict) rather than sync, since a multi-window,
  multi-model backtest can take longer. No external queue (Celery/Redis) — unnecessary
  for a local single-user app. Job state is lost on server restart; an accepted
  trade-off at this scope.
- **Graceful cold-start**: if a ticker has no per-ticker backtest history, `ModelSelectionEngine`
  falls back to the shipped universal prior (`research/lookup_tables/universal_prior.parquet`).
  If even the universal prior has no data for the ticker's *current* regime (a real
  possibility — only regimes actually observed in the offline basket backtest are present),
  `/analyze` and auto-selecting `/forecast` fall back further to a hardcoded GBM baseline
  with an explanatory note, rather than erroring.
- **Shared orchestration**: `api/orchestration.py` centralizes the fetch→features→regime→
  recommend→simulate pipeline so `analysis.py` and `forecast.py` routers stay thin
  controllers with no duplicated business logic.
