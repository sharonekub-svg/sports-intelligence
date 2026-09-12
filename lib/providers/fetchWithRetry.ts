/**
 * Exponential backoff + jitter wrapper for every external HTTP call —
 * mirrors the pattern already proven in hapogea's `withRetry()`. Retries
 * on network exceptions and 5xx/429 responses only; a 4xx (other than 429)
 * is returned immediately since retrying it can't help.
 */

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const { attempts = 3, baseDelayMs = 300 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      const retryable = response.status >= 500 || response.status === 429;
      if (response.ok || !retryable || attempt === attempts) {
        return response;
      }
      lastError = new Error(`retryable upstream status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      }
    }

    const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 350;
    await sleep(delay);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
