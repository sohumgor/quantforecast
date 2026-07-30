# QuantForecastPlatform

An adaptive quantitative forecasting and risk-analysis platform for publicly
traded equities. It downloads historical price data, engineers statistical
features, detects the current market regime with unsupervised learning,
determines which stochastic forecasting model has historically performed best
in similar regimes, runs probabilistic Monte Carlo simulations, and reports
risk analytics — all with statistical rigor rather than price predictions.

This is **not** a chatbot and does not use any LLM anywhere in the
forecasting/regime/analytics engine.

## Tech stack

- **Backend**: FastAPI, Python, scikit-learn, hmmlearn, arch, statsmodels,
  numpy, scipy, pandas, yfinance. Environment managed with [`uv`](https://docs.astral.sh/uv/).
- **Frontend**: Next.js (App Router), TypeScript, React, Tailwind CSS, Plotly.
  Package manager: [`pnpm`](https://pnpm.io/).
- No database, no authentication, no user accounts — everything runs locally.
  Persistence is flat files (Parquet) under `research/`.

## What it does

1. **Data ingestion** — pulls OHLCV history from `yfinance`, cached to Parquet
   (`research/price_cache/`) with atomic writes and corruption-resilient reads.
2. **Feature engineering** — returns, rolling/realized volatility, momentum,
   drawdown, autocorrelation, Sharpe/Sortino, skew/kurtosis, liquidity stats.
3. **Regime detection** — a `hmmlearn` Gaussian HMM (primary) and a
   `scikit-learn` GMM (secondary comparison) classify the current market
   regime (Low/Medium/High Volatility, Trending, Sideways, Stress/Crisis) and
   persist the full historical regime timeline.
4. **Forecasting models** — five fully implemented, self-registering models
   behind a shared `ForecastModel` protocol: Geometric Brownian Motion,
   GARCH(1,1), EGARCH, Merton Jump Diffusion, and Historical Bootstrap.
   (Heston and Regime-Switching are scaffolded but intentionally left as
   `is_implemented=False` placeholders — the `/models` page shows them as
   "Coming soon" rather than fabricating results.)
5. **Backtesting** — expanding-window walk-forward evaluation of every model
   across historical windows, scored on CRPS, RMSE, directional accuracy,
   interval coverage, and VaR violations.
6. **Model selection** — a deterministic (non-LLM) engine that recommends the
   best-performing model for the ticker's current regime, falling back to a
   pre-computed cross-ticker "universal prior" when a ticker has no backtest
   history yet, with a human-readable explanation of the recommendation.
7. **Risk analytics** — VaR, Expected Shortfall, drawdown distribution, and
   full return-distribution summaries from the simulated paths.
8. **Dashboard** — a Next.js frontend with Simple Mode (plain-language
   summary, confidence cone, key risk numbers) and Advanced Mode (full Monte
   Carlo fan chart, model coefficients, regime posterior, model-comparison
   heatmap), plus a `/models` catalog page and a `/backtest` page to run and
   inspect backtests interactively.

## Running locally (native)

Requires Python 3.13+ with [`uv`](https://docs.astral.sh/uv/) and Node.js
with [`pnpm`](https://pnpm.io/).

```bash
# Backend — http://localhost:8000
cd backend
uv sync
uv run uvicorn api.main:app --reload --port 8000
```

```bash
# Frontend — http://localhost:3000 (in a second terminal)
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3000, enter a ticker (e.g. `AAPL`, `MSFT`, `SPY`), and
the dashboard will call the backend's `/api/analyze` endpoint for the full
pipeline. The frontend reads the backend's base URL from
`NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000` if unset).

The first request for a new ticker fetches and caches its full price history
from Yahoo Finance, so it can take a few seconds; subsequent requests are
fast (Parquet cache hit).

## Running locally (Docker Compose)

```bash
docker compose up --build
```

This builds and runs both services (backend on `:8000`, frontend on `:3000`);
`./research` is bind-mounted into the backend container so the price cache,
regime timelines, backtest results, and model-selection lookup tables persist
across container restarts.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | liveness check |
| `/api/data/{ticker}` | GET | raw OHLCV history |
| `/api/features/{ticker}` | GET | engineered feature set |
| `/api/regime/{ticker}` | GET | current regime + posterior |
| `/api/regime/{ticker}/history` | GET | full historical regime timeline |
| `/api/models` | GET | registered model catalog + metadata |
| `/api/forecast` | POST | run one model (auto-select if `model_name` omitted) |
| `/api/analyze` | POST | full pipeline: data → features → regime → recommendation → simulation → risk analytics → chart payloads |
| `/api/backtest` | POST | submit a backtest job, returns `{job_id}` |
| `/api/backtest/{job_id}` | GET | poll job status/result |
| `/api/backtest/{ticker}/history` | GET | past backtest runs for a ticker |
| `/api/backtest/{ticker}/performance` | GET | per-regime performance table for a ticker |

Interactive OpenAPI docs are available at http://localhost:8000/docs while
the backend is running.

## Tests & linting

```bash
# Backend
cd backend
uv run pytest
uv run ruff check .
uv run mypy .

# Frontend
cd frontend
pnpm lint
pnpm build
```

All of the above pass clean as of the current state of the repo (111 backend
tests, ruff/mypy clean across 78 source files; frontend lint clean, and
`pnpm build` produces a working production bundle).

## Project structure

```
backend/
  api/                FastAPI app, routers, DI, Pydantic schemas, in-process job store
  data_ingestion/      yfinance client + Parquet read-through price cache
  feature_engineering/ Returns, volatility, momentum, drawdown, distribution stats, etc.
  regime_detection/    HMM (primary) + GMM (secondary) regime classifiers, timeline builder
  forecasting_models/  ForecastModel protocol + plugin registry + 7 model implementations
  model_selection/     Deterministic recommendation engine + explanation builder
  simulation/          Monte Carlo path runner
  analytics/           VaR, CVaR/ES, drawdown, distribution summaries
  backtesting/         Walk-forward windowing, metrics, results store, feedback loop
  visualization/       JSON-safe Plotly payload serializers
  tests/               pytest suite mirroring the module tree

frontend/
  src/app/             Next.js App Router pages: /, /analyze/[ticker], /models, /backtest
  src/components/      charts/ (Plotly), panels/, layout/, tooltip/, ui/ primitives
  src/lib/             typed API client, React hooks (useAnalysis, useBacktestJob, useMode)
  src/styles/          design tokens (light/dark chart color scales)

shared/types/          Hand-written TypeScript mirrors of backend Pydantic schemas
research/              Flat-file "database": price cache, regime timelines,
                       backtest results, model-selection lookup tables
documentation/         Architecture, API reference, metrics glossary, model methodology
docker-compose.yml     Two-service local orchestration (backend + frontend)
```

## Design notes

- Regime detection and model selection are deliberately separate,
  composable stages: the HMM/GMM never picks a forecasting model directly —
  it only classifies the regime, and a deterministic scoring engine does the
  picking based on stored backtest performance.
- `backtesting` and `model_selection` never import each other; they interact
  only through the on-disk performance lookup table, so ranking logic stays
  a `model_selection` concern.
- Everything is typed end-to-end: Python type hints + Pydantic schemas on the
  backend, TypeScript strict mode + hand-written mirror types on the
  frontend.
