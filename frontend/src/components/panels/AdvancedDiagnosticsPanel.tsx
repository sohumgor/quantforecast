import type {
  ModelParamsInfo,
  PerformanceTableResponse,
  RegimeInfo,
  RegimeLabelValue,
  RiskAnalyticsInfo,
} from "@shared/types";

import { RiskDecompositionChart } from "@/components/charts/RiskDecompositionChart";
import { Disclosure } from "@/components/ui/Disclosure";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPercent } from "@/lib/interpret/format";
import { REGIME_DISPLAY_LABEL } from "@/lib/regime";

import { Card } from "../ui/Card";

interface AdvancedDiagnosticsPanelProps {
  model: ModelParamsInfo;
  risk: RiskAnalyticsInfo;
  regime: RegimeInfo;
  tickerSymbol: string;
  performance: PerformanceTableResponse | null;
  performanceLoading: boolean;
}

export function AdvancedDiagnosticsPanel({
  model,
  risk,
  regime,
  tickerSymbol,
  performance,
  performanceLoading,
}: AdvancedDiagnosticsPanelProps) {
  const posteriorEntries = Object.entries(regime.posterior).sort((a, b) => b[1] - a[1]);
  const regimePerformanceRows = (performance?.rows ?? []).filter(
    (row) => row.regime === regime.label,
  );

  return (
    <Card
      title="Advanced Diagnostics"
      subtitle="Full statistical detail behind the recommendation above — expand any section for the numbers."
    >
      <div className="space-y-3">
        <Disclosure
          title="Model Coefficients"
          summary={`The technical parameters ${model.display_name} calibrated from ${tickerSymbol}'s price history.`}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {Object.entries(model.params).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-zinc-500 dark:text-zinc-400">{key}</dt>
                <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                  {value.toFixed(5)}
                </dd>
              </div>
            ))}
          </dl>
        </Disclosure>

        <Disclosure
          title="Regime Probabilities"
          summary="How confident the regime detector is in each possible market condition right now, not just the top pick."
        >
          <dl className="space-y-1.5 text-sm">
            {posteriorEntries.map(([label, prob]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {REGIME_DISPLAY_LABEL[label as RegimeLabelValue] ?? label}
                </span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatPercent(prob, 1)}
                </span>
              </div>
            ))}
          </dl>
        </Disclosure>

        <Disclosure
          title="Return Distribution Decomposition"
          summary="The full spread of simulated returns, from worst-case to best-case, not just the headline numbers."
        >
          <RiskDecompositionChart distribution={risk.distribution} />
        </Disclosure>

        <Disclosure
          title="Calibration & Backtest Diagnostics"
          summary={`How well each model's confidence intervals and directional calls have historically performed specifically in ${REGIME_DISPLAY_LABEL[regime.label].toLowerCase()} conditions.`}
        >
          {performanceLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : regimePerformanceRows.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No backtest history available for this regime yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    <th className="pb-2 pr-4 font-semibold">Model</th>
                    <th className="pb-2 pr-4 font-semibold">Mean CRPS</th>
                    <th className="pb-2 pr-4 font-semibold">90% Coverage</th>
                    <th className="pb-2 pr-4 font-semibold">Directional Acc.</th>
                    <th className="pb-2 font-semibold">Windows</th>
                  </tr>
                </thead>
                <tbody>
                  {regimePerformanceRows
                    .slice()
                    .sort((a, b) => a.mean_crps - b.mean_crps)
                    .map((row) => (
                      <tr
                        key={row.model_name}
                        className="border-t border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                      >
                        <td className="py-1.5 pr-4">{row.model_name}</td>
                        <td className="py-1.5 pr-4 tabular-nums">{row.mean_crps.toFixed(3)}</td>
                        <td className="py-1.5 pr-4 tabular-nums">
                          {formatPercent(row.coverage_90, 0)}
                        </td>
                        <td className="py-1.5 pr-4 tabular-nums">
                          {formatPercent(row.directional_accuracy, 0)}
                        </td>
                        <td className="py-1.5 tabular-nums">{row.n_observations}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {performance?.used_fallback ? (
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                  From a cross-ticker universal prior — {tickerSymbol} doesn&apos;t have enough of
                  its own backtest history yet.
                </p>
              ) : null}
            </div>
          )}
        </Disclosure>
      </div>
    </Card>
  );
}
