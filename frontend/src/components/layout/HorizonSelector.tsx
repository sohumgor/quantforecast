"use client";

import { FORECAST_HORIZONS, horizonUnreliableReason, isHorizonReliable } from "@/lib/interpret/horizon";

interface HorizonSelectorProps {
  value: number;
  onChange: (days: number) => void;
  /** Trading days of price history available for this ticker; `null` while
   * still loading, in which case no option is disabled yet to avoid flicker. */
  historyDays: number | null;
  tickerSymbol: string;
}

export function HorizonSelector({
  value,
  onChange,
  historyDays,
  tickerSymbol,
}: HorizonSelectorProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
      {FORECAST_HORIZONS.map((option) => {
        const reliable = historyDays === null || isHorizonReliable(historyDays, option.days);
        const active = option.days === value;
        return (
          <button
            key={option.days}
            type="button"
            disabled={!reliable}
            onClick={() => onChange(option.days)}
            aria-pressed={active}
            title={reliable ? undefined : horizonUnreliableReason(historyDays ?? 0, option.days, tickerSymbol)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              !reliable
                ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                : active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
