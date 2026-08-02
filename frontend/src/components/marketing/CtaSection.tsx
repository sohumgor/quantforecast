"use client";

import type { MouseEvent } from "react";

import { ArrowRightIcon } from "./icons";

export function CtaSection() {
  // A plain `<a href="#analyze">` is one line shorter, but native fragment
  // scrolling races the web-font swap and can land a section or two off —
  // scrollIntoView runs on click, well after layout has settled, so it's
  // reliable every time.
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
      <h2 className="max-w-lg font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        Ready to see what the numbers actually say?
      </h2>
      <a
        href="#analyze"
        onClick={handleClick}
        className="group inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
      >
        Analyze a stock
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </a>
    </section>
  );
}
