// Splits a long paragraph at the sentence boundary closest to its middle.
function splitLong(paragraph: string): string[] {
  const words = paragraph.split(/\s+/).length;
  if (words <= 80) return [paragraph];
  // Split after sentence-ending punctuation that is followed by whitespace. Unlike match(), split() keeps every character,
  // so text such as `lib.rs` (a period with no space after it) is never dropped.
  const sentences = paragraph.split(/(?<=[.?])\s+/);
  if (sentences.length < 2) return [paragraph];
  let best = 1;
  let bestGap = Infinity;
  let running = 0;
  sentences.forEach((sentence, i) => {
    running += sentence.split(/\s+/).filter(Boolean).length;
    const gap = Math.abs(running - words / 2);
    if (i < sentences.length - 1 && gap < bestGap) [best, bestGap] = [i + 1, gap];
  });
  const left = sentences.slice(0, best).join(" ").trim();
  const right = sentences.slice(best).join(" ").trim();
  return [...splitLong(left), ...splitLong(right)];
}

// Mechanical fixes for things that are never worth a rewrite round: dashes, look-alike hyphens,
// bold markers and over-long paragraphs. They change the formatting only, never the meaning.
export const normalize = (s: string) =>
  s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[\u2010\u2011\u2012]/g, "-")
    .replace(/[\u00a0\u2009\u202f]/g, " ")
    .split(/(```[\s\S]*?```)/)
    .map((part) =>
      part.startsWith("```")
        ? part
        : part
            .replace(/\*\*([^*\n]+)\*\*/g, "$1")
            .split(/\n{2,}/)
            .flatMap((block) => (/^(#|[-*] |\d+\. )/.test(block.trim()) ? [block] : splitLong(block)))
            .join("\n\n"),
    )
    .join("")
    .trim();
