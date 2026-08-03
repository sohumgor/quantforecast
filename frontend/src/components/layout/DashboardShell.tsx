"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";


interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            onClick={() => setMobileOpen(false)}
          >
            QuantForecast
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-zinc-500 dark:text-zinc-400 sm:flex">
            <Link href="/models" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Models
            </Link>
            <Link
              href="/backtest"
              className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Backtest
            </Link>
            <Link
              href="/analyze"
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.03] hover:bg-zinc-700 active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Analyze
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 sm:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              {mobileOpen ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5.5h14M3 10h14M3 14.5h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen ? (
          <nav className="flex flex-col gap-1 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300 sm:hidden">
            <Link
              href="/models"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-2 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Models
            </Link>
            <Link
              href="/backtest"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-2 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Backtest
            </Link>
            <Link
              href="/analyze"
              onClick={() => setMobileOpen(false)}
              className="mt-1 rounded-full bg-zinc-900 px-4 py-2 text-center font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Analyze
            </Link>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
