import index from "@/data/index.json";
import type { Chunk } from "./types";

// Keyword search (BM25) over a few dozen chunks. It is plain JavaScript, so it runs anywhere, with no model to load.
const chunks = index.chunks as Chunk[];

const STOP = new Set(
  ("a an and are as at be been but by can could did do does done for from had has have he her him his how i in is it its me my of on or " +
    "our she so that the their them then there they this to us was we were what when where which who why will with would you your tell about work use").split(" "),
);

// Light stemming, then long words are cut to 5 letters so "leader" and "leadership" meet.
const stem = (w: string) => {
  const base = w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w;
  return base.length >= 6 ? base.slice(0, 5) : base;
};
const tokenize = (text: string) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(stem).filter((w) => w.length > 1 && !STOP.has(w));

// Everyday words for things the content says in other words.
const SYNONYMS: Record<string, string[]> = {
  study: ["education", "university", "nsut", "degree", "bachelor"],
  studi: ["education", "university", "nsut", "degree", "bachelor"],
  college: ["education", "university", "nsut"],
  school: ["education", "university", "nsut"],
  grade: ["gpa"],
  contact: ["email", "linkedin", "reach"],
  reach: ["email", "linkedin", "contact"],
  hire: ["role", "looking", "sde", "contact"],
  job: ["role", "looking", "sde", "internship"],
  intern: ["internship", "goldman"],
  work: ["internship", "experience", "project"],
  built: ["build", "project"],
  tech: ["skill", "stack"],
  language: ["skill", "python", "javascript", "typescript"],
  lead: ["leadership", "president", "vice"],
  team: ["leadership", "president"],
};

const K1 = 1.5;
const B = 0.75;

const docs = chunks.map((c) => tokenize(`${c.title} ${c.title} ${c.text}`)); // the title counts double
const avgLen = docs.reduce((n, d) => n + d.length, 0) / docs.length;
const df = new Map<string, number>();
for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
const idf = (t: string) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));

const TOP_K = 5;

export async function retrieve(question: string) {
  const terms = new Set<string>();
  for (const t of tokenize(question)) {
    terms.add(t);
    SYNONYMS[t]?.forEach((s) => terms.add(stem(s)));
  }

  const ranked = chunks
    .map((chunk, i) => {
      const d = docs[i];
      let score = 0;
      for (const t of terms) {
        const tf = d.filter((w) => w === t).length;
        if (tf) score += idf(t) * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.length) / avgLen)));
      }
      return { ...chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  // A question that is clearly about Daivik but shares no words with the content (for example a skill he lacks)
  // still goes to the model with his profile, so it can say it does not know. Off-topic questions get no context.
  if (ranked.length === 0 && /\b(he|his|him|daivik)\b/i.test(question)) {
    return chunks.filter((c) => c.id === "profile" || c.id.startsWith("skills-")).map((c) => ({ ...c, score: 0 }));
  }
  return ranked;
}

// Source chips are only a hint, so they are stricter than the context sent to the model.
const SOURCE_MIN = 2.5;
const SOURCE_RATIO = 0.7;
const SOURCE_MAX = 3;

export function pickSources(docs: { title: string; href: string; score: number }[]) {
  const top = docs[0]?.score ?? 0;
  const seen = new Set<string>();
  return docs
    .filter((d) => d.score >= Math.max(SOURCE_MIN, top * SOURCE_RATIO))
    .filter((d) => !seen.has(d.title) && seen.add(d.title))
    .slice(0, SOURCE_MAX)
    .map((d) => ({ title: d.title, href: d.href }));
}
