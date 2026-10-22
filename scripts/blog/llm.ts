import Groq from "groq-sdk";

export const MODEL = process.env.BLOG_MODEL ?? "openai/gpt-oss-120b";

// Groq's free tier allows about 8,000 tokens per minute. A request is admitted on prompt + max_tokens,
// so we track what was used in the last minute and wait for room instead of failing.
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

let client: Groq | null = null;

export async function chat(
  system: string,
  user: string,
  opts: { json?: boolean; temperature?: number; effort?: "low" | "medium" | "high"; maxTokens?: number } = {},
) {
  client ??= new Groq({ maxRetries: 0 });
  const maxTokens = opts.maxTokens ?? 1500; // reasoning tokens count against this limit
  const estimate = Math.ceil((system.length + user.length) / 3.5) + maxTokens;
  if (estimate > 8000) throw new Error(`Request too large for the free tier (${estimate} tokens)`);

  for (let attempt = 0; ; attempt++) {
    await waitForRoom(estimate);
    try {
      const res = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? 0.5,
        max_tokens: maxTokens,
        reasoning_effort: opts.effort ?? "low",
        ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      window.push({ at: Date.now(), tokens: res.usage?.total_tokens ?? estimate });
      const text = res.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("The model returned an empty answer (it may have run out of tokens while reasoning)");
      return text;
    } catch (err) {
      if (err instanceof Groq.RateLimitError && attempt < 4) {
        console.log("  rate limited, waiting 30s...");
        window.push({ at: Date.now(), tokens: TPM }); // fill the window so the next try waits
        await sleep(30_000);
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
