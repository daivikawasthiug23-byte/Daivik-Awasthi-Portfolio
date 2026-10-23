import { GeminiPoolExhausted, geminiStream, hasGeminiKeys } from "@/lib/gemini-pool";
import { GroqPoolExhausted, hasGroqKeys, withGroqKey } from "@/lib/groq-pool";
import { REFUSAL, systemPrompt } from "@/lib/ask/prompts";
import { pickSources, retrieve } from "@/lib/ask/retrieve";

export const maxDuration = 30;

const MODEL = process.env.ASK_MODEL ?? "openai/gpt-oss-120b";

// In-memory limiter: per server instance, which is good enough for v1.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

type Event =
  | { type: "sources"; sources: { title: string; href: string }[] }
  | { type: "token"; value: string }
  | { type: "done" }
  | { type: "error"; reason?: "busy" };

export async function POST(req: Request) {
  if (!hasGroqKeys() && !hasGeminiKeys()) return Response.json({ error: "unavailable" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (limited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 300) {
    return Response.json({ error: "bad_question" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const docs = await retrieve(question);
        if (docs.length === 0) {
          send({ type: "token", value: REFUSAL });
          send({ type: "done" });
          return;
        }

        const sources = pickSources(docs);
        if (sources.length > 0) send({ type: "sources", sources });

        const system = systemPrompt(docs.map((d) => `[${d.title}] ${d.text}`).join("\n\n"));
        const viaGemini = async () => {
          for await (const value of await geminiStream(system, question, { temperature: 0.3, maxTokens: 1000 }))
            send({ type: "token", value });
        };

        if (!hasGroqKeys()) {
          await viaGemini();
        } else {
          try {
            // The create call is where a bad or rate-limited key fails, so the pool can move on to the next key here.
            const completion = await withGroqKey((groq) =>
              groq.chat.completions.create({
                model: MODEL,
                temperature: 0.3,
                max_tokens: 1000,
                reasoning_effort: "low",
                stream: true,
                messages: [
                  { role: "system", content: system },
                  { role: "user", content: question },
                ],
              }),
            );
            for await (const part of completion) {
              const value = part.choices[0]?.delta?.content;
              if (value) send({ type: "token", value });
            }
          } catch (err) {
            // Only fall back before any answer text went out, which is when the pool reports that every key is busy.
            if (!(err instanceof GroqPoolExhausted) || !hasGeminiKeys()) throw err;
            await viaGemini();
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("ask failed", err);
        send({ type: "error", reason: err instanceof GroqPoolExhausted || err instanceof GeminiPoolExhausted ? "busy" : undefined });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
