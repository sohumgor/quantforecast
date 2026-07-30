export interface HorizonOption {
  label: string;
  days: number;
}

export const FORECAST_HORIZONS: HorizonOption[] = [
  { label: "1 Month", days: 21 },
  { label: "3 Months", days: 63 },
  { label: "6 Months", days: 126 },
  { label: "1 Year", days: 252 },
];

export const DEFAULT_HORIZON_DAYS = 63;

/** Conservative rule of thumb: reliably calibrating a forecast this far out
 * needs at least ~3x as much historical data to draw on. This is a
 * presentation-layer heuristic (not a change to any model's math) that keeps
 * the UI from offering horizons a thin price history can't reasonably support. */
const HISTORY_MULTIPLE_REQUIRED = 3;

export function isHorizonReliable(historyDays: number, horizonDays: number): boolean {
  return historyDays >= horizonDays * HISTORY_MULTIPLE_REQUIRED;
}

export function horizonUnreliableReason(
  historyDays: number,
  horizonDays: number,
  tickerSymbol: string,
): string {
  const neededYears = ((horizonDays * HISTORY_MULTIPLE_REQUIRED) / 252).toFixed(1);
  const haveYears = (historyDays / 252).toFixed(1);
  return `Forecasting this far ahead reliably needs roughly ${neededYears} years of price history to calibrate against; ${tickerSymbol} only has about ${haveYears} years available.`;
}
