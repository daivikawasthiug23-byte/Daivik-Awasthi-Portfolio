# Daivik Awasthi, Portfolio

Personal portfolio built with Next.js 16, React 19 and Tailwind CSS 4. It has two AI features:

- **Ask bot:** a chat widget that answers questions about me from my own content, using retrieval and Groq.
- **Blog:** daily engineering posts written by an AI pipeline under a strict style guide, with automatic checks before anything is published.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site works without any keys. The Ask widget stays hidden until `GROQ_API_KEY` is set.

### Environment variables

Create `.env.local` in the project root (it is git-ignored):

| Variable | Required | What it does |
|---|---|---|
| `GROQ_API_KEY` | For the Ask bot and the blog pipeline | Free key from [console.groq.com](https://console.groq.com). Without it the Ask widget is hidden. |
| `ASK_MODEL` | No | Overrides the Groq model used by the Ask bot. Default `openai/gpt-oss-120b`. |
| `BLOG_MODEL` | No | Overrides the model used by the blog pipeline. |
| `GITHUB_TOKEN` | No | Raises the GitHub API limit for project stats on the home page. Without it the limit is 60 requests an hour. |
| `NEXT_PUBLIC_SITE_URL` | In production | The public URL of the site, for example `https://yourname.dev`. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Rebuild the Ask index, then build the site |
| `npm run index` | Rebuild `data/index.json` from `content/` and `content/ask-notes.md` |
| `npm run eval` | Check Ask retrieval and answers (answers need `GROQ_API_KEY`) |
| `npm run blog:generate` | Write one blog post (add `-- --dry` to print it without saving) |
| `npm run blog:check` | Re-run the blog's hard rules over every saved post |
| `npm run lint` | Lint the project |

## How the pieces work

### Content
All site content lives in `content/*.ts`. Edit those files and the page, the Ask bot and the blog all pick up the change.

### Ask bot
1. `npm run index` splits the content and `content/ask-notes.md` into chunks and writes `data/index.json`. Sections of the notes that still contain a `TODO` are skipped.
2. Each question is matched against those chunks with keyword search (BM25), a small pure-JavaScript ranker. If nothing matches, and the question is not about Daivik, the bot refuses without calling Groq.
3. Only the matched chunks go to Groq, and the answer streams back with source links.

Code is in `lib/ask/`, `app/api/ask/route.ts` and `components/AskBot.tsx`. The route has no native dependencies, so it runs on Vercel as is.

### Blog
A scheduled GitHub Action runs `scripts/blog/run.ts` every day:

1. Collect trending topics from Hacker News, dev.to and GitHub.
2. Pick one that has not been covered and has enough source material.
3. Write an outline, then a draft, using `content/blog-style.md` and the reference posts.
4. Check the draft with code rules (no emojis, dashes, filler phrases, invented numbers or unknown links), then a second AI pass for tone and accuracy. Rewrite up to three times.
5. If it passes, commit it to `content/blog/`. If not, nothing is published and the Action opens an issue.

The AI-generated disclosure is shown on the blog and on every post. Add `GROQ_API_KEY` as a repository secret (Settings, Secrets and variables, Actions) before the workflow can work.

The workflow has no schedule of its own. An external cron service ([cron-job.org](https://cron-job.org)) starts it once a day by calling the GitHub API:

- **URL:** `https://api.github.com/repos/<owner>/<repo>/actions/workflows/blog.yml/dispatches`
- **Method:** `POST`, with the body `{"ref":"main"}`
- **Headers:** `Accept: application/vnd.github+json`, `Authorization: Bearer <token>`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: cron-job-org`
- **Token:** a fine-grained token limited to this one repository, with **Actions: Read and write**. A successful call returns `204`.

## Deploy

The project is set up for [Vercel](https://vercel.com), the host built by the Next.js team. The Hobby plan is free for personal projects.

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import the repository.
3. Leave the framework as Next.js and the build command as the default (`npm run build`).
4. Add the environment variables from the table above under Project Settings, Environment Variables.
5. Click Deploy. Every push to `main` redeploys automatically, including the daily blog commits.

This app has not been deployed yet. The Ask route loads a small embedding model on the server, so if the first deploy fails on function size or build time, check the Vercel build logs first.

## Get a free .dev domain with the GitHub Student Developer Pack

Offers change, so check the [pack page](https://education.github.com/pack) before relying on this.

1. **Get the pack.** Apply at [github.com/settings/education/benefits](https://github.com/settings/education/benefits) with your school email or student ID. Approval can take a few days.
2. **Claim the domain from Name.com.** Its free-domain list includes `.dev`, for one year. Start from the [Name.com student partner page](https://name.com/partner/github-students), search for the name you want, and check out with the pack offer applied. Name.com asks for a payment method but should charge nothing for the free domain. It renews at the normal price after a year, so set a reminder.
3. **Note on other offers.** Namecheap's student offer is a free `.me` domain, not `.dev`. The `.TECH` offer gives a `.tech` domain for a year.
4. **Connect it to Vercel.** In your Vercel project open Settings, Domains, and add the domain. Vercel shows the exact DNS records to create. Add them in Name.com under DNS Records for the domain. Use the values Vercel shows, because they can change.
5. **Set `NEXT_PUBLIC_SITE_URL`** to the new address and redeploy.

`.dev` domains only work over HTTPS. Vercel issues the certificate automatically once the DNS records are correct, which can take a few minutes.
