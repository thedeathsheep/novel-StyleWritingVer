import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  appendLibraryChunks,
  chunkText,
  getLibraryChunks,
} from "@/lib/user-libraries";
import type { LibraryChunk } from "@/lib/types";

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

    const apiKey = req.headers.get("X-OpenAI-API-Key")?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured. Set it in Settings or in server .env" },
        { status: 503 },
      );
    }

    const openai = new OpenAI({ apiKey });
    const model = "text-embedding-3-small";
    const batchSize = 20;
    const newChunks: LibraryChunk[] = [];

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const inputs = batch.map((s) => s.text);
      const res = await openai.embeddings.create({ model, input: inputs });
      for (let j = 0; j < batch.length; j++) {
        newChunks.push({
          text: batch[j].text,
          source,
          embedding: res.data[j].embedding,
        });
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
