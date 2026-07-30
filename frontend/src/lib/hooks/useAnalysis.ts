"use client";

import { useEffect, useReducer, useState } from "react";
import type { AnalysisResponse } from "@shared/types";

import { analyze } from "@/lib/api/analysis";
import { ApiError } from "@/lib/api/client";

interface UseAnalysisOptions {
  n_sims?: number;
  horizon_days?: number;
  /** When false, holds off calling `/analyze` entirely (state stays at its
   * initial loading value). Used to block the first fetch for a ticker
   * until its pre-flight backtest workflow (see `useTickerReadiness`) has
   * finished, so `/analyze` always sees a fresh per-ticker lookup table
   * instead of racing it. Defaults to true. */
  enabled?: boolean;
}

interface UseAnalysisResult {
  data: AnalysisResponse | null;
  loading: boolean;
  /** True while a later fetch (e.g. a horizon change) is in flight but
   * `data` still holds the previous result — lets the UI keep the dashboard
   * on screen and just dim/transition it, instead of a full-page skeleton. */
  refetching: boolean;
  error: string | null;
  refetch: () => void;
}

interface FetchState {
  data: AnalysisResponse | null;
  loading: boolean;
  refetching: boolean;
  error: string | null;
}

type FetchAction =
  | { type: "start"; hadData: boolean }
  | { type: "success"; data: AnalysisResponse }
  | { type: "error"; message: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "start":
      return action.hadData
        ? { ...state, refetching: true, error: null }
        : { data: null, loading: true, refetching: false, error: null };
    case "success":
      return { data: action.data, loading: false, refetching: false, error: null };
    case "error":
      return { ...state, loading: false, refetching: false, error: action.message };
  }
}

const INITIAL_STATE: FetchState = { data: null, loading: true, refetching: false, error: null };

export function useAnalysis(ticker: string, options?: UseAnalysisOptions): UseAnalysisResult {
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const [refetchToken, setRefetchToken] = useState(0);
  const nSims = options?.n_sims;
  const horizonDays = options?.horizon_days;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    dispatch({ type: "start", hadData: state.data !== null });

    analyze({ ticker, n_sims: nSims, horizon_days: horizonDays })
      .then((result) => {
        if (!cancelled) dispatch({ type: "success", data: result });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong.";
        dispatch({ type: "error", message });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `state.data` is read only to decide skeleton-vs-dim, not a dependency of the fetch itself
  }, [ticker, nSims, horizonDays, refetchToken, enabled]);

  return {
    data: state.data,
    loading: state.loading,
    refetching: state.refetching,
    error: state.error,
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
