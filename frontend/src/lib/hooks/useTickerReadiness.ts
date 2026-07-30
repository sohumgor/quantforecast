"use client";

import { useEffect, useReducer, useRef } from "react";
import type { AnalysisStalenessReason, BacktestStage } from "@shared/types";

import { getAnalysisStatus, submitAutoBacktest } from "@/lib/api/analysis";
import { cancelBacktestJob, getBacktestStatus } from "@/lib/api/backtest";

const POLL_INTERVAL_MS = 1000;

export type ReadinessPhase = "checking" | "backtesting" | "ready";

interface ReadinessState {
  phase: ReadinessPhase;
  reason: AnalysisStalenessReason | null;
  stage: BacktestStage | null;
  progress: [number, number] | null;
  cancelling: boolean;
}

type ReadinessAction =
  | { type: "reset" }
  | { type: "statusChecked"; stale: boolean; reason: AnalysisStalenessReason }
  | { type: "jobUpdate"; stage: BacktestStage | null; progress: [number, number] | null }
  // Any terminal outcome (backtest done/failed/cancelled, submitting it
  // failing outright, or the pre-flight status check itself erroring) —
  // always falls through to rendering the dashboard, which drives
  // `/analyze`'s own, already-robust fallback path.
  | { type: "terminal" }
  | { type: "cancelling" };

const INITIAL_STATE: ReadinessState = {
  phase: "checking",
  reason: null,
  stage: null,
  progress: null,
  cancelling: false,
};

function reducer(state: ReadinessState, action: ReadinessAction): ReadinessState {
  switch (action.type) {
    case "reset":
      return INITIAL_STATE;
    case "statusChecked":
      return action.stale
        ? { ...state, phase: "backtesting", reason: action.reason }
        : { ...state, phase: "ready", reason: action.reason };
    case "jobUpdate":
      return { ...state, stage: action.stage, progress: action.progress };
    case "terminal":
      return { ...state, phase: "ready" };
    case "cancelling":
      return { ...state, cancelling: true };
  }
}

interface UseTickerReadinessResult {
  /** Whether the dashboard is safe to render yet. */
  ready: boolean;
  /** True while the automatic ticker-specific backtest is running. */
  runningBacktest: boolean;
  reason: AnalysisStalenessReason | null;
  stage: BacktestStage | null;
  progress: [number, number] | null;
  cancelling: boolean;
  /** Skips the backtest and proceeds with whatever recommendation is
   * currently available (per-ticker history if any, else the universal
   * prior) — the same fallback path a failed or insufficient backtest
   * takes. */
  cancel: () => void;
}

/** Orchestrates the pre-flight workflow described in the model-selection
 * upgrade: before a ticker's dashboard renders, checks whether its
 * per-ticker backtest history is fresh; if not, triggers and polls the
 * automatic backtest (real stage/progress from the backend, not a client
 * timer) so `/analyze` picks a model grounded in this ticker's own history
 * instead of defaulting to the universal prior. Runs once per `ticker`
 * change — horizon or other in-dashboard changes should keep using
 * `useAnalysis` directly, not re-trigger this.
 */
export function useTickerReadiness(ticker: string): UseTickerReadinessResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollHandle: ReturnType<typeof setInterval> | null = null;
    jobIdRef.current = null;
    dispatch({ type: "reset" });

    function stopPolling() {
      if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
    }

    async function pollJob(jobId: string) {
      try {
        const status = await getBacktestStatus(jobId);
        if (cancelled) return;
        dispatch({ type: "jobUpdate", stage: status.stage, progress: status.progress });
        const isTerminal =
          status.status === "done" || status.status === "failed" || status.status === "cancelled";
        if (isTerminal) {
          stopPolling();
          dispatch({ type: "terminal" });
        }
      } catch {
        if (cancelled) return;
        stopPolling();
        dispatch({ type: "terminal" }); // still fall through to /analyze's own fallback
      }
    }

    async function start() {
      let status;
      try {
        status = await getAnalysisStatus(ticker);
      } catch {
        if (cancelled) return;
        dispatch({ type: "terminal" });
        return;
      }
      if (cancelled) return;
      dispatch({ type: "statusChecked", stale: status.stale, reason: status.reason });
      if (!status.stale) return;

      try {
        const job = await submitAutoBacktest(ticker);
        if (cancelled) return;
        jobIdRef.current = job.job_id;
        void pollJob(job.job_id);
        pollHandle = setInterval(() => void pollJob(job.job_id), POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        // Submitting the backtest itself failed (e.g. insufficient history) —
        // fall through to /analyze, which falls back to the universal prior.
        dispatch({ type: "terminal" });
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [ticker]);

  function cancel() {
    const jobId = jobIdRef.current;
    if (!jobId || state.cancelling) return;
    dispatch({ type: "cancelling" });
    void cancelBacktestJob(jobId).finally(() => {
      dispatch({ type: "terminal" });
    });
  }

  return {
    ready: state.phase === "ready",
    runningBacktest: state.phase === "backtesting",
    reason: state.reason,
    stage: state.stage,
    progress: state.progress,
    cancelling: state.cancelling,
    cancel,
  };
}
