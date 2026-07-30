// Shared formatting helpers used throughout the plain-English interpretation
// layer. Kept dependency-free (no chart/React imports) so they can be unit
// tested and reused from both server and client components.

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(fraction: number, digits = 1): string {
  const pct = fraction * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function ordinalSuffix(n: number): string {
  const rounded = Math.round(n);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (rounded % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function ordinal(n: number): string {
  return `${Math.round(n)}${ordinalSuffix(n)}`;
}

/** Approximates a calendar date `tradingDaysAhead` trading days after `from`,
 * skipping weekends only (no market-holiday calendar) — good enough for axis
 * labels and plain-English date references, not for exact settlement math. */
export function tradingDayToDate(from: Date, tradingDaysAhead: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < tradingDaysAhead) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Extracts a bare domain (no protocol/www) from a company website URL, for
 * building a Clearbit logo URL. Returns null for anything unparseable. */
export function domainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Truncates at the nearest word boundary within `maxChars`, so company
 * descriptions (which may contain abbreviations like "Inc." that aren't
 * sentence boundaries) can be shortened for one-line display without
 * fragile sentence-splitting logic. */
export function truncateText(text: string, maxChars = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
