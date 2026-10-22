import type { Candidate } from "./types";

const get = (url: string, headers: Record<string, string> = {}) =>
  fetch(url, { headers: { "User-Agent": "portfolio-blog-bot", ...headers }, signal: AbortSignal.timeout(10_000) });

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

// Pulls the meta description from a page so the writer has a short, real summary to work from.
export async function metaDescription(url: string): Promise<string> {
  try {
    const res = await get(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return "";
    const html = (await res.text()).slice(0, 200_000);
    const m =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i);
    return m ? clean(m[1]) : "";
  } catch {
    return "";
  }
}

// Readable paragraphs from the page, used only as notes to write from. The post must be original.
export async function pageText(url: string): Promise<string> {
  try {
    const res = await get(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return "";
    const html = (await res.text()).slice(0, 400_000).replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, "");
    const paragraphs = [...html.matchAll(/<(?:p|li|h2|h3)[^>]*>([\s\S]*?)<\/(?:p|li|h2|h3)>/gi)]
      .map((m) => clean(m[1].replace(/<[^>]+>/g, "")))
      .filter((t) => t.length > 40);
    return paragraphs.join("\n").slice(0, 4500);
  } catch {
    return "";
  }
}

async function hackerNews(): Promise<Candidate[]> {
  const ids: number[] = await (await get("https://hacker-news.firebaseio.com/v0/topstories.json")).json();
  const items = await Promise.all(
    ids.slice(0, 40).map(async (id) => (await get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json()),
  );
  const stories = items.filter((i) => i && i.type === "story" && i.url && i.score >= 50);
  const max = Math.max(1, ...stories.map((s) => s.score));
  return stories.map((s) => ({
    title: clean(s.title),
    url: s.url,
    description: "",
    popularity: Math.round((s.score / max) * 100),
    origin: "Hacker News" as const,
  }));
}

async function devTo(): Promise<Candidate[]> {
  type DevToItem = { title: string; url: string; description?: string; positive_reactions_count: number };
  const items: DevToItem[] = await (await get("https://dev.to/api/articles?top=1&per_page=30")).json();
  const max = Math.max(1, ...items.map((i) => i.positive_reactions_count));
  return items.map((i) => ({
    title: clean(i.title),
    url: i.url,
    description: clean(i.description ?? ""),
    popularity: Math.round((i.positive_reactions_count / max) * 100),
    origin: "dev.to" as const,
  }));
}

async function github(): Promise<Candidate[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const token = process.env.GITHUB_TOKEN;
  const res = await get(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=20`,
    token ? { Authorization: `Bearer ${token}` } : {},
  );
  type Repo = { full_name: string; html_url: string; description: string | null; stargazers_count: number };
  const items: Repo[] = (await res.json()).items ?? [];
  const max = Math.max(1, ...items.map((i) => i.stargazers_count));
  return items
    .filter((i) => i.description)
    .map((i) => ({
      title: `${i.full_name}: ${clean(i.description!)}`,
      url: i.html_url,
      description: clean(i.description!),
      popularity: Math.round((i.stargazers_count / max) * 100),
      origin: "GitHub" as const,
    }));
}

// One source being down should reduce the choice, not stop the pipeline.
export async function collect(): Promise<Candidate[]> {
  const results = await Promise.allSettled([hackerNews(), devTo(), github()]);
  const all: Candidate[] = [];
  for (const [i, r] of results.entries()) {
    if (r.status === "fulfilled") all.push(...r.value);
    else console.warn(`Source ${["Hacker News", "dev.to", "GitHub"][i]} failed: ${r.reason}`);
  }
  return all;
}
