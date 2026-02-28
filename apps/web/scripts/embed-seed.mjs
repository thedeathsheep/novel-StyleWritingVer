/**
 * One-time script: embed seed chunks with OpenAI and write embeddings.json.
 * Run from apps/web: node scripts/embed-seed.mjs
 * Requires OPENAI_API_KEY in env.
 */
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHUNKS_PATH = join(ROOT, "lib", "data", "resonate-chunks.json");
const OUT_PATH = join(ROOT, "lib", "data", "embeddings.json");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const raw = await readFile(CHUNKS_PATH, "utf-8");
  const chunks = JSON.parse(raw);
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error("resonate-chunks.json must be a non-empty array");
  }

  const model = "text-embedding-3-small";
  const batchSize = 20;
  const results = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);
    const res = await openai.embeddings.create({ model, input: texts });
    for (let j = 0; j < batch.length; j++) {
      results.push({
        text: batch[j].text,
        source: batch[j].source,
        embedding: res.data[j].embedding,
      });
    }
    console.log(`Embedded ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`);
  }

  await writeFile(OUT_PATH, JSON.stringify({ chunks: results }, null, 0), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
