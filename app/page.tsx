import Image from "next/image";
import { Building2, FileText, Mail, MapPin, Phone } from "lucide-react";
import { GithubIcon, LeetcodeIcon, LinkedinIcon } from "@/components/BrandIcons";
import { Card, DateTag, Parts, Tag } from "@/components/Card";
import { AskBot } from "@/components/AskBot";
import { ProjectCard } from "@/components/ProjectCard";
import { profile, stats } from "@/content/profile";
import { education, experience } from "@/content/experience";
import { moreOnGithub, projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { getRepo } from "@/lib/github";
import { achievements, leadership } from "@/content/achievements";

const rowLink = "hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

const contactRows = [
  { icon: Building2, text: profile.school },
  { icon: MapPin, text: profile.location },
  { icon: Mail, text: profile.email, href: `mailto:${profile.email}` },
  { icon: LinkedinIcon, text: "linkedin.com/in/daivik-awasthi", href: profile.links.linkedin },
  { icon: GithubIcon, text: "github.com/daivikawasthi01", href: profile.links.github },
  { icon: LeetcodeIcon, text: "leetcode.com/u/Daivik_Awasthi", href: profile.links.leetcode },
  { icon: Phone, text: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
];

export default async function Home() {
  const repos = await Promise.all(projects.map((p) => getRepo(p.repo)));
  const otherRepos = await Promise.all(moreOnGithub.map((m) => getRepo(m.url)));
  return (
    <main id="top" className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:col-span-4">
          <Card id="about">
            <div className="flex flex-col items-start">
              <Image
                src="/daivik.jpg"
                alt="Daivik Awasthi"
                width={240}
                height={240}
                priority
                className="size-60 shrink-0 self-center rounded-full border border-border object-cover object-top"
              />
              <h1 className="mt-4 self-center text-2xl font-semibold tracking-tight text-fg">{profile.name}</h1>
              <p className="mt-1 self-center text-sm font-medium text-fg">{profile.role}</p>
            </div>
            <div className="mt-4 space-y-2 text-sm leading-6 text-muted">
              {profile.intro.map((t) => <p key={t}>{t}</p>)}
            </div>
            <a
              href={profile.links.resume}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-bg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <FileText size={16} /> View Resume
            </a>
            <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted">
              {contactRows.map(({ icon: Icon, text, href }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <Icon size={14} className="shrink-0 text-subtle" />
                  {href ? (
                    <a
                      href={href}
                      {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      className={`break-all ${rowLink}`}
                    >
                      {text}
                    </a>
                  ) : (
                    <span>{text}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card id="achievements" title="Achievements">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted marker:text-subtle">
              {achievements.map((a, i) => <li key={i}><Parts parts={a} /></li>)}
            </ul>
          </Card>

          <Card id="skills" title="Skills">
            <div className="space-y-4">
              {skills.map((g) => (
                <div key={g.group}>
                  <p className="mb-2 font-mono text-xs uppercase tracking-wider text-subtle">{g.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((i) => <Tag key={i}>{i}</Tag>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card id="leadership" title="Leadership">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {leadership.map((l) => (
                <li key={l.org}>
                  <span className="font-medium text-fg">{l.role}</span>, {l.org}
                  <span className="block text-subtle">({l.dates})</span>
                  {l.text}
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-surface px-3 py-5 text-center">
                <p className="flex items-baseline justify-center gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-fg xl:text-3xl">{s.value}</span>
                  {s.unit && <span className="text-sm text-subtle">{s.unit}</span>}
                </p>
                <p className="mt-2 text-xs font-medium text-subtle">{s.label}</p>
              </div>
            ))}
          </section>

          <Card title="Education" aside={education.dates}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-base font-medium text-fg">
                {education.degree} <span className="font-normal text-muted">({education.branch})</span>
              </h3>
              <span className="shrink-0 text-xs text-muted">{education.gpa}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{education.school}</p>
            <p className="mb-2 mt-5 font-mono text-xs uppercase tracking-wider text-subtle">Relevant Coursework</p>
            <div className="flex flex-wrap gap-1.5">
              {education.coursework.map((c) => <Tag key={c}>{c}</Tag>)}
            </div>
          </Card>

          <Card id="experience" title="Experience">
            {experience.map((e) => (
              <div key={e.company}>
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <h3 className="text-base font-medium text-fg">{e.company}</h3>
                  <DateTag>{e.dates}</DateTag>
                </div>
                <p className="mt-1 text-sm text-muted">{e.role}, {e.location}</p>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-muted marker:text-subtle">
                  {e.points.map((p, i) => <li key={i}><Parts parts={p} /></li>)}
                </ul>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {e.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                </div>
              </div>
            ))}
          </Card>

          <div id="projects" className="scroll-mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-heading text-base font-semibold uppercase tracking-wider text-fg">Projects</h2>
              <a href={profile.links.github} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-fg">
                See all on GitHub
              </a>
            </div>
            <p className="mb-3 text-sm font-medium text-fg">Featured projects</p>
            <div className="flex flex-col gap-4">
              {projects.map((p, i) => (
                <ProjectCard
                  key={p.slug}
                  title={p.title}
                  repo={p.repo}
                  live={p.live}
                  stack={p.stack}
                  points={p.points}
                  gh={repos[i]}
                />
              ))}
            </div>

            <p className="mb-3 mt-8 border-t border-border pt-6 text-sm font-medium text-fg">Other projects</p>
            <div className="flex flex-col gap-4">
              {moreOnGithub.map((m, i) => (
                <ProjectCard
                  key={m.name}
                  title={m.name}
                  repo={m.url}
                  live={m.live}
                  stack={m.stack}
                  description={m.note}
                  gh={otherRepos[i]}
                />
              ))}
            </div>
          </div>

          {process.env.GROQ_API_KEY && <AskBot />}
        </div>
      </div>
    </main>
  );
}
