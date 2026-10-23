import { probeGeminiKeys, geminiKeyCount } from "../lib/gemini-pool";

try {
  process.loadEnvFile(".env.local");
} catch {}

async function main() {
  console.log(`Found ${geminiKeyCount()} Gemini key(s). Testing each with one tiny request...\n`);
  const results = await probeGeminiKeys();
  for (const r of results) console.log(`${r.status === "ok" ? "OK  " : "SKIP"}  ${r.label.padEnd(18)} ${r.status}`);
  const ok = results.filter((r) => r.status === "ok").length;
  console.log(`\n${ok} of ${results.length} key(s) usable right now.`);
  process.exit(ok ? 0 : 1);
}

main();
