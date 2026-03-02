/** localStorage key for user-provided OpenAI API key (browser only). */
export const OPENAI_API_KEY_STORAGE_KEY = "styleevent-openai-api-key";

/** Get OpenAI API key from localStorage if available (client-only). */
export function getStoredOpenAIKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}
