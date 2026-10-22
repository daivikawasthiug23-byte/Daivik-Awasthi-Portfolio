import { hasGroqKeys, withGroqKey } from "../lib/groq-pool";
import { REFUSAL, systemPrompt } from "../lib/ask/prompts";
import { retrieve } from "../lib/ask/retrieve";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Retrieval: the question must pull a chunk whose title contains `title` ("" means nothing should match).
const retrievalCases: [question: string, title: string][] = [
  ["What did he build at Goldman Sachs?", "Goldman Sachs"],
  ["What is his GPA?", "Education"],
  ["matching engine speed", "Order matching engine"],
  ["How do I contact him?", "contact"],
  ["Which languages does he use?", "Skills"],
  ["Is he a leader anywhere?", "Leadership"],
  ["What is the capital of France?", ""],
];

// Answers: the reply must match `pattern`.
const answerCases: [question: string, pattern: RegExp][] = [
  ["What is his GPA?", /8\.85/],
  ["How fast is the matching engine?", /139,000/],
  ["What is his LeetCode max rating?", /1692/],
  ["How many consultants does he lead at 180 Degrees Consulting?", /\b60\b/],
  ["Does he know Rust?", /(don.t (know|have)|no information|not? (mention|listed|include))/i],
];

async function answer(question: string) {
  const docs = await retrieve(question);
  if (docs.length === 0) return REFUSAL;
  const res = await withGroqKey((groq) => groq.chat.completions.create({
    model: process.env.ASK_MODEL ?? "openai/gpt-oss-120b",
    temperature: 0,
    max_tokens: 1000,
    reasoning_effort: "low",
    messages: [
      { role: "system", content: systemPrompt(docs.map((d) => `[${d.title}] ${d.text}`).join("\n\n")) },
      { role: "user", content: question },
    ],
  }));
  return res.choices[0]?.message?.content ?? "";
}

async function main() {
  let failed = 0;
  const report = (ok: boolean, label: string) => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  };

  console.log("Retrieval");
  for (const [q, title] of retrievalCases) {
    const titles = (await retrieve(q)).map((c) => c.title);
    const ok = title === "" ? titles.length === 0 : titles.some((t) => t.toLowerCase().includes(title.toLowerCase()));
    report(ok, `${q}  ->  ${titles.join(", ") || "(none)"}`);
  }

  console.log("\nAnswers");
  if (!hasGroqKeys()) {
    console.log("SKIP  no Groq key is set");
  } else {
    for (const [q, pattern] of answerCases) {
      const a = await answer(q);
      report(pattern.test(a), `${q}  (needs ${pattern})`);
      if (!pattern.test(a)) console.log(`      got: ${a.replace(/\n/g, " ")}`);
    }
  }

  console.log(failed ? `\n${failed} failed` : "\nAll passed");
  process.exit(failed ? 1 : 0);
}

main();
