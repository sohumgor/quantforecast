interface ExecutiveSummaryProps {
  summary: string;
}

/** The programmatically-synthesized "so what does this mean" paragraph at
 * the very top of the page — built from deterministic templates, not an LLM. */
export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-sm dark:border-blue-950/60 dark:from-blue-950/30 dark:via-zinc-950 dark:to-zinc-950 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl dark:bg-blue-500/10"
      />
      <div className="relative flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm text-white dark:bg-blue-500">
          ✦
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
          At a Glance
        </p>
      </div>
      <p className="relative mt-3 text-lg leading-relaxed text-zinc-800 dark:text-zinc-100">
        {summary}
      </p>
    </div>
  );
}
