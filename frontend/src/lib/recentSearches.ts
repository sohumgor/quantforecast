const STORAGE_KEY = "qfp-recent-searches";
const MAX_ENTRIES = 8;

export interface RecentSearch {
  ticker: string;
  viewedAt: number;
}

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

/** Moves `ticker` to the front of the recent-searches list (deduping any
 * earlier entry) and persists it — called once a ticker's analysis has
 * actually loaded, not on every keystroke. */
export function recordRecentSearch(ticker: string): void {
  if (typeof window === "undefined") return;
  const existing = getRecentSearches().filter((entry) => entry.ticker !== ticker);
  const next = [{ ticker, viewedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function timeAgo(timestampMs: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}
