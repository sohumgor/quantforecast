"use client";

import { useMode, type DashboardMode } from "@/lib/hooks/useMode";

const OPTIONS: DashboardMode[] = ["simple", "advanced"];

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 p-1 dark:border-zinc-800">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setMode(option)}
          aria-pressed={mode === option}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
            mode === option
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
