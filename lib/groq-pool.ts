import Groq from "groq-sdk";

// A pool of Groq API keys. Calls go to the first key that is usable. A key that is rejected (401/403) is skipped for a day,
// and a key that is rate limited (429) is skipped until its limit resets. Key values are never logged, only their names.

type Slot = { label: string; key: string; client?: Groq; until: number };

const DAY = 24 * 60 * 60_000;
let slots: Slot[] | null = null;

// Read lazily, because scripts load .env.local after their imports have run.
function load(): Slot[] {
  const found: Slot[] = [];
  const add = (label: string, raw: string | undefined) => {
    const key = raw?.trim().replace(/^["']|["']$/g, "");
    if (key && !found.some((s) => s.key === key)) found.push({ label, key, until: 0 });
  };
  add("GROQ_API_KEY", process.env.GROQ_API_KEY);
  (process.env.GROQ_API_KEYS ?? "").split(",").forEach((k, i) => add(`GROQ_API_KEYS #${i + 1}`, k));
  for (let i = 2; i <= 20; i++) add(`GROQ_API_KEY_${i}`, process.env[`GROQ_API_KEY_${i}`]);
  return found;
}

const all = () => (slots ??= load());

export const groqKeyCount = () => all().length;
export const hasGroqKeys = () => all().length > 0;

// Every key is cooling down. retryInMs says when the soonest one is usable again.
export class GroqPoolExhausted extends Error {
  constructor(
    public retryInMs: number,
    public cause?: unknown,
  ) {
    super(`All Groq keys are unavailable right now (soonest retry in ${Math.ceil(retryInMs / 1000)}s)`);
  }
}

// "Please try again in 1h2m3.5s" or a retry-after header.
function cooldownFrom(err: InstanceType<typeof Groq.APIError>): number {
  const header = Number(err.headers?.get?.("retry-after"));
  if (header > 0) return header * 1000 + 500;
  const m = String(err.message).match(/try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
  if (m && (m[1] || m[2] || m[3])) return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000 + 500;
  return /per day|TPD/i.test(String(err.message)) ? 15 * 60_000 : 60_000;
}

// Decide whether another key could help. A bad request or an unknown model fails the same way on every key, so those are not rotated.
function classify(err: unknown): { rotate: boolean; cooldownMs: number; why: string } {
  if (err instanceof Groq.APIConnectionError) return { rotate: true, cooldownMs: 30_000, why: "connection error" };
  if (err instanceof Groq.APIError) {
    if (err.status === 401 || err.status === 403) return { rotate: true, cooldownMs: DAY, why: `rejected (${err.status})` };
    if (err.status === 429) return { rotate: true, cooldownMs: cooldownFrom(err), why: "rate limited" };
    if (err.status && err.status >= 500) return { rotate: true, cooldownMs: 30_000, why: `server error (${err.status})` };
  }
  return { rotate: false, cooldownMs: 0, why: "" };
}

export async function withGroqKey<T>(fn: (client: Groq, label: string) => Promise<T>): Promise<T> {
  const pool = all();
  if (pool.length === 0) throw new Error("No Groq API key is set. Add GROQ_API_KEY, GROQ_API_KEY_2, ... or GROQ_API_KEYS.");

  let lastError: unknown;
  for (const slot of pool) {
    if (slot.until > Date.now()) continue;
    slot.client ??= new Groq({ apiKey: slot.key, maxRetries: 0 }); // rotate to the next key instead of retrying this one
    try {
      return await fn(slot.client, slot.label);
    } catch (err) {
      const verdict = classify(err);
      if (!verdict.rotate) throw err;
      slot.until = Date.now() + verdict.cooldownMs;
      console.warn(`${slot.label}: ${verdict.why}, skipping it for ${Math.ceil(verdict.cooldownMs / 1000)}s`);
      lastError = err;
    }
  }
  throw new GroqPoolExhausted(Math.max(1000, Math.min(...pool.map((s) => s.until)) - Date.now()), lastError);
}

// Sends one tiny request through every key, so you can see which keys work. Prints names and statuses only.
export async function probeGroqKeys(model: string) {
  const results: { label: string; status: string }[] = [];
  for (const slot of all()) {
    try {
      await new Groq({ apiKey: slot.key, maxRetries: 0 }).chat.completions.create({
        model,
        max_tokens: 16,
        reasoning_effort: "low",
        messages: [{ role: "user", content: "Reply with: ok" }],
      });
      results.push({ label: slot.label, status: "ok" });
    } catch (err) {
      const v = classify(err);
      const status = err instanceof Groq.APIError ? `HTTP ${err.status}` : "failed";
      results.push({ label: slot.label, status: v.rotate ? `${v.why} (${status})` : `error (${status})` });
    }
  }
  return results;
}
