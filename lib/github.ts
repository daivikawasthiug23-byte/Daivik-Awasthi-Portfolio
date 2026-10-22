import { cacheLife } from "next/cache";

export type RepoInfo = {
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated: string;
  isPublic: boolean;
};

export async function getRepo(url?: string): Promise<RepoInfo | null> {
  "use cache";
  cacheLife("hours");

  const match = url?.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
  if (!match) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) return null;
    const r = await res.json();
    return {
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updated: String(new Date(r.pushed_at).getFullYear()),
      isPublic: !r.private,
    };
  } catch {
    return null;
  }
}
