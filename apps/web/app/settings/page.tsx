"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  OPENAI_API_KEY_STORAGE_KEY,
  AI_PROVIDER_STORAGE_KEY,
  getStoredOpenAIKey,
  getStoredAIProvider,
} from "@/lib/settings";
import type { AIProviderId } from "@/lib/ai-provider";
import { getProviderIds } from "@/lib/ai-provider";

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: "OpenAI",
  google: "Google (Gemini)",
  aihubmix: "AIHubMix",
  siliconflow: "SiliconFlow",
};

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<AIProviderId>("openai");
  const [saved, setSaved] = useState(false);
  const [hasStored, setHasStored] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setHasStored(!!getStoredOpenAIKey());
    setProvider(getStoredAIProvider());
  }, [saved]);

  const handleSave = useCallback(() => {
    const trimmed = apiKey.trim();
    if (typeof window === "undefined") return;
    if (trimmed) {
      window.localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
    }
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
    setApiKey("");
    setSaved(true);
    setHasStored(!!trimmed);
  }, [apiKey, provider]);

  const keyToValidate = apiKey.trim() || getStoredOpenAIKey() || "";

  const handleValidate = useCallback(async () => {
    if (!keyToValidate) {
      toast.error("请先填写或保存 API Key 后再验证");
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/validate-ai-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Provider": provider,
          "X-AI-API-Key": keyToValidate,
        },
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("验证通过，该 Key 有效");
      } else {
        toast.error(data.error || "验证失败");
      }
    } catch {
      toast.error("验证请求失败，请检查网络");
    } finally {
      setValidating(false);
    }
  }, [provider, keyToValidate]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-300">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300"
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold tracking-widest uppercase">
            StyleEvent
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-400 uppercase tracking-wider"
        >
          返回写作
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-lg font-semibold text-zinc-200 mb-2">设置</h1>
        <p className="text-sm text-zinc-500 mb-8">
          灵感检索与知识库导入支持多种 API：OpenAI、Google (Gemini)、AIHubMix、SiliconFlow。请选择提供商并填写对应 API Key（仅存于本机）。
        </p>

        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-zinc-400">
            API 提供商
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderId)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {getProviderIds().map((id) => (
              <option key={id} value={id}>
                {PROVIDER_LABELS[id]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-zinc-400">
            API Key
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-..." : "在此填写对应 Key"}
              className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || !keyToValidate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {validating ? (
                "验证中…"
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  验证
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500"
            >
              保存
            </button>
          </div>
          {saved && (
            <p className="text-xs text-green-500">已保存（仅存于本机，用于请求本站）。</p>
          )}
        </div>

        <p className="text-sm text-zinc-500 mb-4">
          {hasStored
            ? "当前状态：已配置。灵感检索、知识库导入与 AI 续写/润色均使用您在本地填写的 Key，无需服务端配置。"
            : "当前状态：未配置。灵感检索将使用演示数据；知识库导入与 AI 续写/润色需在此填写 Key（仅存于本机，不依赖服务端）。"}
        </p>
        <p className="text-xs text-zinc-600">
          仅填写此处即可完整使用本工具；若部署自有服务端，也可在 <code className="bg-zinc-800 px-1 rounded">.env</code> 中配置{" "}
          <code className="bg-zinc-800 px-1 rounded">AI_PROVIDER</code> 及对应 Key，供未在浏览器填写的用户使用。
        </p>
      </main>
    </div>
  );
}
