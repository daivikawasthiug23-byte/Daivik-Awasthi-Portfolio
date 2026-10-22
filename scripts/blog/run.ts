import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { embed } from "../../lib/ask/embed";
import { critique, ruleViolations, wordCount, type Review } from "./gate";
import { MODEL, chat, chatJson } from "./llm";
import { normalize } from "./normalize";
import { collect, metaDescription, pageText } from "./sources";
import { TAGS, type Candidate, type Post, type Source } from "./types";

try {
  process.loadEnvFile(".env.local");
} catch {}

const DRY = process.argv.includes("--dry");
const MAX_REWRITES = 3;
const MIN_NOTES = 800; // characters of real source material needed to write a grounded post
const POSTS_DIR = "content/blog";
const styleGuide = readFileSync("content/blog-style.md", "utf8");
const examples = readFileSync("content/blog-examples.md", "utf8").replace(/<!--[\s\S]*?-->/g, "").trim();

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");

function loadPosts(): Post[] {
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${POSTS_DIR}/${f}`, "utf8")) as Post);
}

// 1 + 2: collect topics, let the model shortlist the relevant ones, drop topics we already covered.
async function shortlist(posts: Post[]) {
  const candidates = await collect();
  if (candidates.length === 0) throw new Error("No candidate topics: every source failed");
  console.log(`Collected ${candidates.length} candidates`);

  const used = new Set(posts.flatMap((p) => p.sources.map((s) => s.url)));
  const fresh = candidates.filter((c) => !used.has(c.url));

  const { picks } = await chatJson<{ picks: number[] }>(
    "You pick topics for a blog read by software engineers, about engineering practice and AI. " +
      "Choose topics where a reader can learn something technical. Skip funding news, politics, job posts, " +
      "pure product launches, opinions about people, and anything with no technical substance. " +
      'Return JSON only: {"picks":[numbers]} with up to 8 numbers, best first.',
    fresh.map((c, i) => `${i}. [${c.origin}] ${c.title}`).join("\n"),
    { temperature: 0, effort: "low", maxTokens: 800 },
  );

  const past = await Promise.all(posts.map((p) => embed(`${p.title}. ${p.excerpt}`)));
  const ordered: Candidate[] = [];
  for (const i of picks) {
    const c = fresh[i];
    if (!c) continue;
    const v = await embed(c.title);
    const near = Math.max(0, ...past.map((p) => dot(v, p)));
    if (near > 0.75) console.log(`Skipping "${c.title}": too close to an existing post (${near.toFixed(2)})`);
    else ordered.push(c);
  }
  return { ordered, fresh };
}

// 3: ground the writer in real source material. It is notes to learn from, never text to copy.
async function ground(chosen: Candidate, pool: Candidate[]) {
  const notes = await pageText(chosen.url);
  const description = chosen.description || (await metaDescription(chosen.url));
  if (notes.length + description.length < MIN_NOTES) return null;

  const q = await embed(chosen.title);
  const related = (
    await Promise.all(
      pool.filter((c) => c.url !== chosen.url).map(async (c) => ({ c, s: dot(q, await embed(c.title)) })),
    )
  )
    .filter((x) => x.s > 0.5)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.c);
  for (const c of related) c.description ||= await metaDescription(c.url);

  const sources: Source[] = [chosen, ...related].map((c) => ({ title: c.title, url: c.url }));
  const brief =
    `Main source: ${chosen.title}\nURL: ${chosen.url}\nSummary: ${description || "none"}\nNotes from the page (facts to learn from, do not copy sentences):\n${notes}` +
    related.map((c, i) => `\n\nRelated source ${i + 1}: ${c.title}\nURL: ${c.url}\nSummary: ${c.description || "none"}`).join("");
  return { sources, brief, popularity: chosen.popularity };
}

const writerSystem =
  "You write posts for an engineering blog. Follow this style guide exactly.\n\n" +
  styleGuide +
  "\n\nReference posts that show the target tone. Imitate their voice and rhythm, not their topics:\n\n" +
  examples +
  "\n\nRules that matter most: use only facts, names and numbers that appear in the source material. " +
  "Do not invent scenes, teams, incidents, quotes or measurements. When the material is thin, explain the idea in general terms " +
  "and say what the source reports instead of making up detail. " +
  "Never open with an invented story or scene (for example 'A small team grew a project into...'). Open with a real fact from the notes. " +
  "Include code only when it appears in the notes, and never write code or API names the notes do not show. " +
  "Aim for about 900 words, and never fewer than 700.";

// 4: outline first, then the draft, so every post has the same shape.
const outline = (brief: string) =>
  chatJson<{ title: string; excerpt: string; tags: string[]; headings: string[]; example: string }>(
    writerSystem,
    `Plan a post based on this source material. Use only facts from it.\n\n${brief}\n\n` +
      'Return JSON only: {"title": "specific, under 70 characters, no colon, no clickbait", ' +
      '"excerpt": "one plain sentence, under 160 characters", ' +
      `"tags": ["1 to 3 from: ${TAGS.join(", ")}"], ` +
      '"headings": ["3 to 4 specific section headings in sentence case, before The takeaway"], ' +
      '"example": "one concrete example or snippet that comes from the source material"}',
    { effort: "low", maxTokens: 1000 },
  );

const draft = (brief: string, plan: Awaited<ReturnType<typeof outline>>) =>
  chat(
    writerSystem,
    `Write the post. Output only the markdown body: no title line, no preamble, no code fence around the whole post.\n\n` +
      `Title (do not repeat it in the body): ${plan.title}\nSections in order: ${plan.headings.join(" | ")} | The takeaway\n` +
      `Concrete example to include: ${plan.example}\n\n${brief}`,
    { temperature: 0.6, maxTokens: 3200 },
  );

// Rewrites skip the example posts: the draft already carries the tone, and the free tier is token-limited.
const rewriterSystem =
  "You edit posts for an engineering blog. Follow this style guide exactly.\n\n" + styleGuide +
  "\n\nUse only facts, names and numbers from the source material. Never invent details, scenes or code the material does not show.";

const rewrite = (brief: string, body: string, problems: string[]) =>
  chat(
    rewriterSystem,
    `Revise this draft. Fix every problem below and keep everything else that works. Keep it around 900 words, and never fewer than 700. ` +
      `Output only the full revised markdown body.\n\nPROBLEMS:\n${problems.map((p) => `- ${p}`).join("\n")}\n\n${brief}\n\nDRAFT:\n${body}`,
    { temperature: 0.4, maxTokens: 3000 },
  );

// 5: code rules first, then the critic, with a capped rewrite loop.
async function gate(brief: string, sources: Source[], first: string) {
  let body = normalize(first);
  for (let attempt = 0; attempt <= MAX_REWRITES; attempt++) {
    const violations = ruleViolations(body, sources, brief);
    const review: Review | null = violations.length ? null : await critique(body, brief, styleGuide);
    const problems = violations.length ? violations : review!.pass ? [] : review!.notes;
    console.log(
      `Attempt ${attempt + 1}: ${violations.length ? `${violations.length} rule violation(s)` : `scores ${JSON.stringify(review!.quality)}`}`,
    );
    problems.forEach((p) => console.log(`    - ${p}`));
    if (problems.length === 0) return { body, review: review! };
    if (attempt === MAX_REWRITES) throw Object.assign(new Error("Draft failed the gate"), { body, problems });
    body = normalize(await rewrite(brief, body, problems));
  }
  throw new Error("unreachable");
}

async function main() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  const posts = loadPosts();
  const { ordered, fresh } = await shortlist(posts);

  let chosen: Candidate | undefined;
  let grounded: Awaited<ReturnType<typeof ground>> = null;
  for (const c of ordered) {
    grounded = await ground(c, fresh);
    if (grounded) {
      chosen = c;
      break;
    }
    console.log(`Skipping "${c.title}": not enough source material to write from`);
  }
  if (!chosen || !grounded) throw new Error("No topic today had enough source material");
  console.log(`Topic: ${chosen.title} (${chosen.origin}, popularity ${chosen.popularity})`);

  const { sources, brief, popularity } = grounded;
  const plan = await outline(brief);
  const { body, review } = await gate(brief, sources, await draft(brief, plan));

  const date = new Date().toISOString().slice(0, 10);
  let slug = slugify(plan.title);
  if (existsSync(`${POSTS_DIR}/${slug}.json`)) slug = `${slug}-${date}`;
  const tags = plan.tags.filter((t) => (TAGS as readonly string[]).includes(t)).slice(0, 3);
  const post: Post = {
    slug,
    title: normalize(plan.title),
    date,
    excerpt: normalize(plan.excerpt),
    tags: tags.length ? tags : ["Dev Tools"],
    body,
    sources,
    popularity,
    readingMinutes: Math.max(1, Math.ceil(wordCount(body) / 220)),
    quality: review.quality,
    model: MODEL,
  };

  if (DRY) return console.log(`\n--dry: not writing.\n\n# ${post.title}\n\n${post.body}`);
  writeFileSync(`${POSTS_DIR}/${slug}.json`, JSON.stringify(post, null, 2) + "\n");
  console.log(`Published ${slug}`);
}

main().catch((err) => {
  console.error(err.message);
  // The workflow turns this report into a GitHub Issue. Nothing is published.
  writeFileSync(
    "blog-failure.md",
    `The daily blog run did not publish.\n\n**Reason:** ${err.message}\n` +
      (err.problems ? `\n**Problems on the last draft:**\n${err.problems.map((p: string) => `- ${p}`).join("\n")}\n` : "") +
      (err.body ? `\n<details><summary>Last draft</summary>\n\n${err.body}\n\n</details>\n` : ""),
  );
  process.exit(1);
});
