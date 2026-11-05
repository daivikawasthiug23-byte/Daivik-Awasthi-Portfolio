# Daivik Awasthi, Portfolio

Personal portfolio built with Next.js 16, React 19 and Tailwind CSS 4, in a soft neo-brutalist style with light and dark mode. It has two main features:

- **Console:** a popup game-console terminal with a joystick, keys and commands like `about`, `work`, `projects` and `github`. It reads from the same `content/` files as the page.
- **Blog:** daily engineering posts written by an AI pipeline under a strict style guide, with automatic checks before anything is published.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site works without any keys. Keys are only needed for the blog pipeline.

### Environment variables

Create `.env.local` in the project root (it is git-ignored):

| Variable | Required | What it does |
|---|---|---|
| `GROQ_API_KEY` | For the blog pipeline | Free key from [console.groq.com](https://console.groq.com). |
| `GROQ_API_KEY_2` to `GROQ_API_KEY_20` | No | Extra keys. If a key is rate limited or rejected, the app moves on to the next one. |
| `GROQ_API_KEYS` | No | The same extra keys as one comma-separated value. This is the easiest form for Vercel and GitHub, where you would otherwise add every key by hand. |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2` to `GEMINI_API_KEY_20`, `GEMINI_API_KEYS` | No | Gemini keys from [aistudio.google.com](https://aistudio.google.com). Used as a fallback when every Groq key is busy. Rotated the same way as the Groq keys. Run `npm run gemini:check` to test them. `GEMINI_TEXT_MODEL` overrides the model. |
| `UNSPLASH_ACCESS_KEY` | No | Access key from [unsplash.com/developers](https://unsplash.com/developers), used for blog thumbnails. `UPSLASH_ACCESS_KEY` is accepted too. The secret key is not needed. Without it thumbnails are drawn as SVGs. |
| `BLOG_MODEL` | No | Overrides the model used by the blog pipeline. |
| `NEXT_PUBLIC_SITE_URL` | In production | The public URL of the site, for example `https://yourname.dev`. |

### Groq key pool

Calls go to the first usable key. A rejected key (401 or 403) is skipped for a day, and a rate-limited key (429) is skipped until its limit resets. When every key is busy, the blog pipeline waits a few minutes or stops if the daily limit is gone. Key values are never logged, only their names.

To put all keys into one value for Vercel or GitHub, run this in the project folder. It copies them to the clipboard without printing them:

```bash
grep -E '^GROQ_API_KEY(_[0-9]+)?=' .env.local | cut -d= -f2- | paste -sd, - | pbcopy
```

Paste the result as the `GROQ_API_KEYS` environment variable in Vercel, and as a repository secret named `GROQ_API_KEYS` in GitHub (Settings, Secrets and variables, Actions). Keep `GROQ_API_KEY` set as well.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build the site |
| `npm run blog:generate` | Write one blog post (add `-- --dry` to print it without saving) |
| `npm run blog:thumbnails` | Generate thumbnails for saved posts that have none (add `-- --force` to redo all) |
| `npm run blog:check` | Re-run the blog's hard rules over every saved post |
| `npm run groq:check` | Test every Groq key with one tiny request and show which ones work (names only, never the values) |
| `npm run lint` | Lint the project |

## How the pieces work

### Content
All site content lives in `content/*.ts`. Edit those files and the page, the console and the blog all pick up the change. Project images live in `public/projects/`. Web apps use a screenshot of the live site. The others (ML, systems and tools) use a screen drawn from what the project does, such as the order book for the matching engine.

### Blog
A scheduled GitHub Action runs `scripts/blog/run.ts` every day:

1. Collect trending topics from Hacker News, dev.to and GitHub.
2. Pick one that has not been covered and has enough source material.
3. Write an outline, then a draft, using `content/blog-style.md` and the reference posts.
4. Check the draft with code rules (no emojis, dashes, filler phrases, invented numbers or unknown links), then a second AI pass for tone and accuracy. Rewrite up to three times.
5. Make a thumbnail: the writer model picks a visual idea and search words for the post, and the script saves a matching [Unsplash](https://unsplash.com) photo (tinted blue, photographer credited on the post) into `public/blog/`. If there is no photo the model draws an SVG instead, and if that fails too the post is still published without a thumbnail.
6. If it passes, commit it to `content/blog/`. If not, nothing is published and the Action opens an issue.

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

The daily blog job runs in GitHub Actions, not on Vercel, so the deployed site needs no API keys.

## Get a free .dev domain with the GitHub Student Developer Pack

Offers change, so check the [pack page](https://education.github.com/pack) before relying on this.

1. **Get the pack.** Apply at [github.com/settings/education/benefits](https://github.com/settings/education/benefits) with your school email or student ID. Approval can take a few days.
2. **Claim the domain from Name.com.** Its free-domain list includes `.dev`, for one year. Start from the [Name.com student partner page](https://name.com/partner/github-students), search for the name you want, and check out with the pack offer applied. Name.com asks for a payment method but should charge nothing for the free domain. It renews at the normal price after a year, so set a reminder.
3. **Note on other offers.** Namecheap's student offer is a free `.me` domain, not `.dev`. The `.TECH` offer gives a `.tech` domain for a year.
4. **Connect it to Vercel.** In your Vercel project open Settings, Domains, and add the domain. Vercel shows the exact DNS records to create. Add them in Name.com under DNS Records for the domain. Use the values Vercel shows, because they can change.
5. **Set `NEXT_PUBLIC_SITE_URL`** to the new address and redeploy.

`.dev` domains only work over HTTPS. Vercel issues the certificate automatically once the DNS records are correct, which can take a few minutes.
