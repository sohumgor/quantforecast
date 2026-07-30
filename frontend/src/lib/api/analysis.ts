import type {
  AnalysisResponse,
  AnalysisStatusResponse,
  AnalyzeRequest,
  BacktestJobResponse,
} from "@shared/types";

import { apiGet, apiPost } from "./client";

export function analyze(request: AnalyzeRequest): Promise<AnalysisResponse> {
  return apiPost<AnalysisResponse>("/api/analyze", request);
}

export function getAnalysisStatus(ticker: string): Promise<AnalysisStatusResponse> {
  return apiGet<AnalysisStatusResponse>(`/api/analyze/${encodeURIComponent(ticker)}/status`);
}

/** Triggers the automatic, ticker-specific backtest that grounds model
 * selection in this ticker's own history — the same async job the manual
 * `/backtest` form submits, just with a config computed from the ticker
 * alone. Poll its status via `getBacktestStatus`. */
export function submitAutoBacktest(ticker: string): Promise<BacktestJobResponse> {
  return apiPost<BacktestJobResponse>(
    `/api/analyze/${encodeURIComponent(ticker)}/backtest`,
    undefined,
  );
}
