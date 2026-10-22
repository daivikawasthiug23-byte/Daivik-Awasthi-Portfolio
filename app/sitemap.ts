import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  return [
    { url: SITE_URL, lastModified: posts[0]?.date, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: posts[0]?.date, changeFrequency: "daily", priority: 0.7 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
