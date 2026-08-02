"use client";

import { useMemo, useState } from "react";

const WIDTH = 480;
const HEIGHT = 220;
const START_Y = 110;
const N_PATHS = 24;
const N_STEPS = 7;
const N_BINS = 9;

interface PathData {
  d: string;
  endY: number;
  isMedian: boolean;
}

/** Tiny deterministic PRNG (mulberry32) — a fixed seed means the "random"
 * walk below renders identically on server and client, avoiding a hydration
 * mismatch, without needing real randomness for what's just an illustration. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPaths(seed: number): { paths: PathData[]; bins: number[] } {
  const rand = mulberry32(seed);
  const paths: Omit<PathData, "isMedian">[] = [];

  for (let p = 0; p < N_PATHS; p++) {
    let y = START_Y;
    const points: [number, number][] = [[0, y]];
    for (let s = 1; s <= N_STEPS; s++) {
      const step = (rand() - 0.5) * (HEIGHT * 0.32);
      y = Math.min(HEIGHT - 14, Math.max(14, y + step));
      points.push([(s / N_STEPS) * WIDTH, y]);
    }
    const d = points.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
    paths.push({ d, endY: y });
  }

  const medianEndY = [...paths.map((p) => p.endY)].sort((a, b) => a - b)[Math.floor(N_PATHS / 2)];
  const withMedianFlag: PathData[] = paths.map((p) => ({ ...p, isMedian: p.endY === medianEndY }));

  const bins = new Array(N_BINS).fill(0) as number[];
  for (const p of paths) {
    const idx = Math.min(N_BINS - 1, Math.floor((p.endY / HEIGHT) * N_BINS));
    bins[idx] += 1;
  }

  return { paths: withMedianFlag, bins };
}

/** An interactive, replayable diagram teaching what a Monte Carlo simulation
 * actually is: one starting price fans out into many random possible
 * futures, and those futures' endpoints become a distribution. CSS-driven
 * (opacity/transform only) so it costs nothing beyond the initial SVG paint,
 * and respects prefers-reduced-motion via the app-wide safety net. */
export function MonteCarloExplainer() {
  const [replayKey, setReplayKey] = useState(0);
  const { paths, bins } = useMemo(() => buildPaths(7 + replayKey), [replayKey]);
  const maxBin = Math.max(...bins, 1);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/[.06] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm dark:border-white/[.08] dark:from-zinc-950 dark:to-zinc-900 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-600">
            The core idea
          </span>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            What is a Monte Carlo simulation?
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-400 hover:text-zinc-900 active:translate-y-0 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          ↻ Run it again
        </button>
      </div>

      <div key={replayKey} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Diagram of many simulated price paths fanning out from a single starting point"
        >
          <line
            x1={0}
            y1={START_Y}
            x2={WIDTH}
            y2={START_Y}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          {paths.map((path, i) => (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke="var(--series-1)"
              strokeOpacity={path.isMedian ? 1 : 0.16}
              strokeWidth={path.isMedian ? 2.5 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transformOrigin: `0px ${START_Y}px`, animationDelay: `${i * 45}ms` }}
              className="motion-safe:animate-[path-pop-in_500ms_ease-out_both]"
            />
          ))}
          <circle cx={0} cy={START_Y} r={4} fill="var(--series-1)" />
          <text x={6} y={START_Y - 10} className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
            Today
          </text>
        </svg>

        <div className="flex flex-col gap-3">
          {[
            "1. Start from today's actual price.",
            "2. Simulate thousands of random possible futures.",
            "3. See where they end up — that spread becomes the forecast.",
          ].map((step, i) => (
            <p
              key={step}
              style={{ animationDelay: `${300 + i * 500}ms` }}
              className="motion-safe:animate-[fade-in-up_450ms_ease-out_both] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
            >
              {step}
            </p>
          ))}

          <div
            style={{ animationDelay: "1700ms" }}
            className="motion-safe:animate-[fade-in-up_450ms_ease-out_both] mt-1 flex h-16 items-end gap-1"
            aria-hidden="true"
          >
            {bins.map((count, i) => (
              <div
                key={i}
                style={{
                  height: `${Math.max(8, (count / maxBin) * 100)}%`,
                  transformOrigin: "bottom",
                  animationDelay: `${1750 + i * 60}ms`,
                }}
                className="motion-safe:animate-[path-pop-in_400ms_ease-out_both] flex-1 rounded-t bg-zinc-300 dark:bg-zinc-700"
              />
            ))}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Where those {N_PATHS} example paths ended up, bucketed — with thousands of paths
            instead of {N_PATHS}, this becomes a smooth probability distribution.
          </p>
        </div>
      </div>
    </div>
  );
}
