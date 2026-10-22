import { chatJson } from "./llm";
import type { Quality, Source } from "./types";

const BANNED = [
  "game-changer", "game changer", "revolutionary", "revolutionize", "unlock", "delve", "dive into", "deep dive",
  "landscape", "navigate the", "in today's", "in today’s", "fast-paced", "it's important to note", "it’s important to note",
  "it is important to note", "at the end of the day", "let's explore", "let’s explore", "stay tuned", "cutting-edge",
  "seamless", "robust", "leverage", "harness the power", "ever-evolving", "whether you are", "whether you're",
  "buckle up", "supercharge", "elevate", "tapestry", "testament to",
];

const EMOJI = /\p{Extended_Pictographic}/u;
// The author did not build or test anything in these posts, so the narrator never says "I" or "we".
const FIRST_PERSON = /\b(I|we|We|our|Our|ours|us|my|My|me)\b(?!\/)/;

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Hard rules. Plain code, so the model cannot argue its way around them.
export function ruleViolations(body: string, sources: Source[], brief?: string): string[] {
  const v: string[] = [];
  const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, ""); // code is exempt from wording rules, e.g. `println!`

  if (EMOJI.test(body)) v.push("Contains an emoji. Remove all emojis.");
  if (/[—–]/.test(prose) || / -- /.test(prose)) v.push("Contains an em dash or en dash. Use a comma, a colon or a new sentence.");
  if (prose.includes("!")) v.push("Contains an exclamation mark. Remove them.");

  const lower = prose.toLowerCase();
  const hits = BANNED.filter((p) => lower.includes(p));
  if (hits.length) v.push(`Uses banned words or phrases: ${hits.join(", ")}. Rewrite those sentences in plain words.`);

  const words = wordCount(prose);
  if (words < 600) v.push(`Too short: ${words} words. It must be 600 to 1,300 words.`);
  if (words > 1300) v.push(`Too long: ${words} words. It must be 600 to 1,300 words.`);

  const headings = body.match(/^## .+$/gm) ?? [];
  if (headings.length < 3 || headings.length > 6) v.push(`Has ${headings.length} "##" sections. It must have 3 to 6.`);
  if (/^# /m.test(body)) v.push('Contains a "#" title heading. The title is separate, so start with body text.');
  if (!/^## The takeaway\s*$/im.test(body)) v.push('The last section must be titled exactly "## The takeaway".');
  else if (!/^## The takeaway\s*$/im.test(headings[headings.length - 1] ?? "")) v.push('"The takeaway" must be the last section.');

  const lists = prose.match(/(?:^[-*] .+\n?)+/gm) ?? [];
  if (lists.length > 1) v.push("Has more than one bullet list. Use at most one.");
  if (lists.some((l) => l.trim().split("\n").length > 5)) v.push("A bullet list has more than 5 items.");
  if (/\*\*[^*]+\*\*/.test(prose)) v.push("Uses bold text inside sentences. Remove the bold.");

  const allowed = new Set(sources.map((s) => s.url.replace(/\/$/, "")));
  for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (!allowed.has(m[1].replace(/\/$/, ""))) v.push(`Links to a URL that is not in the sources: ${m[1]}`);
  }

  const firstPerson = prose.match(new RegExp(FIRST_PERSON.source, "g"));
  if (firstPerson) v.push(`Uses first person (${[...new Set(firstPerson)].join(", ")}). Never write as "I" or "we". Describe what the source or its author did, for example "the author replaced" or "the team replaced".`);
  if (/\bat (my|our) (job|work|company)\b|\bin my experience\b/i.test(prose)) v.push("Claims personal experience. Write about what the sources describe.");

  if (brief) {
    const known = brief.replace(/(\d),(\d)/g, "$1$2");
    const invented = new Set<string>();
    for (const m of prose.matchAll(/\d[\d,]*\.?\d*/g)) {
      const n = m[0].replace(/[.,]+$/, "").replace(/(\d),(\d)/g, "$1$2");
      if (n.replace(/\D/g, "").length >= 2 && !known.includes(n)) invented.add(m[0].replace(/[.,]+$/, ""));
    }
    if (invented.size) v.push(`Uses numbers that are not in the sources: ${[...invented].join(", ")}. Remove them or use only numbers from the notes.`);
  }

  if (/^\s*\|.*\|\s*$/m.test(prose)) v.push("Contains a table. Tables are not supported, so describe the comparison in sentences or a short bullet list.");

  // Headings, lists and tables are not paragraphs.
  const paragraphs = prose.split(/\n{2,}/).filter((p) => !/^\s*(#|[-*] |\d+\. |\|)/.test(p));
  if (paragraphs.some((p) => wordCount(p) > 90)) v.push("A paragraph is longer than 90 words. Split it.");
  const starts = paragraphs.map((p) => p.trim().split(/\s+/)[0]?.toLowerCase());
  for (let i = 2; i < starts.length; i++) {
    if (starts[i] && starts[i] === starts[i - 1] && starts[i] === starts[i - 2]) {
      v.push(`Three paragraphs in a row start with "${starts[i]}". Vary the openings.`);
      break;
    }
  }
  return v;
}

export type Review = { quality: Quality; notes: string[]; pass: boolean };

const BAR = 6; // 6 is publishable but plain; below that the draft is generic or leans on claims the sources do not support

// Soft rules. A second model call scores the draft against the style guide.
export async function critique(body: string, brief: string, styleGuide: string): Promise<Review> {
  const r = await chatJson<Quality & { notes: string[] }>(
    "You are a strict editor for a software engineering blog. Score the draft against the style guide. Be critical: " +
      "a 6 or 7 means good enough to publish, 5 means generic or flat, and most drafts should not get a 9 or 10. " +
      'Return JSON only: {"tone":1-10,"specificity":1-10,"engagement":1-10,"grounded":1-10,"notes":["short, concrete fixes"]}. ' +
      "tone: matches the voice in the guide and reads like a person wrote it. specificity: concrete details, not generic filler. " +
      "engagement: a strong opening and a reason to keep reading. grounded: every claim, number and story detail is supported by the source material. " +
      "Check every number against what it measures in the material: a number attached to the wrong thing (for example a figure for one district used for a whole region) is an error. " +
      "Score grounded 4 or lower if the draft invents scenes, teams, quotes or events, attaches a number to the wrong thing, or states benefits the material does not claim.",
    `STYLE GUIDE:\n${styleGuide}\n\nSOURCE MATERIAL (the only facts the writer may use):\n${brief}\n\nDRAFT:\n${body}`,
    { temperature: 0, effort: "low", maxTokens: 700 },
  );
  const quality = { tone: r.tone, specificity: r.specificity, engagement: r.engagement, grounded: r.grounded };
  const pass = Object.values(quality).every((n) => typeof n === "number" && n >= BAR);
  return { quality, notes: r.notes ?? [], pass };
}
