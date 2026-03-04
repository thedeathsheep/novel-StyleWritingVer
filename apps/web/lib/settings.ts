import type { AIProviderId } from "./ai-provider";

/** localStorage key for user-provided API key (browser only). */
export const OPENAI_API_KEY_STORAGE_KEY = "styleevent-openai-api-key";
/** localStorage key for selected AI provider. */
export const AI_PROVIDER_STORAGE_KEY = "styleevent-ai-provider";

/** Get stored API key from localStorage if available (client-only). */
export function getStoredOpenAIKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

/** Get stored AI provider from localStorage (client-only). Defaults to "openai". */
export function getStoredAIProvider(): AIProviderId {
  if (typeof window === "undefined") return "openai";
  try {
    const v = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)?.trim()?.toLowerCase();
    if (v === "google" || v === "aihubmix" || v === "siliconflow") return v;
    return "openai";
  } catch {
    return "openai";
  }
}
