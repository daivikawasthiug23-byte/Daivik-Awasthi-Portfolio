import { mkdirSync, writeFileSync } from "node:fs";
import sharp, { type Sharp } from "sharp";
import { chat } from "./llm";
import type { Post } from "./types";

type Input = Pick<Post, "slug" | "title" | "excerpt">;

const DIR = "public/blog";
const about = (post: Input) => `Title: ${post.title}\nSummary: ${post.excerpt}`;

// The writer model turns the post into a concrete visual idea, so the image matches the topic and not just the title's words.
async function concept(post: Input) {
  const idea = await chat(
    "You come up with the visual idea for a blog thumbnail. Reply with one sentence of at most 30 words describing a single concrete " +
      "scene or metaphor that a reader would connect to this exact topic, naming the real objects involved (for example a map mesh, " +
      "a circuit, a lock, a database, a rocket). Describe shapes, objects and composition only. " +
      "Never ask for text, labels, words, numbers, binary code, charts, screenshots, faces or logos.",
    about(post),
    { temperature: 0.7, maxTokens: 600 },
  );
  return idea.replace(/\s+/g, " ").slice(0, 300);
}

// Short stock-photo search words. Photos of real objects match a topic better than a literal reading of the title.
async function searchWords(post: Input) {
  const words = await chat(
    "You pick search words for a stock photo site. Reply with 2 or 3 plain words, no punctuation, naming the literal real-world " +
      "subject area of the blog post, not a metaphor for it. Examples: a post about map rendering gives 'city map aerial'; " +
      "about software verification gives 'laptop source code'; about a database outage gives 'server room'; about GPUs gives 'computer chip'.",
    about(post),
    { temperature: 0.2, maxTokens: 300 },
  );
  return words.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

type Credit = { name: string; url: string; photoUrl: string };

const REFERRAL = "utm_source=daivik_portfolio&utm_medium=referral";
// GitHub passes an empty string for a missing secret, so || is used here and not ??.
const unsplashKey = () => (process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.UPSLASH_ACCESS_KEY?.trim()) || undefined;

// Searches Unsplash and returns the best match as a sharp pipeline, plus the credit its licence asks us to show.
async function renderPhoto(query: string) {
  const key = unsplashKey();
  if (!key) throw new Error("No Unsplash access key is set");
  const headers = { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
  // Long queries often match nothing, so drop trailing words until something comes back.
  const words = query.split(" ").slice(0, 4);
  let photo: UnsplashPhoto | undefined;
  for (let n = words.length; n >= 1 && !photo; n--) {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(words.slice(0, n).join(" "))}&orientation=landscape&per_page=5&content_filter=high`,
      { headers, signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) throw new Error(`Unsplash answered ${res.status}`);
    photo = ((await res.json()) as { results: UnsplashPhoto[] }).results[0];
  }
  if (!photo) throw new Error(`Unsplash had no photo for "${query}"`);

  const img = await fetch(`${photo.urls.raw}&w=1600&h=840&fit=crop&crop=entropy&fm=jpg&q=80`, { signal: AbortSignal.timeout(60_000) });
  if (!img.ok) throw new Error(`Unsplash image answered ${img.status}`);
  fetch(photo.links.download_location, { headers }).catch(() => {}); // Unsplash asks API users to report a download

  // A light blue wash ties photos with different colours to the site's palette.
  const wash = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 30, g: 64, b: 175, alpha: 0.28 } } })
    .png()
    .toBuffer();
  const base = await sharp(Buffer.from(await img.arrayBuffer())).resize(1200, 630, { fit: "cover" }).toBuffer();
  const credit: Credit = {
    name: photo.user.name,
    url: `${photo.user.links.html}?${REFERRAL}`,
    photoUrl: `${photo.links.html}?${REFERRAL}`,
  };
  return { image: sharp(base).composite([{ input: await sharp(wash).resize(1200, 630).toBuffer(), blend: "over" }]), credit };
}

type UnsplashPhoto = {
  urls: { raw: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
};

const SVG_SYSTEM =
  "You draw blog thumbnails as SVG. Reply with one complete SVG document and nothing else: no markdown, no explanation. " +
  'It must start with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"> and use only shapes, paths, gradients and groups. ' +
  "Draw the scene you are given in a flat editorial style: bold geometric shapes, teal (#14b8a6) and coral (#fb7185) " +
  "on a medium blue (#2563eb to #1e40af) background, high contrast, a clear focal point, about 15 to 30 elements. " +
  "Build recognisable objects from simple parts (nodes joined by lines, grids, stacked layers, shields, arrows, gears, chips). " +
  "Never use text, <text>, letters, numbers, images, scripts, filters or external links. Keep it under 2500 characters.";

// Pulls the SVG out of the reply and refuses anything that could load or run something.
function cleanSvg(reply: string) {
  const svg = reply.match(/<svg[\s\S]*<\/svg>/i)?.[0];
  if (!svg) throw new Error("The model did not return an SVG");
  if (/<(script|text|image|foreignObject|use|style)\b|\son\w+\s*=|href\s*=|url\(\s*["']?(?!#)/i.test(svg))
    throw new Error("The SVG used a forbidden element");
  return svg;
}

// Fallback when there is no photo: the same idea, drawn as an SVG by the writer model.
async function renderDrawing(idea: string, post: Input) {
  for (let attempt = 1; ; attempt++) {
    try {
      const reply = await chat(SVG_SYSTEM, `${about(post)}\nScene to draw: ${idea}`, { temperature: 0.8, maxTokens: 3500 });
      const image = sharp(Buffer.from(cleanSvg(reply)));
      await image.clone().png().toBuffer(); // fails here if the SVG is malformed
      return image;
    } catch (err) {
      if (attempt >= 3) throw err;
      console.log(`  drawing attempt ${attempt} failed (${(err as Error).message}), trying again...`);
    }
  }
}

// Saves the thumbnail and returns its public path, with the photo credit when it is a photo. Throws on failure, so the caller decides whether that matters.
export async function makeThumbnail(post: Input) {
  const idea = await concept(post);
  console.log(`  thumbnail idea: ${idea}`);
  let image: Sharp;
  let credit: Credit | undefined;
  try {
    const query = await searchWords(post);
    console.log(`  photo search: ${query}`);
    ({ image, credit } = await renderPhoto(query));
  } catch (err) {
    console.log(`  no photo (${(err as Error).message}), drawing an SVG instead...`);
    image = await renderDrawing(idea, post);
  }
  const jpg = await image.resize(1200, 630, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/${post.slug}.jpg`, jpg);
  return { path: `/blog/${post.slug}.jpg`, credit };
}
