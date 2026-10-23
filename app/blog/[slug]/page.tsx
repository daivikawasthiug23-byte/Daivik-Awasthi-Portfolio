import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getPost, getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/blog-shared";

// Cache Components needs at least one static param. With no posts yet, a placeholder slug is prerendered and 404s.
export function generateStaticParams() {
  const slugs = getPosts().map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: "no-posts-yet" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  return post ? { title: `${post.title} | Daivik Awasthi`, description: post.excerpt, ...(post.thumbnail && { openGraph: { images: [post.thumbnail] } }) } : {};
}

type Params = Promise<{ slug: string }>;

// Reading params outside Suspense would tie the shared App Shell to one URL, so only the back link stays outside.
export default function BlogPost({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> All posts
      </Link>

      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-hover" />}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}

async function Article({ params }: { params: Params }) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  return (
      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-subtle">
          <span>
            {formatDate(post.date)} · {post.readingMinutes} min read
          </span>
          {post.tags.map((t) => (
            <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-muted">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-fg">{post.title}</h1>

        {post.thumbnail && (
          <figure className="mt-6">
            <div className="relative aspect-[1200/630] overflow-hidden rounded-lg border border-border bg-hover">
              <Image src={post.thumbnail} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
            </div>
            {post.thumbnailCredit && (
              <figcaption className="mt-1.5 text-xs text-subtle">
                Photo by{" "}
                <a href={post.thumbnailCredit.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg">
                  {post.thumbnailCredit.name}
                </a>{" "}
                on{" "}
                <a href={post.thumbnailCredit.photoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg">
                  Unsplash
                </a>
              </figcaption>
            )}
          </figure>
        )}

        <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs leading-5 text-muted">
          <Bot size={14} className="mt-0.5 shrink-0 text-subtle" />
          <span>
            Written by an AI pipeline from the sources listed below and checked automatically for tone and accuracy. It may
            still contain mistakes, so check the sources for anything important.
          </span>
        </p>

        <div className="mt-8 text-base leading-7 text-muted">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight text-fg">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-6 text-base font-semibold text-fg">{children}</h3>,
              p: ({ children }) => <p className="mt-4">{children}</p>,
              ul: ({ children }) => <ul className="mt-4 list-disc space-y-1.5 pl-6 marker:text-subtle">{children}</ul>,
              ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1.5 pl-6 marker:text-subtle">{children}</ol>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-fg underline underline-offset-4 decoration-border hover:decoration-fg">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => <blockquote className="mt-4 border-l-2 border-border pl-4 italic">{children}</blockquote>,
              pre: ({ children }) => (
                <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-[13px] leading-6 text-fg">{children}</pre>
              ),
              code: ({ children, className }) =>
                className ? (
                  <code className={className}>{children}</code>
                ) : (
                  <code className="rounded bg-hover px-1.5 py-0.5 font-mono text-[0.9em] text-fg">{children}</code>
                ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>

        <section className="mt-12 border-t border-border pt-6">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-fg">Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-muted hover:text-fg">
                  <span>{s.title}</span>
                  <ArrowUpRight size={13} className="mt-1 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
  );
}
