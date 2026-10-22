import index from "@/data/index.json";
import { embed } from "./embed";
import type { IndexedChunk } from "./types";

const chunks = index.chunks as IndexedChunk[];

const TOP_K = 5;
const MIN_SCORE = 0.1;

// Embeddings are normalised, so the dot product is the cosine similarity.
const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export async function retrieve(question: string) {
  const q = await embed(question);
  return chunks
    .map((c) => ({ chunk: c, score: dot(q, c.embedding) }))
    .filter((r) => r.score > MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((r) => ({ ...r.chunk, score: r.score }));
}

// Source chips are only a hint, so they are stricter than the context sent to the model:
// a chunk must be a good match on its own and close to the best one.
const SOURCE_MIN = 0.3;
const SOURCE_RATIO = 0.65;
const SOURCE_MAX = 3;

export function pickSources(docs: { title: string; href: string; score: number }[]) {
  const top = docs[0]?.score ?? 0;
  const seen = new Set<string>();
  return docs
    .filter((d) => d.score >= Math.max(SOURCE_MIN, top * SOURCE_RATIO))
    .filter((d) => !seen.has(d.title) && seen.add(d.title))
    .slice(0, SOURCE_MAX)
    .map((d) => ({ title: d.title, href: d.href }));
}
