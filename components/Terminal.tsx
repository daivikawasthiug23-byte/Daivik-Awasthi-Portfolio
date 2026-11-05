"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Joystick } from "./Joystick";
import { profile } from "@/content/profile";
import { experience } from "@/content/experience";
import { moreOnGithub, projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { achievements } from "@/content/achievements";


// Same order as the page: deployed web apps first.
const all = [
  ...projects.map((p) => ({ name: p.title, url: p.live ?? p.repo ?? profile.links.github, shot: !!p.live })),
  ...moreOnGithub.map((m) => ({ name: m.name, url: m.live ?? m.url, shot: !!m.live })),
].sort((a, b) => Number(b.shot) - Number(a.shot));

const commands = [
  "about", "work", "projects", "open", "skills", "achievements",
  "contact", "github", "linkedin", "leetcode", "resume", "blog", "theme", "clear", "help",
];

const group = (name: string) => skills.find((g) => g.group.startsWith(name))?.items.join(", ") ?? "";
const PROMPT = "❯";
const NEXT = (c: string) => `Next: ${c}`;

type Line = { kind: "in" | "out"; text: string };

function linkify(text: string): ReactNode {
  return text.split(/(https?:\/\/\S+|\b[\w.-]+@[\w.-]+\.\w+)/g).map((part, i) => {
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent underline">{part}</a>;
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(part)) return <a key={i} href={`mailto:${part}`} className="text-accent underline">{part}</a>;
    return part;
  });
}

export function Terminal() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Hi, I’m Daivik. Type projects to see what I’ve built." },
  ]);
  const [input, setInput] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const say = (...text: string[]) => setLines((l) => [...l, ...text.map((t) => ({ kind: "out" as const, text: t }))]);

  const visit = (label: string, url: string) => {
    window.open(url, "_blank", "noopener");
    say(`Opening ${label}: ${url}`);
  };

  function run(raw: string) {
    const line = raw.trim();
    if (!line) return;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ").toLowerCase();
    const c = cmd.toLowerCase();

    if (c === "clear") return setLines([]);
    setLines((l) => [...l, { kind: "in", text: line }]);

    switch (c) {
      case "help":
        return say(`Try ${commands.filter((x) => x !== "help").join(", ")}. Start with projects.`);
      case "about":
        return say(`${profile.intro.join(" ")} ${NEXT("work")}`);
      case "work": {
        const e = experience[0];
        return say(`${e.company}, ${e.role} (${e.dates}). ${e.summary} ${NEXT("projects")}`);
      }
      case "projects":
        return say("Here is what I’ve built:", ...all.map((p, i) => `${i + 1}  ${p.name}`), "Type open 1 to visit one.");
      case "open": {
        if (!arg) return say("Open which one? Try open 1, or a project name.");
        const i = Number(arg);
        const p = Number.isInteger(i) ? all[i - 1] : all.find((x) => x.name.toLowerCase().includes(arg));
        return p ? visit(p.name, p.url) : say(`No project called ${arg}. Type projects to see the list.`);
      }
      case "skills":
        return say(`I mostly write ${group("Languages")}, building on ${group("Frontend")} and ${group("Backend")}, with ${group("Databases")} for data. ${NEXT("achievements")}`);
      case "achievements":
        return say(`${achievements.slice(0, 3).map((a) => `${a.stat} ${a.label.toLowerCase()}`).join(", ")}. ${NEXT("contact")}`);
      case "contact":
        return say(`Email me at ${profile.email} or call ${profile.phone}. ${NEXT("resume")}`);
      case "github":
        return visit("GitHub", profile.links.github);
      case "linkedin":
        return visit("LinkedIn", profile.links.linkedin);
      case "leetcode":
        return visit("LeetCode", profile.links.leetcode);
      case "resume":
        return visit("resume", `${window.location.origin}${profile.links.resume}`);
      case "blog":
        say("Taking you to the blog.");
        close();
        return router.push("/blog");
      case "theme": {
        const next = arg === "dark" || arg === "light" ? arg : resolvedTheme === "dark" ? "light" : "dark";
        if (arg && arg !== "dark" && arg !== "light") return say("Use theme dark or theme light.");
        setTheme(next);
        return say(`Switched to ${next} mode.`);
      }
      default:
        return say(`Not a command: ${cmd}. Try help.`);
    }
  }

  function submit() {
    const line = input.trim();
    setInput("");
    setCursor(null);
    if (!line) return;
    setPast((p) => [...p, line]);
    run(line);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!past.length) return;
      const i = cursor === null ? past.length - 1 : Math.max(0, cursor - 1);
      setCursor(i);
      setInput(past[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor === null) return;
      const i = cursor + 1;
      setCursor(i >= past.length ? null : i);
      setInput(i >= past.length ? "" : past[i]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const word = input.trim().toLowerCase();
      if (!word || word.includes(" ")) return;
      const hits = commands.filter((n) => n.startsWith(word));
      if (hits.length === 1) setInput(hits[0] + (hits[0] === "open" ? " " : ""));
      else if (hits.length > 1) say(hits.join("   "));
    }
  }

  const scrollBy = (dy: number) => screenRef.current?.scrollBy({ top: dy });
  const key = "console-key flex items-center justify-center focus-visible:outline-offset-2";
  const face = "console-face absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 aspect-square";

  return (
    <>
      {open && (
        <div
          className="console-overlay fixed inset-0 z-[60] bg-black/25 backdrop-blur-[6px]"
          onClick={close}
          aria-hidden
        />
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Terminal console"
          className="console console-pop fixed bottom-[4.75rem] right-3 z-[70] w-[min(36rem,calc(100vw-1.5rem))] rounded-[22px] border-[3px] border-ink p-3.5 shadow-[6px_6px_0_var(--shadow)] sm:right-6"
          style={{ background: "var(--c-body)" }}
        >
          <span aria-hidden className="absolute left-2.5 top-2.5 size-2 rounded-full border-2 border-[#141414] bg-[#f6efe0]" />
          <span aria-hidden className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-[#141414] bg-[#f6efe0]" />

          {/* screen */}
          <div className="mt-2.5 overflow-hidden rounded-[10px] border-[3px] border-[#141414]">
            <div className="flex h-8 items-center gap-3 border-b-[3px] border-[#141414] bg-[#f6efe0] px-3 text-[#141414]">
              <span aria-hidden className="flex gap-1.5">
                <i className="size-2.5 rounded-full border-2 border-[#141414] bg-[#ee7d2d]" />
                <i className="size-2.5 rounded-full border-2 border-[#141414] bg-[#f3d36b]" />
                <i className="size-2.5 rounded-full border-2 border-[#141414] bg-[#8fc98a]" />
              </span>
              <span className="mono flex-1 truncate text-xs font-semibold">daivik@portfolio ~</span>
              <button type="button" onClick={close} aria-label="Close terminal" className="-mr-1 rounded p-0.5 hover:bg-black/10">
                <X size={15} />
              </button>
            </div>
            <div
              ref={screenRef}
              aria-live="polite"
              onClick={() => inputRef.current?.focus()}
              className="mono h-[clamp(8rem,calc(100dvh-27rem),17rem)] cursor-text overflow-y-auto px-3.5 py-3 text-[13px] leading-[1.6] sm:h-[clamp(10rem,calc(100dvh-25rem),24rem)]"
              style={{ background: "var(--term)", color: "var(--term-ink)" }}
            >
              {lines.map((l, i) =>
                l.kind === "in" ? (
                  <div key={i}><span className="text-accent">{PROMPT}</span> {l.text}</div>
                ) : (
                  <div key={i} className="whitespace-pre-wrap break-words opacity-90">{linkify(l.text)}</div>
                ),
              )}
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-2 pb-1">
                <span aria-hidden className="shrink-0 text-accent">{PROMPT}</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setCursor(null); }}
                  onKeyDown={onKeyDown}
                  maxLength={80}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-label="Type a command"
                  className="term-input min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit caret-[#ee7d2d] !outline-none"
                />
              </form>
            </div>
          </div>

          {/* controls */}
          <div
            className="mt-3 grid grid-cols-3 gap-2 rounded-[14px] border-2 border-[#141414] p-2.5"
            style={{ background: "var(--c-panel)", boxShadow: "inset 0 4px 0 rgba(0,0,0,.28)" }}
          >
            <div className="min-w-0" style={{ height: "var(--u)" }}>
              <Joystick onScroll={scrollBy} onLeft={() => run("clear")} onRight={() => run("help")} />
            </div>

            <div className="grid min-w-0 grid-cols-2 grid-rows-3 gap-1.5" style={{ height: "var(--u)" }}>
              {["Github", "Resume", "Contact", "Theme", "Clear", "Help"].map((k) => (
                <button key={k} type="button" className={key} onClick={() => run(k.toLowerCase())}>
                  {k}
                </button>
              ))}
            </div>

            <div className="relative mx-auto min-w-0" style={{ height: "var(--u)", width: "min(100%, var(--u))" }}>
              {[
                ["Work", "50%", "17%"],
                ["Skills", "17%", "50%"],
                ["Projects", "83%", "50%"],
                ["About", "50%", "83%"],
              ].map(([k, x, y]) => (
                <button
                  key={k}
                  type="button"
                  className={face}
                  style={{ left: x, top: y, width: "36%" }}
                  aria-label={k}
                  onClick={() => run(k.toLowerCase())}
                >
                  <span style={{ fontSize: "calc(var(--u) * 0.062)" }}>{k}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? "Close terminal" : "Open terminal"}
        className="nb-btn nb-btn-accent mono fixed bottom-4 right-3 z-[80] !px-4 !py-2.5 sm:right-6"
      >
        <span aria-hidden>&gt;_</span> Terminal
      </button>
    </>
  );
}
