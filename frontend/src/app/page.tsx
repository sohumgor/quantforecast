import Link from "next/link";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { TickerSearchBar } from "@/components/layout/TickerSearchBar";

export default function Home() {
  return (
    <DashboardShell>
      <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
        <main className="flex w-full max-w-lg flex-col items-center gap-8 sm:gap-10">
          <div className="flex flex-col items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-600 sm:text-xs sm:tracking-[0.2em]">
              Quantitative Forecasting &amp; Risk Analysis
            </span>
            <h1 className="break-words text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              QuantForecastPlatform
            </h1>
            <p className="max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:max-w-sm">
              Regime-aware Monte Carlo forecasting and probabilistic risk
              analytics for any publicly traded ticker &mdash; statistical
              rigor, not price predictions.
            </p>
          </div>

          <TickerSearchBar />

          <div className="flex items-center gap-5 text-xs text-zinc-400 dark:text-zinc-600">
            <Link href="/models" className="transition hover:text-zinc-700 dark:hover:text-zinc-300">
              Model catalog
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/backtest" className="transition hover:text-zinc-700 dark:hover:text-zinc-300">
              Run a backtest
            </Link>
          </div>
        </main>
      </div>
    </DashboardShell>
  );
}
