import Image from "next/image";
import Link from "next/link";
import { Download, Mail } from "lucide-react";
import { GithubIcon, LeetcodeIcon, LinkedinIcon } from "@/components/BrandIcons";
import { profile } from "@/content/profile";

const nav = [
  { label: "Experience", href: "/#experience" },
  { label: "Projects", href: "/#projects" },
  { label: "Skills", href: "/#skills" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/#contact" },
];

const square =
  "flex size-11 items-center justify-center rounded-lg border-2 border-ink bg-card text-ink transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--shadow)]";

export function Footer() {
  const social = [
    { label: "GitHub", href: profile.links.github, icon: <GithubIcon size={18} /> },
    { label: "LinkedIn", href: profile.links.linkedin, icon: <LinkedinIcon size={18} /> },
    { label: "LeetCode", href: profile.links.leetcode, icon: <LeetcodeIcon size={18} /> },
  ];
  return (
    <footer className="border-t-[2.5px] border-ink bg-bg py-10">
      <div className="mx-auto max-w-[1320px] px-4 pb-14 md:px-7">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 text-lg font-extrabold tracking-tight text-ink">
              <Image src="/daivik-new.jpg" alt="" width={36} height={36} className="size-9 rounded-full border-2 border-ink object-cover object-top" />
              <span>{profile.name}</span>
            </Link>
            <p className="mt-2 text-sm text-muted">Still learning, always building.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5">
              {nav.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center font-semibold text-ink hover:underline hover:decoration-accent hover:decoration-[3px] hover:underline-offset-[5px]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-5 border-t-2 border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono text-xs text-muted">© 2026 {profile.name}</p>
          <ul className="flex flex-wrap items-center gap-2">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={square}>
                  {s.icon}
                  <span className="sr-only">{s.label} (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${profile.email}`} className={square}>
                <Mail size={18} aria-hidden />
                <span className="sr-only">Email</span>
              </a>
            </li>
            <li>
              <a href={profile.links.resume} target="_blank" rel="noopener noreferrer" className={square}>
                <Download size={18} aria-hidden />
                <span className="sr-only">Resume, PDF (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
