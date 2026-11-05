import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import type { Post } from "./types";

// Deletes posts (and their thumbnails) older than the TTL. Run with --dry to only list what would go.
// TTL is BLOG_TTL_DAYS, default 90. Set it to 0 to disable pruning.
const DIR = "content/blog";
const ttlDays = Number(process.env.BLOG_TTL_DAYS || 90);
const dry = process.argv.includes("--dry");

if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
  console.log("Pruning is disabled (BLOG_TTL_DAYS is 0 or invalid)");
  process.exit(0);
}

const cutoff = new Date(Date.now() - ttlDays * 86_400_000).toISOString().slice(0, 10);
let removed = 0;

for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const file = `${DIR}/${f}`;
  const post = JSON.parse(readFileSync(file, "utf8")) as Post;
  if (post.date >= cutoff) continue;

  console.log(`${dry ? "Would remove" : "Removing"} ${post.slug} (${post.date})`);
  removed++;
  if (dry) continue;

  unlinkSync(file);
  // thumbnail is a public path such as /blog/<slug>.jpg
  const thumb = post.thumbnail && `public${post.thumbnail}`;
  if (thumb && thumb.startsWith("public/blog/") && existsSync(thumb)) unlinkSync(thumb);
}

console.log(`${removed} post(s) older than ${ttlDays} days (before ${cutoff})${dry ? " would be removed" : " removed"}`);
