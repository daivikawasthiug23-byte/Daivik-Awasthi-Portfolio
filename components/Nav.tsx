"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { profile } from "@/content/profile";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { label: "Experience", href: "/#experience", id: "experience" },
  { label: "Projects", href: "/#projects", id: "projects" },
  { label: "Skills", href: "/#skills", id: "skills" },
  { label: "Blog", href: "/blog", id: "blog" },
  { label: "Contact", href: "/#contact", id: "contact" },
];

const item =
  "flex min-h-11 items-center rounded-md border-[2.5px] border-transparent px-3 font-bold text-ink transition-[background-color,box-shadow] duration-150 hover:bg-alt";
const current = "!border-ink !bg-accent !text-[#111] shadow-[3px_3px_0_var(--shadow)]";

export function Nav() {
  const pathname = usePathname();
  const [section, setSection] = useState("");
  const [menu, setMenu] = useState(false);

  // Highlights the section in the middle of the screen, and "Contact" once the page bottoms out.
  useEffect(() => {
    if (pathname !== "/") return;
    const ids = links.filter((l) => l.href.startsWith("/#")).map((l) => l.id);
    const onScroll = () => {
      const middle = innerHeight / 2;
      let now = "";
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) now = "contact";
      else {
        for (const id of ids) {
          const r = document.getElementById(id)?.getBoundingClientRect();
          if (r && r.top <= middle && r.bottom > middle) now = id;
        }
      }
      setSection(now);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [menu]);

  const active = pathname.startsWith("/blog") ? "blog" : section;
  const [first, ...rest] = profile.name.split(" ");

  return (
    <header className="sticky top-0 z-40 border-b-[2.5px] border-ink bg-bg">
      <div className="mx-auto flex min-h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 md:px-7">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 text-lg font-extrabold tracking-tight text-ink">
          <Image
            src="/daivik-new.jpg"
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-full border-2 border-ink object-cover object-top"
          />
          <span>
            {first}
            <span className="text-accent"> {rest.join(" ")}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.id}>
                  <Link href={l.href} aria-current={active === l.id ? "true" : undefined} className={`${item} ${active === l.id ? current : ""}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg border-[2.5px] border-ink bg-card text-ink shadow-[3px_3px_0_var(--shadow)] lg:hidden"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {menu && (
        <nav id="mobile-menu" aria-label="Primary" className="border-t-[2.5px] border-ink bg-bg lg:hidden">
          <ul className="mx-auto grid max-w-[1320px] gap-1 px-4 py-3 md:px-7">
            {links.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.href}
                  onClick={() => setMenu(false)}
                  aria-current={active === l.id ? "true" : undefined}
                  className={`${item} ${active === l.id ? current : ""}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
