export const TAGS = ["AI", "Backend", "Web", "Systems", "Dev Tools", "Data", "Security"] as const;

export type Source = { title: string; url: string };

export type Candidate = {
  title: string;
  url: string;
  description: string;
  popularity: number; // 0 to 100, relative to the best item from the same source
  origin: "Hacker News" | "dev.to" | "GitHub";
};

export type Quality = { tone: number; specificity: number; engagement: number; grounded: number };

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  body: string;
  sources: Source[];
  popularity: number;
  readingMinutes: number;
  quality: Quality;
  model: string;
};
