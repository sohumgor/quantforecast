"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { TickerSearchBar } from "@/components/layout/TickerSearchBar";
import { HeroBackground } from "@/components/marketing/HeroBackground";
import { Reveal } from "@/components/marketing/Reveal";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCompanyInfo } from "@/lib/api/company";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { domainFromUrl } from "@/lib/interpret/format";
import { getRecentSearches, timeAgo, type RecentSearch } from "@/lib/recentSearches";

const EXPLORE_GROUPS = [
  { label: "Popular", tickers: ["AAPL", "MSFT", "NVDA", "AMZN"] },
  { label: "Index & ETFs", tickers: ["SPY", "QQQ", "DIA", "VTI"] },
  { label: "Volatile & growth", tickers: ["TSLA", "COIN", "PLTR", "RIVN"] },
];

export default function ExplorePage() {
  // Recents live in localStorage, which doesn't exist during SSR — read
  // after mount, same hydration-safe pattern as the color-scheme/mode hooks
  // elsewhere in this app.
  const [recents, setRecents] = useState<RecentSearch[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(getRecentSearches());
  }, []);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-14">
        <section className="relative isolate overflow-hidden rounded-3xl border border-black/[.06] bg-gradient-to-b from-white to-zinc-50/60 px-4 py-14 dark:border-white/[.08] dark:from-zinc-950 dark:to-black sm:px-6 sm:py-20">
          <HeroBackground />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[.08] bg-white/70 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 backdrop-blur dark:border-white/[.1] dark:bg-white/5 dark:text-zinc-400">
              Explore
            </span>
            <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              What do you want to analyze?
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
              Type any ticker for a full probabilistic forecast, or jump back into a recent search
              below.
            </p>
            <div className="w-full max-w-lg">
              <TickerSearchBar />
            </div>
          </div>
        </section>

        {recents && recents.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-600">
              Recent searches
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recents.map((entry, i) => (
                <Reveal key={entry.ticker} delay={i * 60}>
                  <RecentSearchCard entry={entry} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-600">
            More to explore
          </h2>
          <div className="flex flex-col gap-4">
            {EXPLORE_GROUPS.map((group) => (
              <div
                key={group.label}
                className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="shrink-0 text-sm font-medium text-zinc-500 sm:w-36 dark:text-zinc-400">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.tickers.map((ticker) => (
                    <Link
                      key={ticker}
                      href={`/analyze/${ticker}`}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 font-mono text-xs text-zinc-600 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                    >
                      {ticker}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function RecentSearchCard({ entry }: { entry: RecentSearch }) {
  const company = useApiResource(() => getCompanyInfo(entry.ticker), [entry.ticker]);

  return (
    <Link
      href={`/analyze/${entry.ticker}`}
      className="group flex items-center gap-3 rounded-2xl border border-black/[.06] bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-white/[.08] dark:bg-zinc-950"
    >
      {company.loading ? (
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10" />
      ) : (
        <CompanyLogo
          domain={domainFromUrl(company.data?.website ?? null)}
          name={company.data?.name ?? entry.ticker}
          size={40}
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {company.data?.name ?? entry.ticker}
        </p>
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
          {entry.ticker} · {timeAgo(entry.viewedAt)}
        </p>
      </div>
    </Link>
  );
}
