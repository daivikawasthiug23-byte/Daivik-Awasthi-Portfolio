import { profile } from "@/content/profile";
import { experience } from "@/content/experience";
import { moreOnGithub, projects } from "@/content/projects";
import { achievements } from "@/content/achievements";

// The portfolio as a small read-only filesystem, so the terminal can ls, cd and cat.

export type Dir = { [name: string]: string | Dir };

export const HOME = "/home/daivik";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Item = { name: string; kind: string; blurb: string; stack: string[]; url: string; live?: string; repo?: string };

// Same order as the page: deployed web apps first.
export const all: Item[] = [
  ...projects.map((p) => ({ name: p.title, kind: p.kind, blurb: p.blurb, stack: p.stack, url: p.live ?? p.repo ?? profile.links.github, live: p.live, repo: p.repo })),
  ...moreOnGithub.map((m) => ({ name: m.name, kind: m.kind, blurb: m.blurb, stack: m.stack, url: m.live ?? m.url, live: m.live, repo: m.url })),
].sort((a, b) => Number(!!b.live) - Number(!!a.live));

const projectFiles: Dir = Object.fromEntries(
  all.map((p, i) => [
    `${i + 1}-${slug(p.name)}.txt`,
    [p.name, p.kind, "", p.blurb, "", `Stack: ${p.stack.join(", ")}`, p.live ? `Live: ${p.live}` : "", p.repo ? `Code: ${p.repo}` : ""]
      .filter((x, j, a) => x !== "" || (a[j - 1] !== "" && j < a.length - 1))
      .join("\n"),
  ]),
);

const achievementFiles: Dir = Object.fromEntries(
  achievements.map((a, i) => [`${i + 1}-${slug(a.label)}.txt`, `${a.stat} ${a.label}\n${a.note}`]),
);

const e = experience[0];

export const fs: Dir = {
  "README.md": "Welcome! This folder is my portfolio.\nTry /ls, /cd projects, /cat about.txt or /tree.\nType /help for every command.",
  "about.txt": profile.intro.join("\n"),
  experience: { [`${slug(e.company)}.txt`]: `${e.company}, ${e.role}\n${e.dates}\n\n${e.summary}` },
  projects: projectFiles,
  achievements: achievementFiles,
  links: {
    "github.txt": profile.links.github,
    "linkedin.txt": profile.links.linkedin,
    "leetcode.txt": profile.links.leetcode,
  },
  ".secret": "Psst. Type /secret and turn your sound on.",
};

const isDir = (n: unknown): n is Dir => typeof n === "object" && n !== null;

// Case-insensitive lookup of one name inside a directory.
const find = (d: Dir, name: string) => Object.keys(d).find((k) => k.toLowerCase() === name.toLowerCase());

/** Follow a path (array of names) from home. Returns the real names, or null if it does not exist. */
export function walk(path: string[]): { names: string[]; node: string | Dir } | null {
  let node: string | Dir = fs;
  const names: string[] = [];
  for (const seg of path) {
    if (!isDir(node)) return null;
    const k = find(node, seg);
    if (k === undefined) return null;
    names.push(k);
    node = node[k];
  }
  return { names, node };
}

/**
 * Turn what the user typed into a path from home.
 * "denied" means it leads outside the home folder, which is off limits.
 */
export function resolve(cwd: string[], input: string): string[] | "denied" {
  let base: string[];
  let rest: string;
  if (input === "~" || input.startsWith("~/")) {
    base = [];
    rest = input.slice(1);
  } else if (input.startsWith("/")) {
    if (input !== HOME && !input.startsWith(`${HOME}/`)) return "denied";
    base = [];
    rest = input.slice(HOME.length);
  } else {
    base = [...cwd];
    rest = input;
  }
  for (const seg of rest.split("/").filter(Boolean)) {
    if (seg === ".") continue;
    if (seg === "..") {
      if (!base.length) return "denied";
      base.pop();
    } else base.push(seg);
  }
  return base;
}

export const label = (cwd: string[]) => (cwd.length ? `~/${cwd.join("/")}` : "~");
export const dirOf = (n: string | Dir): n is Dir => isDir(n);

/** Names inside a directory, folders marked with a trailing slash, hidden files only when asked. */
export function list(d: Dir, all_: boolean) {
  return Object.keys(d)
    .filter((k) => all_ || !k.startsWith("."))
    .sort((a, b) => Number(isDir(d[b])) - Number(isDir(d[a])) || a.localeCompare(b, undefined, { numeric: true }))
    .map((k) => (isDir(d[k]) ? `${k}/` : k));
}

export function tree(d: Dir, prefix = ""): string[] {
  const keys = list(d, false).map((k) => k.replace(/\/$/, ""));
  return keys.flatMap((k, i) => {
    const last = i === keys.length - 1;
    const n = d[k];
    return [`${prefix}${last ? "└── " : "├── "}${k}${isDir(n) ? "/" : ""}`, ...(isDir(n) ? tree(n, prefix + (last ? "    " : "│   ")) : [])];
  });
}

/** Tab completion for a path argument. Returns the full replacement text, or a list of candidates. */
export function complete(cwd: string[], token: string): { done?: string; hits?: string[] } {
  const slash = token.lastIndexOf("/");
  const dirPart = slash >= 0 ? token.slice(0, slash + 1) : "";
  const namePart = token.slice(slash + 1);
  const p = resolve(cwd, dirPart || ".");
  if (p === "denied") return {};
  const w = walk(p);
  if (!w || !isDir(w.node)) return {};
  const hits = list(w.node, namePart.startsWith(".")).filter((k) => k.toLowerCase().startsWith(namePart.toLowerCase()));
  if (hits.length === 1) return { done: dirPart + hits[0] };
  return { hits };
}
