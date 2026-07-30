"use client";

import { useEffect, useReducer, type DependencyList } from "react";

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type ResourceAction<T> =
  | { type: "start" }
  | { type: "success"; data: T }
  | { type: "error"; message: string };

function resourceReducer<T>(state: ResourceState<T>, action: ResourceAction<T>): ResourceState<T> {
  switch (action.type) {
    case "start":
      return { data: null, loading: true, error: null };
    case "success":
      return { data: action.data, loading: false, error: null };
    case "error":
      return { data: null, loading: false, error: action.message };
  }
}

/** Generic fetch-on-mount/dep-change hook for simple GET-and-display data
 * (used for regime history and feature rows on the analyze page). Callers
 * own the dependency list, same escape hatch data-fetching libraries use. */
export function useApiResource<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList,
): ResourceState<T> {
  const [state, dispatch] = useReducer(resourceReducer<T>, {
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "start" });

    fetchFn()
      .then((result) => {
        if (!cancelled) dispatch({ type: "success", data: result });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({ type: "error", message: err instanceof Error ? err.message : "Something went wrong." });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns `deps`
  }, deps);

  return state;
}
