import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import OpenAI from "openai";
import type { InspirationItem } from "@/lib/types";
import { searchChunks, type ChunkWithEmbedding } from "@/lib/vector-store";

const TOP_K = 6;
const TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const EMBEDDINGS_PATH = join(process.cwd(), "lib", "data", "embeddings.json");

const MOCK_DB: Record<string, InspirationItem[]> = {
  累: [
    { text: "戍卒每日步行五十里，计筹枯燥", source: "《秦简·日书》" },
    { text: "某种生理性的沉重，像铅灌入四肢", source: "物理百科" },
    { text: "疲倦是身体对重复的抗议", source: "文学意象库" },
  ],
  走: [
    { text: "戍卒每日步行五十里，计筹枯燥", source: "《秦简·日书》" },
    { text: "行走本身就是一种思考的节奏", source: "文学意象库" },
  ],
  夕阳: [
    { text: "瑞利散射使长波段的红橙光扩散", source: "物理百科" },
    { text: "生锈的余晖与铁轨并置", source: "文学意象库" },
    { text: "残阳如血，映照着大地最后的温度", source: "诗词典故库" },
  ],
  晚霞: [
    { text: "大气层对阳光的最后一次折射", source: "物理百科" },
    { text: "天空在燃烧自己的调色盘", source: "文学意象库" },
  ],
  红: [
    { text: "长波段的红橙光穿透大气层", source: "物理百科" },
    { text: "红是警告，也是热烈", source: "色彩心理学" },
  ],
  琴: [
    { text: "榔头击弦前的瞬间脱开", source: "钢琴力学" },
    { text: "机械反馈产生的断裂感", source: "乐器工艺志" },
  ],
  乐: [
    { text: "音符之间的沉默比声音更有意义", source: "音乐理论" },
    { text: "旋律是时间的雕塑", source: "文学意象库" },
  ],
  孤独: [
    { text: "独处是灵魂的深呼吸", source: "文学意象库" },
    { text: "孤独不是被遗弃，而是主动选择的沉默", source: "哲学笔记" },
  ],
  雨: [
    { text: "雨滴以每秒九米的终端速度降落", source: "物理百科" },
    { text: "雨是天空写给大地的密信", source: "文学意象库" },
    { text: "潮湿的空气里弥漫着泥土的记忆", source: "自然观察" },
  ],
  海: [
    { text: "海水的咸度约为千分之三十五", source: "海洋学" },
    { text: "海是所有河流的终点和起点", source: "文学意象库" },
  ],
  时间: [
    { text: "时间是熵增的方向", source: "热力学" },
    { text: "钟表只是时间的影子", source: "哲学笔记" },
  ],
  光: [
    { text: "光速是宇宙的速度上限", source: "物理百科" },
    { text: "光穿过棱镜后暴露了自己的秘密", source: "文学意象库" },
  ],
};

function searchMock(query: string): InspirationItem[] {
  const results: InspirationItem[] = [];
  const seen = new Set<string>();
  for (const [keyword, items] of Object.entries(MOCK_DB)) {
    if (query.includes(keyword)) {
      for (const item of items) {
        if (!seen.has(item.text)) {
          seen.add(item.text);
          results.push(item);
        }
      }
    }
  }
  if (results.length === 0 && query.length > 3) {
    return [
      { text: "尝试寻找更精准的名词", source: "词库" },
      { text: "意识流转换的契机", source: "文学意象库" },
    ];
  }
  return results.slice(0, TOP_K);
}

let cachedChunks: ChunkWithEmbedding[] | null = null;

async function loadEmbeddings(): Promise<ChunkWithEmbedding[] | null> {
  if (cachedChunks) return cachedChunks;
  try {
    const raw = await readFile(EMBEDDINGS_PATH, "utf-8");
    const data = JSON.parse(raw) as { chunks: ChunkWithEmbedding[] };
    if (Array.isArray(data.chunks) && data.chunks.length > 0) {
      cachedChunks = data.chunks;
      return cachedChunks;
    }
  } catch {
    // file missing or invalid
  }
  return null;
}

const queryCache = new Map<string, { items: InspirationItem[]; ts: number }>();

function getCached(query: string): InspirationItem[] | null {
  const key = query.trim();
  const ent = queryCache.get(key);
  if (!ent) return null;
  if (Date.now() - ent.ts > CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  return ent.items;
}

function setCache(query: string, items: InspirationItem[]) {
  if (queryCache.size > 50) {
    const first = queryCache.keys().next().value;
    if (first) queryCache.delete(first);
  }
  queryCache.set(query.trim(), { items, ts: Date.now() });
}

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const query = body?.query;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ items: [] });
    }
    const trimmed = query.trim();

    const withTimeout = <T>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
        ),
      ]);

    const items = await withTimeout((async () => {
      const cached = getCached(trimmed);
      if (cached) return cached;

      const apiKey = process.env.OPENAI_API_KEY;
      const chunks = await loadEmbeddings();

      if (apiKey && chunks && chunks.length > 0) {
        const openai = new OpenAI({ apiKey });
        const res = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: trimmed,
        });
        const queryEmbedding = res.data[0].embedding;
        const results = searchChunks(chunks, queryEmbedding, TOP_K);
        setCache(trimmed, results);
        return results;
      }

      await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
      return searchMock(trimmed);
    })());

    const elapsed = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log(`[resonate] query="${trimmed.slice(0, 30)}..." items=${items.length} ms=${elapsed}`);
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
