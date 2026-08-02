"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLE_TICKERS = ["AAPL", "MSFT", "SPY", "NVDA"] as const;

export function TickerSearchBar() {
  const [ticker, setTicker] = useState("");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/analyze/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 shadow-sm transition-all duration-200 focus-within:border-zinc-400 focus-within:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-600"
      >
        <input
          value={ticker}
          onChange={(event) => setTicker(event.target.value)}
          placeholder="Enter a ticker, e.g. AAPL"
          className="flex-1 bg-transparent px-4 py-2 font-mono text-sm uppercase tracking-wide text-zinc-900 placeholder:text-zinc-400 placeholder:normal-case focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-500"
          maxLength={10}
          autoCapitalize="characters"
        />
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.03] hover:bg-zinc-700 active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Analyze
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
        <span>Try:</span>
        {EXAMPLE_TICKERS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => router.push(`/analyze/${example}`)}
            className="rounded-full border border-zinc-200 px-2.5 py-1 font-mono transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-400 hover:text-zinc-900 active:translate-y-0 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
