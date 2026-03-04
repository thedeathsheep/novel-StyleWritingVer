/**
 * Multi-provider AI config: OpenAI, Google, AIHubMix, SiliconFlow.
 * Embedding and chat use provider-specific base URL and model where needed.
 */

import OpenAI from "openai";

export type AIProviderId = "openai" | "google" | "aihubmix" | "siliconflow";

const PROVIDER_IDS: AIProviderId[] = ["openai", "google", "aihubmix", "siliconflow"];

export function getProviderIds(): AIProviderId[] {
  return [...PROVIDER_IDS];
}

export function parseProvider(value: string | null | undefined): AIProviderId {
  if (!value || typeof value !== "string") return "openai";
  const v = value.trim().toLowerCase();
  if (PROVIDER_IDS.includes(v as AIProviderId)) return v as AIProviderId;
  return "openai";
}

export interface EmbeddingConfig {
  provider: AIProviderId;
  apiKey: string | null;
  /** Only for OpenAI-compatible (openai, aihubmix, siliconflow). */
  baseURL?: string;
  /** Model id for embeddings (OpenAI-compatible). */
  embeddingModel: string;
}

/** Default base URLs for OpenAI-compatible providers. */
export const DEFAULT_BASE_URLS: Record<AIProviderId, string | undefined> = {
  openai: undefined,
  google: undefined,
  aihubmix: "https://api.aihubmix.com/v1",
  siliconflow: "https://api.siliconflow.com/v1",
};

/** Default embedding model per provider (OpenAI-compatible only). */
export const DEFAULT_EMBEDDING_MODELS: Record<AIProviderId, string> = {
  openai: "text-embedding-3-small",
  google: "text-embedding-004",
  aihubmix: "text-embedding-3-small",
  siliconflow: "BAAI/bge-m3",
};

/**
 * Resolve embedding config from request headers and env.
 * Header precedence: X-AI-Provider, X-AI-API-Key (or X-OpenAI-API-Key for key).
 */
export function getEmbeddingConfigFromRequest(req: Request): EmbeddingConfig {
  const provider = parseProvider(
    req.headers.get("X-AI-Provider")?.trim() || process.env.AI_PROVIDER
  );
  const apiKey =
    req.headers.get("X-AI-API-Key")?.trim() ||
    req.headers.get("X-OpenAI-API-Key")?.trim() ||
    getEnvApiKey(provider);

  const baseURL =
    provider === "openai"
      ? (process.env.OPENAI_BASE_URL?.trim() || undefined)
      : DEFAULT_BASE_URLS[provider];
  const embeddingModel =
    process.env.AI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODELS[provider];

  return { provider, apiKey: apiKey || null, baseURL, embeddingModel };
}

function getEnvApiKey(provider: AIProviderId): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY?.trim();
    case "google":
      return (
        process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim()
      );
    case "aihubmix":
      return process.env.AIHUBMIX_API_KEY?.trim();
    case "siliconflow":
      return process.env.SILICONFLOW_API_KEY?.trim();
    default:
      return process.env.OPENAI_API_KEY?.trim();
  }
}

/**
 * Create an OpenAI client for embedding (OpenAI-compatible providers only).
 * For Google use createGoogleEmbedding() instead.
 */
export function createOpenAICompatibleClient(config: EmbeddingConfig): OpenAI | null {
  if (config.provider === "google" || !config.apiKey) return null;
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || "https://api.openai.com/v1",
  });
}

/**
 * Call Google Gemini embedding API (REST). Returns embedding array or null.
 */
export async function createGoogleEmbedding(
  apiKey: string,
  input: string
): Promise<number[] | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: input }] },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? null;
  } catch {
    return null;
  }
}

/**
 * Get embedding vector for a single text using the given config.
 * Uses OpenAI-compatible client or Google API.
 */
export async function embedOne(config: EmbeddingConfig, text: string): Promise<number[] | null> {
  if (!config.apiKey) return null;
  if (config.provider === "google") {
    return createGoogleEmbedding(config.apiKey, text);
  }
  const client = createOpenAICompatibleClient(config);
  if (!client) return null;
  const res = await client.embeddings.create({
    model: config.embeddingModel,
    input: text,
  });
  const vec = res.data[0]?.embedding;
  return Array.isArray(vec) ? vec : null;
}

/**
 * Get embedding vectors for multiple texts (batch). OpenAI-compatible only; Google one-by-one.
 */
export async function embedMany(
  config: EmbeddingConfig,
  texts: string[]
): Promise<(number[] | null)[]> {
  if (!config.apiKey || texts.length === 0) return texts.map(() => null);
  if (config.provider === "google") {
    const results = await Promise.all(texts.map((t) => createGoogleEmbedding(config.apiKey!, t)));
    return results;
  }
  const client = createOpenAICompatibleClient(config);
  if (!client) return texts.map(() => null);
  const res = await client.embeddings.create({
    model: config.embeddingModel,
    input: texts,
  });
  const ordered = res.data.slice(0, texts.length);
  return texts.map((_, i) => {
    const vec = ordered[i]?.embedding;
    return Array.isArray(vec) ? vec : null;
  });
}
