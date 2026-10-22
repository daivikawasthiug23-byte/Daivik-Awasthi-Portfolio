import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { BlogBrowser } from "@/components/BlogBrowser";
import { getPosts, summarize } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Daivik Awasthi",
  description: "Daily engineering posts written by an AI pipeline from trending topics, checked automatically and linked to their sources.",
};

const steps = [
  "Every morning a scheduled job reads today's trending engineering topics from Hacker News, dev.to and GitHub.",
  "It picks one that has not been covered, then collects short summaries from the sources to write from.",
  "An AI model writes the post to a fixed style guide, using only facts from those sources.",
  "Code checks reject emojis, dashes, filler phrases, made-up numbers and unknown links. A second AI pass scores tone and accuracy.",
  "If a post still fails after two rewrites, nothing is published that day.",
];

export default function Blog() {
  const posts = getPosts().map(summarize);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="mb-8 rounded-lg border border-border bg-surface p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted">
            <Bot size={16} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Blog</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              These posts are written by an AI, not by me. A pipeline picks a trending software engineering or AI topic
              each day, writes a short post from real sources, and checks it against a strict style guide before it goes
              live. Every post links to its sources, so you can verify what it says. It is also a working example of how I
              build guarded AI systems.
            </p>
            <details className="mt-3 text-sm text-muted">
              <summary className="cursor-pointer text-fg hover:underline hover:underline-offset-4">How it works</summary>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-6">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-subtle">
                The number on each card is how popular its source topic was on the day it was written, from 0 to 100.
              </p>
            </details>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">The first post is on its way.</p>
      ) : (
        <BlogBrowser posts={posts} />
      )}
    </main>
  );
}
