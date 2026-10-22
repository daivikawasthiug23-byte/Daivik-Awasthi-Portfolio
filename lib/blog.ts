import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Post } from "@/scripts/blog/types";
import type { PostSummary } from "./blog-shared";

const dir = path.join(process.cwd(), "content/blog");

export function getPosts(): Post[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Post)
    .sort((a, b) => b.date.localeCompare(a.date) || b.popularity - a.popularity);
}

export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug);

export const summarize = (post: Post): PostSummary => {
  const summary: Partial<Post> = { ...post };
  delete summary.body;
  return summary as PostSummary;
};
