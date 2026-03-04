import { NextResponse } from "next/server";
import { parseProvider } from "@/lib/ai-provider";
import { DEFAULT_BASE_URLS } from "@/lib/ai-provider";

const TIMEOUT_MS = 8000;

/** OpenAI-compatible: GET /v1/models with Bearer key. */
async function validateOpenAICompatible(
  baseURL: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `${baseURL.replace(/\/$/, "")}/models`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) return { ok: true };
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      if (text.length < 120) msg = text;
    }
    return { ok: false, error: msg };
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { ok: false, error: msg };
  }
}

/** Google: GET v1beta/models?key=... */
async function validateGoogle(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return { ok: true };
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      if (text.length < 120) msg = text;
    }
    return { ok: false, error: msg };
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { ok: false, error: msg };
  }
}

export async function POST(req: Request) {
  const provider = parseProvider(
    req.headers.get("X-AI-Provider")?.trim() || process.env.AI_PROVIDER
  );
  const apiKey =
    req.headers.get("X-AI-API-Key")?.trim() ||
    req.headers.get("X-OpenAI-API-Key")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing API key. Provide X-AI-API-Key header." },
      { status: 400 }
    );
  }

  if (provider === "google") {
    const result = await validateGoogle(apiKey);
    return NextResponse.json(result);
  }

  const baseURL =
    provider === "openai"
      ? (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1")
      : DEFAULT_BASE_URLS[provider] || "https://api.openai.com/v1";
  const result = await validateOpenAICompatible(baseURL, apiKey);
  return NextResponse.json(result);
}
