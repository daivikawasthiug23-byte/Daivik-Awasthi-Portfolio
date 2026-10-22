import { ArrowUpRight, GitFork, Star } from "lucide-react";
import type { Point } from "@/content/experience";
import type { RepoInfo } from "@/lib/github";
import { Parts, Tag } from "./Card";

const iconLink =
  "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-fg hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

export function ProjectCard({ title, repo, live, stack, points, description, gh }: {
  title: string; repo?: string; live?: string; stack: string[];
  points?: Point[]; description?: string; gh: RepoInfo | null;
}) {
  const text = description ?? gh?.description;
  return (
    <article className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-fg/20 md:p-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-fg">{title}</h3>
          {gh?.isPublic && (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-subtle">Public</span>
          )}
        </div>
        <div className="flex gap-2">
          {repo && <a href={repo} target="_blank" rel="noreferrer" aria-label={`${title} code`} className={iconLink}>Code <ArrowUpRight size={12} /></a>}
          {live && <a href={live} target="_blank" rel="noreferrer" aria-label={`${title} live`} className={iconLink}>Live <ArrowUpRight size={12} /></a>}
        </div>
      </div>
      {text && <p className="mt-3 text-sm leading-6 text-fg">{text}</p>}
      {gh && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
          {gh.language && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted" aria-hidden="true" />
              {gh.language}
            </span>
          )}
          <span className="inline-flex items-center gap-1"><Star size={13} /> {gh.stars}</span>
          <span className="inline-flex items-center gap-1"><GitFork size={13} /> {gh.forks}</span>
          <span>Updated {gh.updated}</span>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {stack.map((t) => <Tag key={t}>{t}</Tag>)}
      </div>
      {points && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
          {points.map((x, j) => (
            <li key={j} className="flex gap-2">
              <span aria-hidden="true" className="text-subtle">▹</span>
              <span><Parts parts={x} /></span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
