"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Flame, Search } from "lucide-react";
import { formatDate, type PostSummary } from "@/lib/blog-shared";


function PostCard({ post, rank }: { post: PostSummary; rank?: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`nb-card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5`}
    >
      {post.thumbnail && (
        <div className="relative aspect-[1200/630] w-full border-b-[3px] border-ink bg-hover">
          <Image
            src={post.thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
      <div className="mono flex items-center justify-between gap-3 text-xs text-subtle">
        <span>
          {formatDate(post.date)} · {post.readingMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1" title="How popular the source topic was when this was written">
          {rank ? <span className="font-semibold text-fg">#{rank}</span> : <Flame size={12} />}
          {post.popularity}
        </span>
      </div>
      <h3 className="mt-3 text-xl leading-tight group-hover:underline group-hover:underline-offset-4">
        {post.title}
      </h3>
      <p className="mt-2 flex-1 text-[15px] leading-6 text-muted">{post.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {post.tags.map((t) => (
          <span key={t} className="nb-tag !text-xs">
            {t}
          </span>
        ))}
      </div>
      </div>
    </Link>
  );
}

export function BlogBrowser({ posts }: { posts: PostSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState<"latest" | "top">("latest");

  const tags = useMemo(() => ["All", ...[...new Set(posts.flatMap((p) => p.tags))].sort()], [posts]);
  const topRanked = useMemo(() => [...posts].sort((a, b) => b.popularity - a.popularity).slice(0, 3), [posts]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts
      .filter((p) => tag === "All" || p.tags.includes(tag))
      .filter((p) => !q || `${p.title} ${p.excerpt} ${p.tags.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => (sort === "top" ? b.popularity - a.popularity : b.date.localeCompare(a.date)));
  }, [posts, query, tag, sort]);

  const filtering = query.trim() !== "" || tag !== "All";

  return (
    <div>
      {!filtering && posts.length > 3 && (
        <section aria-labelledby="top-ranked" className="mb-10">
          <h2 id="top-ranked" className="mb-4 text-3xl">
            Top ranked
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {topRanked.map((p, i) => (
              <PostCard key={p.slug} post={p} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl">
          {filtering ? `${results.length} result${results.length === 1 ? "" : "s"}` : "All posts"}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts"
              aria-label="Search posts"
              className="h-10 w-full rounded-lg border-2 border-ink bg-card pl-9 pr-4 text-sm text-ink placeholder:text-subtle sm:w-60"
            />
          </label>
          <div role="group" aria-label="Sort posts" className="inline-flex rounded-lg border-2 border-ink bg-card p-0.5 text-sm">
            {(["latest", "top"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-md px-3 py-1 font-semibold ${sort === s ? "bg-accent text-[#141414]" : "text-muted hover:text-ink"}`}
              >
                {s === "latest" ? "Latest" : "Top ranked"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            aria-pressed={tag === t}
            className={`nb-tag !px-3 !py-1 !text-sm ${tag === t ? "!bg-accent !text-[#141414]" : "hover:bg-hover"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="nb-card p-6 text-base text-muted">
          No posts match that search. Try a different word or clear the filter.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
