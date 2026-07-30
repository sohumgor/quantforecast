"use client";

import { useState, type ReactNode } from "react";

interface DisclosureProps {
  title: string;
  /** Plain-English summary shown even when collapsed, so users never need to
   * expand a section just to know what it's about. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

export function Disclosure({
  title,
  summary,
  defaultOpen = false,
  className = "",
  children,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-black/[.06] bg-white dark:border-white/[.08] dark:bg-zinc-950 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
          {summary ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {summary}
            </p>
          ) : null}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-black/[.06] px-4 py-4 dark:border-white/[.08]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
