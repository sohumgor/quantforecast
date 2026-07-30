"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardMode = "simple" | "advanced";

interface ModeContextValue {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);
const STORAGE_KEY = "qfp-dashboard-mode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode>("simple");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "simple" || stored === "advanced") {
      // Deliberately synchronous: localStorage doesn't exist during SSR, so
      // the persisted preference can only be read after mount — the
      // standard hydration-safe pattern for browser-only state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeState(stored);
    }
  }, []);

  function setMode(next: DashboardMode) {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  function toggleMode() {
    setMode(mode === "simple" ? "advanced" : "simple");
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>{children}</ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx;
}
