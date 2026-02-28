import type { InspirationItem } from "./types";

export interface ChunkWithEmbedding extends InspirationItem {
  embedding: number[];
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function norm(v: number[]): number {
  return Math.sqrt(dot(v, v)) || 1e-10;
}

/**
 * Cosine similarity: a·b / (|a||b|). Assumes embeddings from same model (same dim).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  return dot(a, b) / (norm(a) * norm(b));
}

/**
 * Search chunks by query embedding; returns top-K items by similarity.
 */
export function searchChunks(
  chunks: ChunkWithEmbedding[],
  queryEmbedding: number[],
  topK: number
): InspirationItem[] {
  const scored = chunks.map((c) => ({
    item: { text: c.text, source: c.source },
    score: cosineSimilarity(c.embedding, queryEmbedding),
  }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topK).map((x) => x.item);
}
