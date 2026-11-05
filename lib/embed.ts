import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";

// Vercel functions can only write to /tmp, so the model is cached there.
if (process.env.VERCEL) env.cacheDir = "/tmp/hf";

let extractor: Promise<FeatureExtractionPipeline> | null = null;

export async function embed(text: string): Promise<number[]> {
  extractor ??= pipeline("feature-extraction", EMBED_MODEL);
  const output = await (await extractor)(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
