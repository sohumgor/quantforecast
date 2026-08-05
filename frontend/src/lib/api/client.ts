const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// The backend is hosted on Render's free tier, which spins the instance
// down after inactivity — waking it back up can take 50s or more. Retrying
// GETs (network errors and 502/503/504, all signs of a still-booting
// instance) over that same window means a cold start resolves itself
// instead of surfacing as a dead-end error the user has to manually retry.
const COLD_START_RETRY_DELAYS_MS = [1000, 2000, 3000, 5000, 8000, 8000, 8000, 8000, 8000, 8000];
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init?: RequestInit, retryOnColdStart = false): Promise<T> {
  const delays = retryOnColdStart ? COLD_START_RETRY_DELAYS_MS : [];
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) await sleep(delays[attempt - 1]);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    } catch (err) {
      lastNetworkError = err;
      if (attempt < delays.length) continue;
      throw err;
    }

    if (!response.ok) {
      if (RETRYABLE_STATUSES.has(response.status) && attempt < delays.length) continue;

      let detail = response.statusText;
      try {
        const body = (await response.json()) as { detail?: string };
        detail = body.detail ?? detail;
      } catch {
        // response wasn't JSON; fall back to statusText
      }
      throw new ApiError(response.status, detail);
    }

    return (await response.json()) as T;
  }

  throw lastNetworkError;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" }, true);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}
