// Production falls back to the live address, so link previews never point at localhost if the env var is missing.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://www.daivik-awasthi.me" : "http://localhost:3000");

export const SITE_NAME = "Daivik Awasthi";
export const SITE_TITLE = "Daivik Awasthi | Software Engineer";
export const SITE_DESCRIPTION =
  "Final-year IT student at NSUT and former Goldman Sachs software engineering intern. I build backend systems and AI tools, and I'm looking for SDE roles.";
