import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export function ProjectCard({ title, kind, blurb, stack, repo, live, image }: {
  title: string; kind: string; blurb: string; stack: string[]; repo?: string; live?: string; image?: string;
}) {
  const href = live ?? repo;
  return (
    <article className="nb-card nb-lift flex h-full flex-col overflow-hidden">
      {image && (
        <div className="relative border-b-[2.5px] border-ink">
          <a href={href} target="_blank" rel="noreferrer" aria-label={`${title}, ${live ? "live site" : "source code"}`} className="relative block aspect-[16/10] overflow-hidden bg-[#111]">
            <Image
              src={image}
              alt={`${title}: ${blurb}`}
              width={1280}
              height={800}
              sizes="(min-width: 1024px) 560px, 100vw"
              className="size-full object-cover object-top transition-transform duration-500 ease-out hover:scale-105 motion-reduce:transition-none"
            />
          </a>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="mono text-[0.82rem] text-muted">{kind}</p>
          <span className={`nb-tag ${live ? "!bg-accent !text-[#111]" : ""}`}>{live ? "Live" : "Public"}</span>
        </div>
        <h3 className="-mt-1 text-[1.6rem] leading-tight">{title}</h3>
        <p className="text-muted">{blurb}</p>
        <p className="mono text-[0.82rem] font-semibold text-ink">{stack.join(" · ")}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-3 pt-2">
          {live ? (
            <>
              <a href={live} target="_blank" rel="noreferrer" aria-label={`${title}, live site`} className="nb-btn nb-btn-sm nb-btn-accent">
                Visit <ArrowUpRight size={16} />
              </a>
              {repo && <a href={repo} target="_blank" rel="noreferrer" aria-label={`${title}, source code`} className="nb-link">Source</a>}
            </>
          ) : (
            repo && (
              <a href={repo} target="_blank" rel="noreferrer" aria-label={`${title}, source code`} className="nb-btn nb-btn-sm nb-btn-accent">
                Source code <ArrowUpRight size={16} />
              </a>
            )
          )}
        </div>
      </div>
    </article>
  );
}
