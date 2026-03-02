import type { InspirationItem } from "@/lib/types";
import { getStoredOpenAIKey } from "@/lib/settings";

const TIMEOUT_MS = 2000;

export interface ResonanceFetchOptions {
  query: string;
  signal?: AbortSignal;
  apiUrl?: string;
  /** Optional body extension for future use (e.g. libraryIds, weights). */
  bodyExtra?: Record<string, unknown>;
}

/**
 * Single request to resonate API: POST with 2s timeout, returns items or [].
 * If `signal` is provided, request is also aborted when that signal fires.
 * Does not hold React state; safe to call from anywhere.
 */
export async function resonanceFetch(options: ResonanceFetchOptions): Promise<InspirationItem[]> {
  const { query, signal, apiUrl = "/api/resonate", bodyExtra = {} } = options;
  const body = { query: query.trim(), ...bodyExtra };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const storedKey = getStoredOpenAIKey();
  if (storedKey) headers["X-OpenAI-API-Key"] = storedKey;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: InspirationItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}
