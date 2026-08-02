"use client";

import { useMemo, useState } from "react";

const WIDTH = 480;
const HEIGHT = 220;
const START_Y = 110;
const N_STEPS = 7;

/** Same fixed-seed PRNG as `MonteCarloExplainer` — deterministic so server
 * and client render identically, with `replayKey` as the only variation. */
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

function toPath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

interface Comparison {
  predictedD: string;
  actualD: string;
  gapFillD: string;
  gapPct: number;
}

/** Builds one smooth "predicted" path (what the model forecast, drawn from
 * a past date with no knowledge of what came next) and one noisier "actual"
 * path from the same starting point (what really happened) — plus a filled
 * ribbon between their endpoints so the forecast error reads as a shape,
 * not just two lines. */
function buildComparison(seed: number): Comparison {
  const rand = mulberry32(seed);

  const predictedPoints: [number, number][] = [[0, START_Y]];
  const actualPoints: [number, number][] = [[0, START_Y]];
  let py = START_Y;
  let ay = START_Y;
  const drift = (rand() - 0.35) * 10;

  for (let s = 1; s <= N_STEPS; s++) {
    const x = (s / N_STEPS) * WIDTH;
    py = Math.min(HEIGHT - 20, Math.max(20, py + drift + (rand() - 0.5) * 6));
    ay = Math.min(HEIGHT - 20, Math.max(20, ay + drift + (rand() - 0.5) * 26));
    predictedPoints.push([x, py]);
    actualPoints.push([x, ay]);
  }

  const gapFillD = `${toPath(predictedPoints)} L${actualPoints[actualPoints.length - 1][0].toFixed(1)},${actualPoints[actualPoints.length - 1][1].toFixed(1)} ${[...actualPoints]
    .reverse()
    .map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ")} Z`;

  const gapPct = Math.round((Math.abs(py - ay) / HEIGHT) * 100);

  return { predictedD: toPath(predictedPoints), actualD: toPath(actualPoints), gapFillD, gapPct };
}

/** An interactive, replayable diagram teaching backtesting as "we already
 * know how this movie ends": one prediction line, drawn forward from a past
 * date exactly as the model would have seen it live, laid against the one
 * actual price path that really followed — with the gap between them
 * highlighted as the forecast error. Deliberately not a model-vs-model
 * comparison — that lives on the Backtest page itself; this is just the
 * core idea, in one picture. */
export function BacktestExplainer() {
  const [replayKey, setReplayKey] = useState(0);
  const { predictedD, actualD, gapFillD, gapPct } = useMemo(
    () => buildComparison(31 + replayKey),
    [replayKey],
  );

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/[.06] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm dark:border-white/[.08] dark:from-zinc-950 dark:to-zinc-900 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-600">
            Checking our work
          </span>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            What is backtesting?
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
        <div className="flex flex-col gap-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label="Diagram of a predicted price path and the actual price path that followed, with the gap between them highlighted as forecast error"
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
            <path
              d={gapFillD}
              className="fill-amber-400/25 motion-safe:animate-[fade-in-up_450ms_ease-out_both] dark:fill-amber-300/20"
              style={{ animationDelay: "1000ms" }}
            />
            <path
              d={predictedD}
              fill="none"
              stroke="#dc2626"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              style={{ transformOrigin: `0px ${START_Y}px` }}
              className="motion-safe:animate-[path-pop-in_550ms_ease-out_both]"
            />
            <path
              d={actualD}
              fill="none"
              style={{ transformOrigin: `0px ${START_Y}px`, animationDelay: "500ms" }}
              className="stroke-zinc-900 motion-safe:animate-[path-pop-in_550ms_ease-out_both] dark:stroke-zinc-50"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={0} cy={START_Y} r={4} fill="var(--series-1)" />
            <text x={6} y={START_Y - 10} className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
              3 months ago
            </text>
          </svg>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-sm border-t-2 border-dashed" style={{ borderColor: "#dc2626" }} />
              Predicted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-sm bg-zinc-900 dark:bg-zinc-50" />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-amber-400/30" />
              Forecast error
            </span>
          </div>

          <p
            style={{ animationDelay: "1400ms" }}
            className="motion-safe:animate-[fade-in-up_450ms_ease-out_both] rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Here, the prediction missed by about{" "}
            <span className="font-semibold">{gapPct}%</span>{" "}
            of the chart&apos;s range — that shaded gap is exactly what gets scored.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            "1. Rewind to a point in the past — say, 3 months ago — using only the data available up to that day.",
            "2. The model draws its prediction (red, dashed) forward, exactly as it would today.",
            "3. Because it's history, we already know the actual price path (black) that followed.",
            "4. The gap between the two lines is the forecast error — that's what gets measured and compared across models.",
          ].map((step, i) => (
            <p
              key={step}
              style={{ animationDelay: `${300 + i * 400}ms` }}
              className="motion-safe:animate-[fade-in-up_450ms_ease-out_both] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
            >
              {step}
            </p>
          ))}
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
            Repeating this at dozens of points throughout a stock&apos;s history — and averaging
            the error — is exactly what the Backtest page does.
          </p>
        </div>
      </div>
    </div>
  );
}
