// Mirrors backend/api/schemas/backtest.py

export interface BacktestRequest {
  ticker: string;
  train_start: string;
  train_end: string;
  test_start: string;
  test_end: string;
  horizon_days: number;
  n_sims: number;
  models?: string[] | null;
  window_step_days?: number;
}

export type BacktestJobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

// Mirrors the `stage` values `BacktestEngine.run` reports via `on_progress`.
export type BacktestStage =
  | "downloading_prices"
  | "detecting_regime"
  | "running_backtests"
  | "aggregating_results"
  | "done";

export interface BacktestJobResponse {
  job_id: string;
  status: BacktestJobStatus;
}

export interface BacktestResultResponse {
  job_id: string;
  status: BacktestJobStatus;
  run_id: string | null;
  rankings: string[] | null;
  error: string | null;
  stage: BacktestStage | null;
  progress: [number, number] | null;
}

export interface CancelJobResponse {
  job_id: string;
  cancelled: boolean;
}

export interface BacktestHistoryResponse {
  ticker: string;
  run_ids: string[];
}

export interface PerformanceRow {
  regime: string;
  model_name: string;
  n_observations: number;
  mean_mae: number;
  mean_rmse: number;
  mean_crps: number;
  coverage_90: number;
  coverage_95: number;
  directional_accuracy: number;
  mean_var_violations: number;
  mean_es_95: number;
  source: string;
}

export interface PerformanceTableResponse {
  ticker: string;
  used_fallback: boolean;
  rows: PerformanceRow[];
}

export interface BacktestWindowPoint {
  window_origin: string;
  actual_price: number;
  forecast_median_price: number;
  forecast_p5_price: number;
  forecast_p95_price: number;
  regime: string | null;
}

export interface BacktestDetailResponse {
  ticker: string;
  run_id: string;
  model_name: string;
  model_display_name: string;
  available_models: string[];
  points: BacktestWindowPoint[];
  mean_absolute_pct_error: number;
  coverage_90: number;
  directional_accuracy: number;
}
