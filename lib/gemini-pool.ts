// A pool of Gemini API keys, used as a fallback when every Groq key is busy.
// Same rules as the Groq pool: a rejected key (400 key invalid, 401/403) is skipped for a day, a rate limited key (429)
// until its limit resets. Key values are never logged, only their names. Plain REST, so there is no extra dependency.

type Slot = { label: string; key: string; until: number };

const DAY = 24 * 60 * 60_000;
const BASE = "https://generativelanguage.googleapis.com/v1beta";
let slots: Slot[] | null = null;

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.5-flash";

function load(): Slot[] {
  const found: Slot[] = [];
  const add = (label: string, raw: string | undefined) => {
    const key = raw?.trim().replace(/^["']|["']$/g, "");
    if (key && !found.some((s) => s.key === key)) found.push({ label, key, until: 0 });
  };
  add("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
  (process.env.GEMINI_API_KEYS ?? "").split(",").forEach((k, i) => add(`GEMINI_API_KEYS #${i + 1}`, k));
  for (let i = 2; i <= 20; i++) add(`GEMINI_API_KEY_${i}`, process.env[`GEMINI_API_KEY_${i}`]);
  return found;
}

const all = () => (slots ??= load());

export const geminiKeyCount = () => all().length;
export const hasGeminiKeys = () => all().length > 0;

export class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}

export class GeminiPoolExhausted extends Error {
  constructor(
    public retryInMs: number,
    public cause?: unknown,
  ) {
    super(`All Gemini keys are unavailable right now (soonest retry in ${Math.ceil(retryInMs / 1000)}s)`);
  }
}

async function failure(res: Response): Promise<GeminiError> {
  const text = await res.text().catch(() => "");
  let message = text.slice(0, 200);
  try {
    message = JSON.parse(text).error?.message ?? message;
  } catch {}
  const m = text.match(/"retryDelay":\s*"([\d.]+)s"/) ?? message.match(/retry in ([\d.]+)s/i);
  return new GeminiError(res.status, message, m ? Number(m[1]) * 1000 + 500 : undefined);
}

function classify(err: unknown): { rotate: boolean; cooldownMs: number; why: string } {
  if (err instanceof GeminiError) {
    // Google answers 400 "API key not valid" for a bad key, which is not a bad request.
    if (err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message)))
      return { rotate: true, cooldownMs: DAY, why: `rejected (${err.status})` };
    if (err.status === 429) {
      const perDay = /per day|PerDay/i.test(err.message);
      return { rotate: true, cooldownMs: err.retryAfterMs ?? (perDay ? 15 * 60_000 : 60_000), why: "rate limited" };
    }
    if (err.status >= 500) return { rotate: true, cooldownMs: 30_000, why: `server error (${err.status})` };
    return { rotate: false, cooldownMs: 0, why: "" };
  }
  // fetch itself failed or timed out
  return { rotate: true, cooldownMs: 30_000, why: "connection error" };
}

export async function withGeminiKey<T>(fn: (key: string, label: string) => Promise<T>): Promise<T> {
  const pool = all();
  if (pool.length === 0) throw new Error("No Gemini API key is set. Add GEMINI_API_KEY, GEMINI_API_KEY_2, ... or GEMINI_API_KEYS.");

  let lastError: unknown;
  for (const slot of pool) {
    if (slot.until > Date.now()) continue;
    try {
      return await fn(slot.key, slot.label);
    } catch (err) {
      const verdict = classify(err);
      if (!verdict.rotate) throw err;
      slot.until = Date.now() + verdict.cooldownMs;
      console.warn(`${slot.label}: ${verdict.why}, skipping it for ${Math.ceil(verdict.cooldownMs / 1000)}s`);
      lastError = err;
    }
  }
  throw new GeminiPoolExhausted(Math.max(1000, Math.min(...pool.map((s) => s.until)) - Date.now()), lastError);
}

type TextOpts = { json?: boolean; temperature?: number; maxTokens?: number };

function body(system: string, user: string, opts: TextOpts) {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      maxOutputTokens: opts.maxTokens ?? 1500,
      thinkingConfig: { thinkingBudget: 0 }, // the answers are short, so spend the tokens on the answer
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

type Part = { text?: string; thought?: boolean };
const textOf = (data: { candidates?: { content?: { parts?: Part[] } }[] }) =>
  (data.candidates?.[0]?.content?.parts ?? []).map((p) => (p.thought ? "" : (p.text ?? ""))).join("");

export async function geminiText(system: string, user: string, opts: TextOpts = {}) {
  return withGeminiKey(async (key) => {
    const res = await fetch(`${BASE}/models/${GEMINI_TEXT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body(system, user, opts)),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw await failure(res);
    const text = textOf(await res.json()).trim();
    if (!text) throw new Error("Gemini returned an empty answer");
    return text;
  });
}

// Opens the stream under a key (so a bad key fails here and the pool moves on), then yields the text as it arrives.
export async function geminiStream(system: string, user: string, opts: TextOpts = {}): Promise<AsyncGenerator<string>> {
  const res = await withGeminiKey(async (key) => {
    const r = await fetch(`${BASE}/models/${GEMINI_TEXT_MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body(system, user, opts)),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw await failure(r);
    return r;
  });
  async function* read() {
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const text = textOf(JSON.parse(line.slice(5)));
          if (text) yield text;
        } catch {}
      }
    }
  }
  return read();
}

// Sends one tiny request through every key, so you can see which keys work. Prints names and statuses only.
export async function probeGeminiKeys() {
  const results: { label: string; status: string }[] = [];
  for (const slot of all()) {
    try {
      const res = await fetch(`${BASE}/models/${GEMINI_TEXT_MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": slot.key },
        body: JSON.stringify(body("Reply with: ok", "ok", { maxTokens: 16 })),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw await failure(res);
      results.push({ label: slot.label, status: "ok" });
    } catch (err) {
      const v = classify(err);
      const status = err instanceof GeminiError ? `HTTP ${err.status}` : "failed";
      results.push({ label: slot.label, status: v.rotate ? `${v.why} (${status})` : `error (${status})` });
    }
  }
  return results;
}
