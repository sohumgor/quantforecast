import type {
  BacktestDetailResponse,
  BacktestHistoryResponse,
  BacktestJobResponse,
  BacktestRequest,
  BacktestResultResponse,
  CancelJobResponse,
  PerformanceTableResponse,
} from "@shared/types";

import { apiGet, apiPost } from "./client";

export function submitBacktest(request: BacktestRequest): Promise<BacktestJobResponse> {
  return apiPost<BacktestJobResponse>("/api/backtest", request);
}

export function getBacktestStatus(jobId: string): Promise<BacktestResultResponse> {
  return apiGet<BacktestResultResponse>(`/api/backtest/${encodeURIComponent(jobId)}`);
}

export function cancelBacktestJob(jobId: string): Promise<CancelJobResponse> {
  return apiPost<CancelJobResponse>(`/api/backtest/${encodeURIComponent(jobId)}/cancel`, undefined);
}

export function getBacktestHistory(ticker: string): Promise<BacktestHistoryResponse> {
  return apiGet<BacktestHistoryResponse>(`/api/backtest/${encodeURIComponent(ticker)}/history`);
}

export function getBacktestPerformance(ticker: string): Promise<PerformanceTableResponse> {
  return apiGet<PerformanceTableResponse>(
    `/api/backtest/${encodeURIComponent(ticker)}/performance`,
  );
}

export function getBacktestDetail(
  ticker: string,
  runId: string,
  modelName?: string,
): Promise<BacktestDetailResponse> {
  const query = modelName ? `?model_name=${encodeURIComponent(modelName)}` : "";
  return apiGet<BacktestDetailResponse>(
    `/api/backtest/${encodeURIComponent(ticker)}/${encodeURIComponent(runId)}/detail${query}`,
  );
}
