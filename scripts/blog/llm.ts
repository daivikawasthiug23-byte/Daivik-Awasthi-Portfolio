import { GroqPoolExhausted, groqKeyCount, withGroqKey } from "../../lib/groq-pool";

export const MODEL = process.env.BLOG_MODEL ?? "openai/gpt-oss-120b";

// With a single free-tier key the limit is about 8,000 tokens a minute, and a request counts as prompt + max_tokens.
// So with one key we track the last minute and wait for room. With several keys the pool rotates on a rate limit instead.
const TPM = 7500;
const window: { at: number; tokens: number }[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForRoom(estimate: number) {
  for (;;) {
    const now = Date.now();
    while (window.length && now - window[0].at > 60_000) window.shift();
    const used = window.reduce((s, w) => s + w.tokens, 0);
    if (used + estimate <= TPM || window.length === 0) return;
    const wait = 60_000 - (now - window[0].at) + 500;
    console.log(`  waiting ${Math.ceil(wait / 1000)}s for token quota...`);
    await sleep(wait);
  }
}

const MAX_WAIT_MS = 10 * 60_000; // a longer wait means the daily limit is gone, so fail and let the workflow open an issue

export async function chat(
  system: string,
  user: string,
  opts: { json?: boolean; temperature?: number; effort?: "low" | "medium" | "high"; maxTokens?: number } = {},
) {
  const maxTokens = opts.maxTokens ?? 1500; // reasoning tokens count against this limit
  const estimate = Math.ceil((system.length + user.length) / 3.5) + maxTokens;
  if (estimate > 8000) throw new Error(`Request too large for the free tier (${estimate} tokens)`);

  for (let attempt = 0; ; attempt++) {
    if (groqKeyCount() === 1) await waitForRoom(estimate);
    try {
      const res = await withGroqKey((groq) =>
        groq.chat.completions.create({
          model: MODEL,
          temperature: opts.temperature ?? 0.5,
          max_tokens: maxTokens,
          reasoning_effort: opts.effort ?? "low",
          ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      );
      window.push({ at: Date.now(), tokens: res.usage?.total_tokens ?? estimate });
      const text = res.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("The model returned an empty answer (it may have run out of tokens while reasoning)");
      return text;
    } catch (err) {
      if (err instanceof GroqPoolExhausted && attempt < 10 && err.retryInMs <= MAX_WAIT_MS) {
        const wait = Math.min(err.retryInMs, 90_000) + 1000;
        console.log(`  every Groq key is busy, waiting ${Math.ceil(wait / 1000)}s...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

export async function chatJson<T>(system: string, user: string, opts: Parameters<typeof chat>[2] = {}): Promise<T> {
  const text = await chat(system, user, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The model did not return JSON");
    return JSON.parse(match[0]) as T;
  }
}
