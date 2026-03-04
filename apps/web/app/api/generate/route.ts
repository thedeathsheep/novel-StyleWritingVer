import { createOpenAI } from "@ai-sdk/openai";
import { google as googleProvider } from "@ai-sdk/google";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { streamText } from "ai";
import { match } from "ts-pattern";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

const CHAT_BASE_URLS: Record<string, string> = {
  aihubmix: "https://api.aihubmix.com/v1",
  siliconflow: "https://api.siliconflow.com/v1",
};

const DEFAULT_CHAT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  aihubmix: "gpt-4o-mini",
  siliconflow: "Qwen/Qwen2.5-7B-Instruct",
  google: "gemini-1.5-flash",
};

const PROVIDERS = ["openai", "google", "aihubmix", "siliconflow"] as const;

function parseProvider(v: string | null | undefined): string {
  if (!v || typeof v !== "string") return "openai";
  const p = v.trim().toLowerCase();
  return PROVIDERS.includes(p as (typeof PROVIDERS)[number]) ? p : "openai";
}

function getEnvApiKey(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY?.trim();
    case "google":
      return (
        process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
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

/** Resolve provider and API key from request headers first, then env. So user can use the app with only client-side API keys (no server env). */
function getChatProviderAndModel(req: Request): { model: unknown; error?: string } {
  const provider = parseProvider(
    req.headers.get("X-AI-Provider")?.trim() || process.env.AI_PROVIDER
  );
  const apiKey =
    req.headers.get("X-AI-API-Key")?.trim() ||
    req.headers.get("X-OpenAI-API-Key")?.trim() ||
    getEnvApiKey(provider);

  const chatModel =
    process.env.AI_CHAT_MODEL?.trim() ||
    DEFAULT_CHAT_MODELS[provider] ||
    DEFAULT_CHAT_MODELS.openai;

  if (!apiKey) {
    return {
      model: null,
      error:
        "Missing API key. Set your provider and API key in Settings (stored in browser), or configure server .env.",
    };
  }

  if (provider === "google") {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }
    return { model: googleProvider(chatModel) };
  }

  const baseURL =
    provider === "openai"
      ? process.env.OPENAI_BASE_URL?.trim()
      : CHAT_BASE_URLS[provider];
  const openai = createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    compatibility: "compatible",
  });
  return { model: openai(chatModel) };
}

export async function POST(req: Request): Promise<Response> {
  const { model, error } = getChatProviderAndModel(req);
  if (error || !model) {
    return new Response(error || "Missing AI provider configuration.", {
      status: 400,
    });
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(`novel_ratelimit_${ip}`);

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const { prompt, option, command } = await req.json();
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that continues existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that improves existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that shortens existing text. " + "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that lengthens existing text. " +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that fixes grammar and spelling errors in existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content:
          "You area an AI writing assistant that generates text based on a prompt. " +
          "You take an input from the user and a command for manipulating the text" +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `For this text: ${prompt}. You have to respect the command: ${command}`,
      },
    ])
    .run();

  const result = await streamText({
    prompt: messages[messages.length - 1].content,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    model: model as Parameters<typeof streamText>[0]["model"],
  });

  return result.toDataStreamResponse();
}
