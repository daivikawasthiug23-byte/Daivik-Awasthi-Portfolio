import { readFileSync, readdirSync } from "node:fs";
import { ruleViolations } from "./gate";
import type { Post } from "./types";

// Re-runs the hard rules over every published post. Run it after changing the rules.
let failed = 0;
for (const f of readdirSync("content/blog").filter((f) => f.endsWith(".json"))) {
  const post = JSON.parse(readFileSync(`content/blog/${f}`, "utf8")) as Post;
  const v = ruleViolations(post.body, post.sources);
  if (v.length) failed++;
  console.log(`${v.length ? "FAIL" : "PASS"}  ${post.slug}`);
  v.forEach((x) => console.log(`      ${x}`));
}
console.log(failed ? `\n${failed} post(s) failed` : "\nAll posts pass");
process.exit(failed ? 1 : 0);
