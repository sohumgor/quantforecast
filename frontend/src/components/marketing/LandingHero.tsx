import Link from "next/link";

import { TickerSearchBar } from "@/components/layout/TickerSearchBar";

import { HeroBackground } from "./HeroBackground";

const METHODS = ["GARCH", "EGARCH", "Monte Carlo", "Historical Backtesting", "Regime Detection"];

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-black/[.06] bg-gradient-to-b from-white to-zinc-50/60 px-4 py-16 dark:border-white/[.08] dark:from-zinc-950 dark:to-black sm:px-6 sm:py-24">
      <HeroBackground />

      <div className="relative flex flex-col items-center gap-8 text-center sm:gap-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/[.08] bg-white/70 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 backdrop-blur dark:border-white/[.1] dark:bg-white/5 dark:text-zinc-400">
          Quantitative Forecasting &amp; Risk Analysis
        </span>

        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Probability-based forecasts,
          <br className="hidden sm:block" /> not price predictions.
        </h1>

        <p className="max-w-lg text-balance text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:max-w-xl sm:text-lg">
          MarketLens runs regime-aware Monte Carlo simulations and
          historically validated models against any publicly traded ticker —
          built on statistical rigor, not guesswork.
        </p>

        <div id="analyze" className="w-full max-w-lg scroll-mt-24">
          <TickerSearchBar />
        </div>

        <div className="flex items-center gap-5 text-xs text-zinc-400 dark:text-zinc-600">
          <Link href="/models" className="transition hover:text-zinc-700 dark:hover:text-zinc-300">
            Model catalog
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/backtest" className="transition hover:text-zinc-700 dark:hover:text-zinc-300">
            Run a backtest
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 pt-2 text-[11px] text-zinc-400 dark:text-zinc-600">
          {METHODS.map((method, i) => (
            <span key={method} className="flex items-center gap-2.5">
              <span className="font-mono uppercase tracking-wide">{method}</span>
              {i < METHODS.length - 1 ? <span aria-hidden="true">·</span> : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
