import Image from "next/image";
import Link from "next/link";
import { Download, Mail } from "lucide-react";
import { profile } from "@/content/profile";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { label: "Overview", href: "/#about" },
  { label: "LinkedIn", href: profile.links.linkedin, external: true },
  { label: "GitHub", href: profile.links.github, external: true },
  { label: "LeetCode", href: profile.links.leetcode, external: true },
  { label: "Ask", href: "/#ask" },
  { label: "Blogs", href: "/blog", route: true },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";
const linkClass = `text-sm text-muted hover:text-fg ${focus}`;

const button = `inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-fg hover:bg-hover sm:px-3 ${focus}`;

export function Nav() {
  return (
    <header className="relative z-50 h-16 border-b border-border bg-bg">
      <nav className="mx-auto grid h-full max-w-6xl grid-cols-[auto_1fr_auto] items-center px-4 md:px-6">
        <a href="#top" className={`flex items-center gap-2.5 justify-self-start ${focus}`}>
          <Image
            src="/daivik.jpg"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full border border-border object-cover object-top"
          />
          <span className="text-sm font-semibold tracking-tight">{profile.name}</span>
        </a>
        <div className="hidden items-center gap-6 justify-self-start pl-10 md:flex">
          {links.map((l) =>
            l.route ? (
              <Link key={l.label} href={l.href} className={linkClass}>{l.label}</Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className={linkClass}
              >
                {l.label}
              </a>
            ),
          )}
        </div>
        <div className="col-start-3 flex items-center gap-2 justify-self-end">
          <a href={`mailto:${profile.email}`} aria-label="Contact" className={button}>
            <Mail size={14} />
            <span className="hidden sm:inline">Contact</span>
          </a>
          <a href={profile.links.resume} download aria-label="Resume" className={button}>
            <Download size={14} />
            <span className="hidden sm:inline">Resume</span>
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
