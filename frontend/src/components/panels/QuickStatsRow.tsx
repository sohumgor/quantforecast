import { formatCurrency, formatPercent } from "@/lib/interpret/format";
import type { ConfidenceLevel } from "@/lib/interpret/recommendation";
import type { RiskLevel } from "@/lib/interpret/risk";
import { VOLATILITY_LEVEL_ICON, type VolatilityLevel } from "@/lib/interpret/volatility";

type Tone = "blue" | "green" | "yellow" | "red" | "violet" | "zinc";

const TONE_CLASSES: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
  green: "border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
  yellow: "border-amber-100 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  red: "border-red-100 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
  violet: "border-violet-100 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30",
  zinc: "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
};

interface QuickStatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
}

function QuickStatCard({ icon, label, value, sub, tone }: QuickStatCardProps) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 sm:p-4 ${TONE_CLASSES[tone]}`}>
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:text-xs">
          {label}
        </p>
      </div>
      <p className="mt-1.5 break-words text-base leading-snug font-semibold text-zinc-900 dark:text-zinc-50 sm:mt-2 sm:text-xl">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 break-words text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      ) : null}
    </div>
  );
}

const RISK_TONE: Record<RiskLevel, Tone> = { Low: "green", Moderate: "yellow", High: "red" };
const VOL_TONE: Record<VolatilityLevel, Tone> = { Low: "green", Medium: "yellow", High: "red" };
const CONFIDENCE_TONE: Record<ConfidenceLevel, Tone> = {
  High: "green",
  Moderate: "yellow",
  Low: "red",
};

interface QuickStatsRowProps {
  volatilityLevel: VolatilityLevel | null;
  riskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  modelDisplayName: string;
  probPositiveReturn: number;
  lowPrice: number;
  highPrice: number;
}

/** A scannable strip of small, colored icon cards — the "under ten seconds"
 * summary of the whole analysis, before anyone reads a single paragraph. */
export function QuickStatsRow({
  volatilityLevel,
  riskLevel,
  confidenceLevel,
  modelDisplayName,
  probPositiveReturn,
  lowPrice,
  highPrice,
}: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
      <QuickStatCard
        icon={volatilityLevel ? VOLATILITY_LEVEL_ICON[volatilityLevel] : "•"}
        label="Volatility"
        value={volatilityLevel ?? "—"}
        tone={volatilityLevel ? VOL_TONE[volatilityLevel] : "zinc"}
      />
      <QuickStatCard
        icon={riskLevel === "Low" ? "🟢" : riskLevel === "Moderate" ? "🟡" : "🔴"}
        label="Risk"
        value={riskLevel}
        tone={RISK_TONE[riskLevel]}
      />
      <QuickStatCard
        icon="⭐"
        label="Confidence"
        value={confidenceLevel}
        tone={CONFIDENCE_TONE[confidenceLevel]}
      />
      <QuickStatCard
        icon="🧠"
        label="Recommendation"
        value={modelDisplayName}
        tone="blue"
      />
      <QuickStatCard
        icon="📈"
        label="Probability Up"
        value={formatPercent(probPositiveReturn)}
        tone="violet"
      />
      <QuickStatCard
        icon="📊"
        label="Forecast Range"
        value={`${formatCurrency(lowPrice)}–${formatCurrency(highPrice)}`}
        tone="zinc"
      />
    </div>
  );
}
