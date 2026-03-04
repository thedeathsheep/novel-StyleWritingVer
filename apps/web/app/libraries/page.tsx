"use client";

import { useLibraries, type LibraryWithCount } from "@/hooks/use-libraries";
import { useCurrentLibrary } from "@/hooks/use-current-library";
import { useResonanceLibraries } from "@/hooks/use-resonance-libraries";
import { getStoredOpenAIKey, getStoredAIProvider } from "@/lib/settings";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Plus, Trash2, Upload, Check } from "lucide-react";

export default function LibrariesPage() {
  const { libraries, loading, fetchLibraries, createLibrary, deleteLibrary } =
    useLibraries();
  const { currentLibraryId, setCurrentLibraryId } = useCurrentLibrary();
  const {
    libraries: resonanceLibraries,
    addLibrary: addResonanceLibrary,
    removeLibrary: removeResonanceLibrary,
    setWeight: setResonanceWeight,
  } = useResonanceLibraries();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [ingestId, setIngestId] = useState<string | null>(null);
  const [ingestText, setIngestText] = useState("");
  const [ingestSource, setIngestSource] = useState("用户导入");
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [ingestDone, setIngestDone] = useState(false);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const lib = await createLibrary(name);
      if (lib) {
        setNewName("");
        setCurrentLibraryId(lib.id);
      }
    } finally {
      setCreating(false);
    }
  }, [newName, createLibrary, setCurrentLibraryId]);

  const handleIngest = useCallback(
    async (id: string) => {
      const text = ingestText.trim();
      if (!text) return;
      setIngestSubmitting(true);
      setIngestDone(false);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const storedKey = getStoredOpenAIKey();
      const provider = getStoredAIProvider();
      if (storedKey) {
        headers["X-AI-API-Key"] = storedKey;
        headers["X-AI-Provider"] = provider;
      }
      if (storedKey && provider === "openai") headers["X-OpenAI-API-Key"] = storedKey;
      try {
        const res = await fetch(`/api/libraries/${id}/ingest`, {
          method: "POST",
          headers,
          body: JSON.stringify({ text, source: ingestSource || "用户导入" }),
        });
        const data = await res.json();
        if (data.ok) {
          setIngestText("");
          setIngestDone(true);
          fetchLibraries();
        }
      } finally {
        setIngestSubmitting(false);
      }
    },
    [ingestText, ingestSource, fetchLibraries],
  );

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
        <h1 className="text-lg font-semibold text-zinc-200 mb-2">知识库</h1>
        <p className="text-sm text-zinc-500 mb-4">
          创建库并导入文本后，写作页将使用该库进行灵感检索。
        </p>
        <p className="text-sm text-zinc-500 mb-8">
          可多选库并设置权重（如 60% 古代史 + 40% 物理），检索时按权重合并结果。
        </p>

        <div className="space-y-4 mb-10">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新知识库名称"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">加载中…</p>
        ) : libraries.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无知识库，请先新建一个。</p>
        ) : (
          <ul className="space-y-3">
            {libraries.map((lib) => (
              <li
                key={lib.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
              >
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentLibraryId(currentLibraryId === lib.id ? null : lib.id)
                    }
                    className="shrink-0 w-5 h-5 rounded border-2 border-zinc-600 flex items-center justify-center hover:border-violet-500"
                    title="单库模式：仅用此库检索"
                  >
                    {currentLibraryId === lib.id ? (
                      <Check className="w-3 h-3 text-violet-400" />
                    ) : null}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {lib.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {currentLibraryId === lib.id ? "当前使用" : "点击勾选使用"}
                      {" · "}
                      {(lib as LibraryWithCount).chunksCount ?? 0} 条
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resonanceLibraries.some((r) => r.id === lib.id)}
                        onChange={(e) => {
                          if (e.target.checked) addResonanceLibrary(lib.id, 0.5);
                          else removeResonanceLibrary(lib.id);
                        }}
                        className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                      />
                      参与多库检索
                    </label>
                    {resonanceLibraries.some((r) => r.id === lib.id) && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        权重
                        <input
                          type="number"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={
                            resonanceLibraries.find((r) => r.id === lib.id)?.weight ?? 0.5
                          }
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v) && v >= 0.1 && v <= 1)
                              setResonanceWeight(lib.id, v);
                          }}
                          className="w-12 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs"
                        />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setIngestId(ingestId === lib.id ? null : lib.id)
                    }
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-violet-400"
                    title="导入文本"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`确定删除「${lib.name}」？`)) {
                        await deleteLibrary(lib.id);
                        if (currentLibraryId === lib.id) setCurrentLibraryId(null);
                        removeResonanceLibrary(lib.id);
                      }
                    }}
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {ingestId && (
          <div className="mt-10 p-6 rounded-lg bg-zinc-900 border border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">导入文本</h2>
            <input
              type="text"
              value={ingestSource}
              onChange={(e) => setIngestSource(e.target.value)}
              placeholder="来源（如书名/章节）"
              className="w-full mb-3 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <textarea
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              placeholder="粘贴或输入要导入的文本（按句/段分块后生成向量）…"
              rows={8}
              className="w-full mb-3 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleIngest(ingestId)}
                disabled={ingestSubmitting || !ingestText.trim()}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
              >
                {ingestSubmitting ? "导入中…" : "提交导入"}
              </button>
              {ingestDone && (
                <span className="text-sm text-green-500">已追加</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setIngestId(null);
                  setIngestText("");
                  setIngestDone(false);
                }}
                className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-400 text-sm hover:bg-zinc-800"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
