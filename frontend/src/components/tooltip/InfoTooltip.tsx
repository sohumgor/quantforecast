"use client";

import { useEffect, useRef, useState } from "react";

import { METRIC_GLOSSARY, type MetricKey } from "./metricGlossary";

interface InfoTooltipProps {
  metricKey: MetricKey;
  className?: string;
}

export function InfoTooltip({ metricKey, className = "" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const entry = METRIC_GLOSSARY[metricKey];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span className={`relative inline-flex ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`What is ${entry.title}?`}
        aria-expanded={open}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-zinc-400 ring-1 ring-inset ring-zinc-300 transition hover:text-zinc-700 hover:ring-zinc-400 dark:text-zinc-500 dark:ring-zinc-700 dark:hover:text-zinc-200"
      >
        i
      </button>
      {open ? (
        <div
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{entry.title}</p>
          <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300">
            {entry.description}
          </p>
          {entry.example ? (
            <p className="mt-2 border-t border-zinc-100 pt-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <span className="font-medium">Example: </span>
              {entry.example}
            </p>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
