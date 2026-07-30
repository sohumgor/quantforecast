import type { ReactNode } from "react";

import { Card } from "./Card";

interface ChartCardProps {
  title: string;
  /** Fixed, one-sentence explanation of what the chart shows. */
  explanation: string;
  /** Dynamic, value-based interpretation of the current chart's data. */
  interpretation?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/** Standardizes every chart card to the same shape: a title, a one-sentence
 * explanation of what it shows, the chart itself, and a short interpretation
 * grounded in the actual current values — so no chart is ever left to speak
 * for itself. */
export function ChartCard({ title, explanation, interpretation, action, children }: ChartCardProps) {
  return (
    <Card title={title} subtitle={explanation} action={action}>
      {children}
      {interpretation ? (
        <div className="mt-4 rounded-lg bg-zinc-50 px-3.5 py-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {interpretation}
        </div>
      ) : null}
    </Card>
  );
}
