"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { OPENAI_API_KEY_STORAGE_KEY, getStoredOpenAIKey } from "@/lib/settings";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    const key = getStoredOpenAIKey();
    setHasStored(!!key);
  }, [saved]);

  const handleSave = useCallback(() => {
    const trimmed = apiKey.trim();
    if (typeof window === "undefined") return;
    if (trimmed) {
      window.localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
    }
    setApiKey("");
    setSaved(true);
    setHasStored(!!trimmed);
  }, [apiKey]);

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
          StyleEvent 灵感检索与知识库导入使用 OpenAI 接口，请在此填写 API Key（仅存于本机浏览器）。
        </p>

        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-zinc-400">
            OpenAI API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoComplete="off"
            />
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
            ? "当前状态：已配置（仅本地）。灵感检索与知识库导入将使用此 Key。"
            : "当前状态：未配置。灵感检索将使用演示数据；知识库导入需配置 Key 或服务端 .env。"}
        </p>
        <p className="text-xs text-zinc-600">
          生产或对外部署建议在服务端配置 <code className="bg-zinc-800 px-1 rounded">.env</code> 中的{" "}
          <code className="bg-zinc-800 px-1 rounded">OPENAI_API_KEY</code>，无需在浏览器中填写。
        </p>
      </main>
    </div>
  );
}
