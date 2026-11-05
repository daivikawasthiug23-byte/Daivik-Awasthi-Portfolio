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
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 md:px-7 md:py-14">
      <Link href="/blog" className="nb-btn">
        <ArrowLeft size={14} /> All posts
      </Link>

      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl border-[3px] border-ink bg-hover" />}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}

async function Article({ params }: { params: Params }) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  return (
      <article className="mt-8">
        <div className="mono flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-subtle">
          <span>
            {formatDate(post.date)} · {post.readingMinutes} min read
          </span>
          {post.tags.map((t) => (
            <span key={t} className="nb-tag !text-xs">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-4xl md:text-5xl">{post.title}</h1>

        {post.thumbnail && (
          <figure className="mt-6">
            <div className="relative aspect-[1200/630] overflow-hidden rounded-2xl border-[3px] border-ink bg-hover shadow-[6px_6px_0_var(--shadow)]">
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

        <p className="mt-7 flex items-start gap-2 rounded-xl border-2 border-ink bg-card p-3 text-sm leading-5 text-muted">
          <Bot size={14} className="mt-0.5 shrink-0 text-subtle" />
          <span>
            Written by an AI pipeline from the sources listed below and checked automatically for tone and accuracy. It may
            still contain mistakes, so check the sources for anything important.
          </span>
        </p>

        <div className="mt-8 text-base leading-7 text-muted">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className="mb-3 mt-10 text-2xl">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg">{children}</h3>,
              p: ({ children }) => <p className="mt-4">{children}</p>,
              ul: ({ children }) => <ul className="mt-4 list-disc space-y-1.5 pl-6 marker:text-subtle">{children}</ul>,
              ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1.5 pl-6 marker:text-subtle">{children}</ol>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => <blockquote className="mt-4 border-l-[3px] border-accent pl-4 italic">{children}</blockquote>,
              pre: ({ children }) => (
                <pre className="mt-4 overflow-x-auto rounded-xl border-2 border-ink bg-card p-4 font-mono text-[13px] leading-6 text-ink">{children}</pre>
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

        <section className="mt-12 border-t-[3px] border-ink pt-6">
          <h2 className="text-2xl">Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-muted hover:text-ink">
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
