import { readFileSync, writeFileSync } from "node:fs";
import { achievements, leadership } from "../content/achievements";
import { education, experience, type Point } from "../content/experience";
import { profile, stats } from "../content/profile";
import { moreOnGithub, projects } from "../content/projects";
import { skills } from "../content/skills";
import { EMBED_MODEL, embed } from "../lib/ask/embed";
import type { Chunk } from "../lib/ask/types";

const plain = (p: Point) => p.map((x) => (typeof x === "string" ? x : x.b)).join("");

function buildChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  const add = (id: string, title: string, href: string, text: string) => chunks.push({ id, title, href, text });

  add("profile", "Profile", "/#about",
    `${profile.name}, ${profile.role}. ${profile.intro.join(" ")} Based in ${profile.location}. Studies at ${profile.school}. ` +
    `Email: ${profile.email}. LinkedIn: ${profile.links.linkedin}. GitHub: ${profile.links.github}. LeetCode: ${profile.links.leetcode}.`);

  add("stats", "Highlights", "/#about",
    "Daivik's highlights: " + stats.map((s) => `${s.label}: ${s.value}${s.unit ? ` ${s.unit}` : ""}`).join(". ") + ".");

  add("education", "Education", "/#about",
    `Daivik studies ${education.degree} (${education.branch}) at ${education.school}, ${education.dates}. ${education.gpa}. ` +
    `Relevant coursework: ${education.coursework.join(", ")}.`);

  for (const e of experience) {
    const head = `At ${e.company}, Daivik was a ${e.role} in ${e.location} (${e.dates}).`;
    add(`exp-${e.company}`, `${e.company} internship`, "/#experience", `${head} Tech used: ${e.tags.join(", ")}.`);
    e.points.forEach((p, i) => add(`exp-${e.company}-${i}`, `${e.company} internship`, "/#experience", `${head} ${plain(p)}`));
  }

  for (const p of projects) {
    add(`project-${p.slug}`, p.title, "/#projects",
      `Daivik's project ${p.title}: ${p.points.map(plain).join(" ")} Stack: ${p.stack.join(", ")}.`);
  }
  for (const m of moreOnGithub) {
    add(`project-${m.name}`, m.name, "/#projects", `Daivik's project ${m.name}: ${m.note} Stack: ${m.stack.join(", ")}.`);
  }

  for (const g of skills) {
    add(`skills-${g.group}`, "Skills", "/#skills", `Daivik's skills, ${g.group}: ${g.items.join(", ")}.`);
  }

  add("achievements", "Achievements", "/#achievements",
    "Daivik's achievements: " + achievements.map(plain).join(" "));

  for (const l of leadership) {
    add(`lead-${l.org}`, "Leadership", "/#leadership", `Daivik is ${l.role} of ${l.org} (${l.dates}). ${l.text}`);
  }

  // Each "## " section of the notes file is one chunk; unfinished sections are skipped.
  const notes = readFileSync("content/ask-notes.md", "utf8").replace(/<!--[\s\S]*?-->/g, "");
  for (const section of notes.split(/^## /m).slice(1)) {
    const [title, ...body] = section.trim().split("\n");
    const text = body.join(" ").trim();
    if (!text || text.includes("TODO(Daivik)")) continue;
    add(`note-${title}`, title, "/#about", `${title}. ${text}`);
  }

  return chunks;
}

async function main() {
  const chunks = buildChunks();
  const indexed = [];
  for (const c of chunks) {
    const embedding = (await embed(c.text)).map((v) => Math.round(v * 1e5) / 1e5);
    indexed.push({ ...c, embedding });
  }
  writeFileSync("data/index.json", JSON.stringify({ model: EMBED_MODEL, chunks: indexed }));
  console.log(`Indexed ${indexed.length} chunks with ${EMBED_MODEL}.`);
}

main();
