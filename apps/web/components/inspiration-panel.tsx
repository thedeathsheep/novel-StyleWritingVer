"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InspirationItem } from "@/lib/types";
import { getStoredOpenAIKey } from "@/lib/settings";
import { Sparkles } from "lucide-react";

interface InspirationPanelProps {
  items: InspirationItem[];
  loading: boolean;
  maxItems?: number;
}

export default function InspirationPanel({ items, loading, maxItems = 6 }: InspirationPanelProps) {
  const visibleItems = items.slice(0, maxItems);
  const isEmpty = visibleItems.length === 0 && !loading;
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    setHasApiKey(!!getStoredOpenAIKey());
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto min-h-[120px] flex flex-col items-center justify-center px-6 py-4">
      {isEmpty && (
        <div className="flex flex-col items-center gap-2 select-none animate-fade-in">
          <div className="flex items-center gap-2 text-zinc-500">
            <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase">
              Inspiration
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            继续写，相关片段会出现在这里
          </p>
          {hasApiKey === false && (
            <p className="text-[10px] text-zinc-600 mt-1">
              当前为演示数据。在{" "}
              <Link href="/settings" className="text-violet-400/90 hover:text-violet-400 underline">
                设置
              </Link>{" "}
              中填写 OpenAI API Key 可使用真实检索与知识库导入。
            </p>
          )}
        </div>
      )}

      {loading && visibleItems.length === 0 && (
        <div className="flex items-center gap-2 text-violet-400/80 animate-pulse select-none">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase">
            Resonating
          </span>
        </div>
      )}

      {visibleItems.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-5">
          {visibleItems.map((item, idx) => (
            <div
              key={`${item.text}-${idx}`}
              className="relative py-1.5 px-3 animate-fade-in-up"
              style={{
                animationDelay: `${idx * 120}ms`,
                animation: `float-slow ${6 + idx * 0.5}s ease-in-out infinite`,
              }}
            >
              <div className="absolute inset-0 bg-violet-500/[0.04] blur-xl rounded-full -z-10" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-serif text-zinc-400/90 tracking-wide text-glow cursor-default transition-colors hover:text-violet-400">
                  {item.text}
                </span>
                <span className="text-[10px] text-zinc-600 tracking-wide">
                  {item.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
