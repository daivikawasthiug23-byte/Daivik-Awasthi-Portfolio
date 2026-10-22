import type { Post } from "@/scripts/blog/types";

// Browser-safe helpers. Anything that reads files lives in lib/blog.ts, which client components must not import.
export type PostSummary = Omit<Post, "body">;

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
