import Image from "next/image";
import { FileText, Mail } from "lucide-react";
import { EmailActions } from "@/components/EmailActions";
import { Section, Tag } from "@/components/Card";
import { ProjectCard } from "@/components/ProjectCard";
import { Swipe } from "@/components/Swipe";
import { profile, stats } from "@/content/profile";
import { experience, timeline } from "@/content/experience";
import { inTheWorks, moreOnGithub, projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { achievements } from "@/content/achievements";

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
// Deployed web apps come first, then the projects that have no live version.
const allProjects = [
  ...projects.map((p) => ({
    slug: p.slug, title: p.title, kind: p.kind, blurb: p.blurb, stack: p.stack,
    repo: p.repo, live: p.live, image: p.image,
  })),
  ...moreOnGithub.map((m) => ({
    slug: slugify(m.name), title: m.name, kind: m.kind, blurb: m.blurb,
    stack: m.stack, repo: m.url, live: m.live, image: m.image,
  })),
].sort((a, b) => Number(!!b.live) - Number(!!a.live));

export default function Home() {
  return (
    <main id="main">
      {/* Hero */}
      <section id="top" className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-16 pt-12 md:px-7 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
        <div>
          <h1 className="text-balance text-[2.25rem] leading-[1.06] tracking-tight sm:text-[3.4rem] lg:text-[3.6rem]">
            Hi, I&apos;m {profile.name}.
            <br />
            {profile.intro[0]}
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg text-muted sm:text-[1.15rem]">{profile.intro[1]}</p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <a href={profile.links.resume} target="_blank" rel="noreferrer" className="nb-btn nb-btn-accent">
              <FileText size={18} /> View Resume
            </a>
            <a href={`mailto:${profile.email}`} className="nb-btn">
              <Mail size={18} /> Contact
            </a>
          </div>
        </div>

        <div className="relative w-full max-w-[420px] justify-self-center">
          <div className="nb-card overflow-hidden bg-accent !shadow-[10px_10px_0_var(--shadow)]">
            <Image
              src="/daivik-new.jpg"
              alt="Photo of Daivik Awasthi"
              width={852}
              height={1080}
              priority
              sizes="(min-width: 1024px) 420px, 90vw"
              className="aspect-square w-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mx-auto max-w-[1320px] px-4 pb-16 md:px-7 md:pb-20">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="nb-card flex flex-col px-4 py-4 text-center">
              <dt className="order-2 text-sm text-muted">{s.label}</dt>
              <dd className="text-3xl font-extrabold tracking-tight text-ink">
                {s.value}
                {s.unit && <span className="ml-1 text-base font-semibold text-muted">{s.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Experience: write-up on the left, timeline card on the right */}
      <section id="experience" aria-labelledby="experience-title" className="scroll-mt-20 border-t-[2.5px] border-ink bg-alt py-16 md:py-20">
        <div className="mx-auto grid max-w-[1320px] items-start gap-10 px-4 md:px-7 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            <h2 id="experience-title" className="text-[2rem] md:text-[2.75rem]">Experience</h2>
            <div className="mt-8 grid max-w-[44ch] gap-5 text-[1.15rem] leading-[1.7]">
              {experience[0].about.map((p, i) => (
                <p key={i}>
                  {p.map((x, j) =>
                    typeof x === "string" ? x : (
                      <strong key={j} className="font-bold text-ink">{x.b}</strong>
                    ),
                  )}
                </p>
              ))}
            </div>
          </div>
          <div className="nb-card p-6">
            <h3 className="text-lg">Timeline</h3>
            <ol className="mt-5 border-l-[2.5px] border-ink pl-6">
              {timeline.map((t) => (
                <li key={t.title} className="relative pb-6 last:pb-0">
                  <span aria-hidden className="absolute -left-[33.5px] top-1.5 size-3 rounded-sm border-[2.5px] border-ink bg-accent" />
                  <p className="mono text-[0.85rem] text-muted">{t.when}</p>
                  <p className="mt-0.5 text-[1.15rem] font-extrabold text-ink">
                    {t.href ? (
                      <a href={t.href} className="underline decoration-accent decoration-[3px] underline-offset-4 hover:decoration-4">{t.title}</a>
                    ) : (
                      t.title
                    )}
                  </p>
                  <p className="text-muted">{t.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Projects */}
      <Section id="projects" title="Projects" subtitle="Things I've built. The web apps are live, and the code is public.">
        <Swipe label="Projects">
          {allProjects.map(({ slug, ...p }) => <ProjectCard key={slug} {...p} />)}
        </Swipe>

        <h3 className="mt-14 text-[1.35rem]">In the works</h3>
        <ul className="mt-4 grid gap-5 md:grid-cols-2">
          {inTheWorks.map((w) => (
            <li key={w.name}>
              <a href={w.url} target="_blank" rel="noreferrer" className="block h-full rounded-[10px] border-[2.5px] border-dashed border-ink bg-card p-5">
                <p className="mono text-[0.82rem] text-muted">{w.kind}</p>
                <h4 className="text-xl">{w.name}</h4>
                <p className="mt-1.5 text-[0.97rem] text-muted">{w.blurb}</p>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-9">
          <a href={profile.links.github} target="_blank" rel="noreferrer" className="nb-btn">See all on GitHub ↗</a>
        </p>
      </Section>

      {/* Achievements */}
      <Section id="achievements" title="Achievements" band>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a, i) => (
            <li
              key={a.label}
              className={`nb-card flex flex-col gap-2 p-6 ${i === 0 ? "!bg-accent text-[#111]" : ""}`}
            >
              <p className={`font-extrabold leading-none tracking-tight ${a.stat.length > 8 ? "text-[1.9rem] sm:pt-2.5" : "text-[2.6rem]"}`}>{a.stat}</p>
              <p className="mt-1 text-[1.05rem] font-bold leading-snug">{a.label}</p>
              <p className={`text-[0.95rem] ${i === 0 ? "text-[#111]/80" : "text-muted"}`}>{a.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Skills */}
      <Section id="skills" title="Skills" subtitle="What I use to build and ship things.">
        <dl className="nb-card px-6 py-2">
          {skills.map((g) => (
            <div key={g.group} className="grid gap-2 border-t-2 border-line py-4 first:border-t-0 md:grid-cols-[140px_1fr] md:items-center md:gap-5">
              <dt className="font-extrabold text-ink">{g.group}</dt>
              <dd>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map((i) => <li key={i}><Tag>{i}</Tag></li>)}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Closing call to action */}
      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20 border-t-[2.5px] border-ink bg-alt py-16 md:py-20">
        <div className="mx-auto max-w-[1320px] px-4 md:px-7">
          <div className="rounded-[10px] border-[2.5px] border-ink bg-accent px-6 py-10 text-[#111] shadow-[10px_10px_0_var(--ink)] sm:p-14">
            <h2 id="contact-title" className="max-w-[20ch] text-[1.9rem] leading-[1.08] !text-[#111] sm:text-5xl">Hiring a new engineer? Let&apos;s talk.</h2>
            <p className="mt-3.5 max-w-[52ch] text-[1.1rem]">I&apos;m looking for my first full-time role. Send me an email or take a look at my resume.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-[2.5px] border-[#111] bg-[#111] px-5 font-bold text-white shadow-[4px_4px_0_#fff] transition-[transform,box-shadow] duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[1px_1px_0_#fff]"
              >
                <Mail size={18} /> Email me
              </a>
              <a
                href={profile.links.resume}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-[2.5px] border-[#111] bg-white px-5 font-bold text-[#111] shadow-[4px_4px_0_#111] transition-[transform,box-shadow] duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[1px_1px_0_#111]"
              >
                <FileText size={18} /> Resume
              </a>
            </div>
            <div className="mt-9 border-t-[2.5px] border-[#111] pt-7">
              <p className="font-bold">Or email me at</p>
              <p className="mono mt-1 break-all text-lg font-bold sm:text-2xl">{profile.email}</p>
              <div className="mt-5"><EmailActions email={profile.email} /></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
