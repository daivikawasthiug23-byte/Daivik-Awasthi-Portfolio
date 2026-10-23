import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { hasGeminiKeys } from "../../lib/gemini-pool";
import { hasGroqKeys } from "../../lib/groq-pool";
import { makeThumbnail } from "./thumbnail";
import type { Post } from "./types";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Adds a thumbnail to every saved post that does not have one yet. Pass --force to redo all of them.
const FORCE = process.argv.includes("--force");

async function main() {
  if (!hasGroqKeys() && !hasGeminiKeys()) throw new Error("No Groq or Gemini API key is set");
  for (const f of readdirSync("content/blog").filter((f) => f.endsWith(".json"))) {
    const file = `content/blog/${f}`;
    const post = JSON.parse(readFileSync(file, "utf8")) as Post;
    if (post.thumbnail && !FORCE) continue;
    console.log(`Thumbnail for ${post.slug}`);
    const { path, credit } = await makeThumbnail(post);
    post.thumbnail = path;
    post.thumbnailCredit = credit;
    writeFileSync(file, JSON.stringify(post, null, 2) + "\n");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
