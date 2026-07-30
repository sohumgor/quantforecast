"use client";

import { useEffect, useReducer, useRef } from "react";
import type { BacktestResultResponse } from "@shared/types";

import { getBacktestStatus } from "@/lib/api/backtest";

const POLL_INTERVAL_MS = 1500;

interface UseBacktestJobResult {
  result: BacktestResultResponse | null;
  error: string | null;
  isPolling: boolean;
}

interface PollState {
  result: BacktestResultResponse | null;
  error: string | null;
}

type PollAction =
  | { type: "reset" }
  | { type: "update"; result: BacktestResultResponse }
  | { type: "error"; message: string };

function pollReducer(state: PollState, action: PollAction): PollState {
  switch (action.type) {
    case "reset":
      return { result: null, error: null };
    case "update":
      return { result: action.result, error: null };
    case "error":
      return { ...state, error: action.message };
  }
}

export function useBacktestJob(jobId: string | null): UseBacktestJobResult {
  const [state, dispatch] = useReducer(pollReducer, { result: null, error: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dispatch({ type: "reset" });
    if (!jobId) {
      return;
    }

    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const status = await getBacktestStatus(jobId as string);
        if (cancelled) return;
        dispatch({ type: "update", result: status });
        if (status.status === "done" || status.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: "error", message: err instanceof Error ? err.message : "Polling failed." });
        }
      }
    }

    void poll();
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  const { result, error } = state;
  const isPolling = jobId !== null && (result === null || !["done", "failed"].includes(result.status));

  return { result, error, isPolling };
}
