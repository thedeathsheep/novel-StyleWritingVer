import { NextResponse } from "next/server";
import {
  appendLibraryChunks,
  chunkText,
  getLibraryChunks,
} from "@/lib/user-libraries";
import type { LibraryChunk } from "@/lib/types";
import {
  getEmbeddingConfigFromRequest,
  embedMany,
} from "@/lib/ai-provider";

const MAX_CHUNKS_PER_REQUEST = 50;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    let text = body?.text;
    const source = typeof body?.source === "string" ? body.source.trim() : "用户导入";

    if (body?.file) {
      return NextResponse.json(
        { error: "File upload not implemented in this route; use text or multipart" },
        { status: 400 },
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    text = text.trim();
    if (text.length < 2) {
      return NextResponse.json({ error: "text too short" }, { status: 400 });
    }

    const segments = chunkText(text, MAX_CHUNKS_PER_REQUEST);
    if (segments.length === 0) {
      return NextResponse.json({ ok: true, chunksAdded: 0 });
    }

    const embeddingConfig = getEmbeddingConfigFromRequest(req);
    if (!embeddingConfig.apiKey) {
      return NextResponse.json(
        {
          error:
            "API key not configured. Set provider and key in Settings or in server .env (e.g. OPENAI_API_KEY, SILICONFLOW_API_KEY, AIHUBMIX_API_KEY, GOOGLE_GEMINI_API_KEY).",
        },
        { status: 503 },
      );
    }

    const batchSize = 20;
    const newChunks: LibraryChunk[] = [];

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const inputs = batch.map((s) => s.text);
      const embeddings = await embedMany(embeddingConfig, inputs);
      for (let j = 0; j < batch.length; j++) {
        const emb = embeddings[j];
        if (emb) {
          newChunks.push({
            text: batch[j].text,
            source,
            embedding: emb,
          });
        }
      }
    }

    const added = await appendLibraryChunks(id, newChunks);
    const total = (await getLibraryChunks(id)).length;
    return NextResponse.json({ ok: true, chunksAdded: added, totalChunks: total });
  } catch (e) {
    console.error("[libraries] ingest error", e);
    return NextResponse.json(
      { error: "Ingest failed" },
      { status: 500 },
    );
  }
}
