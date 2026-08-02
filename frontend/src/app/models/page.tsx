"use client";

import { useState } from "react";
import type { ModelMetadataResponse, ModelsListResponse } from "@shared/types";

import { BacktestExplainer } from "@/components/education/BacktestExplainer";
import { MonteCarloExplainer } from "@/components/education/MonteCarloExplainer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Spinner";
import { listModels } from "@/lib/api/models";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { MODEL_DETAILS } from "@/lib/interpret/modelDetails";

const CATEGORY_LABELS: Record<string, string> = {
  diffusion: "Diffusion",
  jump: "Jump Process",
  stochastic_vol: "Stochastic Volatility",
  empirical: "Empirical",
  regime: "Regime-Based",
};

export default function ModelsPage() {
  const { data, loading, error } = useApiResource<ModelsListResponse>(() => listModels(), []);
  const [selected, setSelected] = useState<ModelMetadataResponse | null>(null);
  const selectedDetail = selected ? MODEL_DETAILS[selected.name] : null;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Forecasting Models
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Every model implements the same plugin interface. The model-selection engine
            picks between the implemented ones based on historical backtest performance in
            the current market regime. Click any model for a plain-English breakdown of how
            it works, what it&apos;s best at, and where it falls short.
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-600">
            New here?
          </span>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Two ideas explain almost everything below
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            No finance background needed — these two interactive diagrams cover the core
            mechanics this whole app is built on.
          </p>
          <div className="mt-5 flex flex-col gap-5">
            <MonteCarloExplainer />
            <BacktestExplainer />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : error || !data ? (
          <ErrorState message={error ?? "Couldn't load the model catalog."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.models.map((model) => (
              <button
                key={model.name}
                type="button"
                onClick={() => setSelected(model)}
                className="text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:shadow-md focus-visible:outline-none"
              >
                <Card
                  title={model.display_name}
                  action={
                    <Badge variant={model.is_implemented ? "good" : "muted"}>
                      {model.is_implemented ? "Implemented" : "Coming soon"}
                    </Badge>
                  }
                >
                  <Badge variant="default" className="mb-3">
                    {CATEGORY_LABELS[model.category] ?? model.category}
                  </Badge>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {model.description}
                  </p>
                  {model.supports_regimes ? (
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Regime-aware</p>
                  ) : null}
                  <p className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
                    Click to learn more →
                  </p>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <Modal
          title={selected.display_name}
          subtitle={CATEGORY_LABELS[selected.category] ?? selected.category}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant={selected.is_implemented ? "good" : "muted"}>
                {selected.is_implemented ? "Implemented" : "Coming soon"}
              </Badge>
              {selected.supports_regimes ? <Badge variant="default">Regime-aware</Badge> : null}
            </div>

            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {selected.description}
            </p>

            {selectedDetail ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    How it works
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {selectedDetail.howItWorks}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Best for
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {selectedDetail.bestFor}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Watch out for
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {selectedDetail.watchOutFor}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </DashboardShell>
  );
}
