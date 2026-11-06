"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Joystick } from "./Joystick";
import { profile } from "@/content/profile";
import { experience } from "@/content/experience";
import { achievements } from "@/content/achievements";
import { HOME, all, complete, dirOf, label, list, resolve, tree, walk } from "@/lib/terminal-fs";

// My own commands start with /. Everything else works like the real Linux command.
const OWN = ["/help", "/experience", "/projects", "/achievements", "/github", "/linkedin", "/leetcode", "/secret"];
const LINUX = ["ls", "cd", "pwd", "cat", "tree", "echo", "whoami", "date", "uname", "history", "clear", "exit", "sudo", "rm", "mkdir", "touch", "mv", "cp"];
const commands = [...OWN, ...LINUX];
const withPath = ["ls", "cd", "cat", "tree"];

const HELP = [
  "My commands start with /",
  "• /experience     where I work",
  "• /projects       list what I've built",
  "• /projects <n>   open project n, like /projects 1",
  "• /achievements   things I'm proud of",
  "• /github         open my GitHub",
  "• /linkedin       open my LinkedIn",
  "• /leetcode       open my LeetCode",
  "• /secret         a surprise (sound on!)",
  "• /help           show this list",
  "",
  "The rest work like Linux (my portfolio is a folder)",
  "• ls [-a] [dir]   list files",
  "• cd <dir>        go into a folder, cd .. to go back",
  "• cat <file>      read a file",
  "• tree            show every folder and file",
  "• pwd             where am I",
  "• echo <text>     print text",
  "• whoami  date  uname  history",
  "• clear           clear the screen",
  "• exit            close the terminal",
  "",
  "Tip: Tab completes, ↑ and ↓ bring back old commands.",
];

const PROMPT = "❯";

type Line = { kind: "in" | "out" | "art"; text: string; dir?: string };

function linkify(text: string): ReactNode {
  return text.split(/(https?:\/\/\S+|\b[\w.-]+@[\w.-]+\.\w+)/g).map((part, i) => {
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent underline">{part}</a>;
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(part)) return <a key={i} href={`mailto:${part}`} className="text-accent underline">{part}</a>;
    return part;
  });
}

export function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "For the list of commands, type /help" },
  ]);
  const [cwd, setCwd] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const animRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAnim = useCallback(() => {
    if (animRef.current !== null) window.clearInterval(animRef.current);
    animRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);
  useEffect(() => stopAnim, [stopAnim]);

  const close = useCallback(() => {
    stopAnim();
    setOpen(false);
    launcherRef.current?.focus();
  }, [stopAnim]);

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
    const flags = rest.filter((x) => x.startsWith("-")).join("").replace(/-/g, "");
    const args = rest.filter((x) => !x.startsWith("-"));
    const typedName = cmd.toLowerCase();
    // Linux commands work with or without a leading slash; "help" works too.
    const bare = typedName.replace(/^\//, "");
    const c = LINUX.includes(bare) ? bare : bare === "help" ? "/help" : typedName;

    stopAnim();
    if (c === "clear") return setLines([]);
    setLines((l) => [...l, { kind: "in", text: line, dir: label(cwd) }]);

    switch (c) {
      case "/help":
        return say(...HELP);
      case "/experience": {
        const e = experience[0];
        return say(`${e.company}, ${e.role} (${e.dates}). ${e.summary}`);
      }
      case "/projects":
      case "/project": {
        if (!arg) return say("Projects (type /projects 1 to open one):", ...all.map((p, i) => `${i + 1}  ${p.name}`));
        const i = Number(arg);
        const p = Number.isInteger(i) ? all[i - 1] : all.find((x) => x.name.toLowerCase().includes(arg));
        return p ? visit(p.name, p.url) : say(`No project ${arg}. Type /projects to see the list.`);
      }
      case "/achievements":
        return say(...achievements.map((a) => `• ${a.stat} ${a.label.toLowerCase()}`));
      case "/github":
        return visit("GitHub", profile.links.github);
      case "/linkedin":
        return visit("LinkedIn", profile.links.linkedin);
      case "/leetcode":
        return visit("LeetCode", profile.links.leetcode);
      case "echo":
        return say(rest.join(" ") || " ");
      case "whoami":
        return say("guest, my favourite visitor today.");
      case "date":
        return say(new Date().toString());
      case "uname":
        return say(arg === "-a" ? "Linux portfolio 6.1.0-daivik #1 SMP x86_64 GNU/Linux" : "Linux");
      case "history":
        return say(...[...past, line].map((h, i) => `${String(i + 1).padStart(3)}  ${h}`));
      case "pwd":
        return say(cwd.length ? `${HOME}/${cwd.join("/")}` : HOME);
      case "ls": {
        const showAll = flags.includes("a");
        const target = resolve(cwd, args[0] ?? ".");
        const w = target === "denied" ? null : walk(target);
        if (target === "denied") return say(`ls: cannot open '${args[0]}': Permission denied`);
        if (!w) return say(`ls: cannot access '${args[0]}': No such file or directory`);
        if (!dirOf(w.node)) return say(args[0]);
        const items = list(w.node, showAll);
        return say(showAll ? [".", "..", ...items].join("  ") : items.join("  ") || " ");
      }
      case "cd": {
        if (!args[0] || args[0] === "~") return setCwd([]);
        const target = resolve(cwd, args[0]);
        if (target === "denied") return say(`cd: ${args[0]}: Permission denied`);
        const w = walk(target);
        if (!w) return say(`cd: ${args[0]}: No such file or directory`);
        if (!dirOf(w.node)) return say(`cd: ${args[0]}: Not a directory`);
        return setCwd(w.names);
      }
      case "cat": {
        if (!args[0]) return say("cat: missing file. Try /cat about.txt");
        const target = resolve(cwd, args[0]);
        if (target === "denied") return say(`cat: ${args[0]}: Permission denied`);
        const w = walk(target);
        if (!w) return say(`cat: ${args[0]}: No such file or directory`);
        if (dirOf(w.node)) return say(`cat: ${args[0]}: Is a directory`);
        return say(w.node);
      }
      case "tree": {
        const target = resolve(cwd, args[0] ?? ".");
        const w = target === "denied" ? null : walk(target);
        if (!w || !dirOf(w.node)) return say(`tree: ${args[0] ?? "."}: not a directory`);
        return say(args[0] ?? ".", ...tree(w.node));
      }
      case "rm":
      case "mkdir":
      case "touch":
      case "mv":
      case "cp":
        return say(`${c}: Read-only file system. This portfolio is look, don't touch.`);
      case "exit":
        return close();
      case "sudo":
        return say("Nice try. guest is not in the sudoers file. This incident will be reported.");
      case "/secret": {
        say("Secret unlocked. Can you hear me?");
        // Started right here, inside the Enter keypress, so the browser allows sound.
        const sound = new Audio("/Rick-Roll-Sound-Effect.mp3");
        audioRef.current = sound;
        sound.play().catch(() => {});
        import("@/content/secret-frames").then(({ frames }) => {
          let n = 0;
          setLines((l) => [...l, { kind: "art", text: frames[0] }]);
          animRef.current = window.setInterval(() => {
            n += 1;
            // About 9 seconds: long enough for the whole sound clip.
            if (n >= frames.length * 5 || sound.ended) {
              stopAnim();
              say("That's it. Thanks for poking around. 🕺");
              return;
            }
            setLines((l) => {
              const i = l.map((x) => x.kind).lastIndexOf("art");
              return i < 0 ? l : l.map((x, j) => (j === i ? { ...x, text: frames[n % frames.length] } : x));
            });
          }, 75);
        });
        return;
      }
      default:
        return say(OWN.includes(`/${c}`) ? `${cmd}: command not found. Did you mean /${c}?` : `${cmd}: command not found. Type /help.`);
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
      const typed = input.replace(/^\s+/, "");
      if (!typed) return;
      const [first, ...more] = typed.split(/\s+/);
      if (more.length === 0) {
        const word = first.toLowerCase();
        const hits = commands.filter((n) => n.startsWith(word));
        if (hits.length === 1) setInput(hits[0] + (withPath.includes(hits[0]) || hits[0] === "/projects" ? " " : ""));
        else if (hits.length > 1) say(hits.join("   "));
        return;
      }
      if (!withPath.includes(first.toLowerCase().replace(/^\//, ""))) return;
      const last = more[more.length - 1];
      const r = complete(cwd, last);
      if (r.done !== undefined) setInput(`${[first, ...more.slice(0, -1)].join(" ")} ${r.done}`);
      else if (r.hits && r.hits.length > 1) say(r.hits.join("   "));
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
                  <div key={i}><span className="text-accent">{l.dir ?? "~"} {PROMPT}</span> {l.text}</div>
                ) : l.kind === "art" ? (
                  <pre key={i} className="my-1 whitespace-pre text-[6px] leading-[6px] sm:text-[8px] sm:leading-[8px]">{l.text}</pre>
                ) : (
                  <div key={i} className="whitespace-pre-wrap break-words opacity-90">
                    {l.text.startsWith("• /secret") ? (
                      <>
                        {"• "}
                        <span className="font-bold text-[#4ade80]">/secret</span>
                        {l.text.slice("• /secret".length)}
                      </>
                    ) : (
                      linkify(l.text)
                    )}
                  </div>
                ),
              )}
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-2 pb-1">
                <span aria-hidden className="shrink-0 text-accent">{label(cwd)} {PROMPT}</span>
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
              <Joystick onScroll={scrollBy} onLeft={() => run("clear")} onRight={() => run("/help")} />
            </div>

            <div className="grid min-w-0 grid-cols-2 grid-rows-2 gap-1.5" style={{ height: "var(--u)" }}>
              {["GitHub", "LinkedIn", "LeetCode", "Clear"].map((k) => (
                <button key={k} type="button" className={key} onClick={() => run(k === "Clear" ? "clear" : `/${k.toLowerCase()}`)}>
                  {k}
                </button>
              ))}
            </div>

            <div className="relative mx-auto min-w-0" style={{ height: "var(--u)", width: "min(100%, var(--u))" }}>
              {[
                ["Work", "/experience", "50%", "17%"],
                ["Awards", "/achievements", "17%", "50%"],
                ["Projects", "/projects", "83%", "50%"],
                ["Help", "/help", "50%", "83%"],
              ].map(([k, cmd, x, y]) => (
                <button
                  key={k}
                  type="button"
                  className={face}
                  style={{ left: x, top: y, width: "36%" }}
                  aria-label={k}
                  onClick={() => run(cmd)}
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
