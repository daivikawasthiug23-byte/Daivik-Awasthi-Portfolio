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
    <main id="main" className="mx-auto max-w-[1320px] px-4 py-10 md:px-7 md:py-14">
      <section className="nb-card mb-10 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-accent text-[#141414]">
            <Bot size={16} />
          </span>
          <div>
            <h1 className="text-4xl md:text-5xl">Blog</h1>
            <p className="mt-3 max-w-3xl text-base text-muted">
              These posts are written by an AI, not by me. A pipeline picks a trending software engineering or AI topic
              each day, writes a short post from real sources, and checks it against a strict style guide before it goes
              live. Every post links to its sources, so you can verify what it says. It is also a working example of how I
              build guarded AI systems.
            </p>
            <details className="mt-4 text-base text-muted">
              <summary className="cursor-pointer font-semibold text-ink hover:underline hover:underline-offset-4">How it works</summary>
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
        <p className="nb-card p-6 text-base text-muted">The first post is on its way.</p>
      ) : (
        <BlogBrowser posts={posts} />
      )}
    </main>
  );
}
