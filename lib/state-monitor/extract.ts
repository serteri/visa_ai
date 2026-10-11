/**
 * Page text for the change monitor: the main text of an HTML page (scripts, styles, navigation, header, footer and forms removed), normalised so
 * markup, whitespace and case changes do not count as a change, plus a stable hash, a short snippet and a diff summary of two texts.
 */
import { createHash } from "node:crypto";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "..." };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** The main text of an HTML page, one block per line. */
export function extractMainText(html: string): string {
  let h = html.replace(/<!--[\s\S]*?-->/g, " ");
  h = h.replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const main = /<main\b[\s\S]*?<\/main>/i.exec(h) ?? /<article\b[\s\S]*?<\/article>/i.exec(h);
  if (main) h = main[0];
  else h = h.replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  h = h.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/ul|\/ol|\/table)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
  return decode(h)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Case, spacing and quote style do not count as a change. */
export function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export const hashText = (normalised: string) => createHash("sha256").update(normalised).digest("hex");

export const snippetOf = (normalised: string, max = 280) => normalised.replace(/\n/g, " ").slice(0, max);

const sentences = (normalised: string): string[] =>
  normalised
    .split(/\n|(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 12);

/** What changed between two normalised texts, in a few lines for the alert email. */
export function summariseDiff(oldText: string, newText: string): string {
  const a = sentences(oldText);
  const b = sentences(newText);
  const aSet = new Set(a);
  const bSet = new Set(b);
  const added = b.filter((x) => !aSet.has(x));
  const removed = a.filter((x) => !bSet.has(x));
  const cut = (x: string) => (x.length > 170 ? `${x.slice(0, 167)}...` : x);
  const lines = [`${added.length} line(s) added, ${removed.length} removed; length ${oldText.length} -> ${newText.length} characters.`];
  for (const x of added.slice(0, 3)) lines.push(`  + ${cut(x)}`);
  for (const x of removed.slice(0, 3)) lines.push(`  - ${cut(x)}`);
  if (added.length + removed.length === 0) lines.push("  (wording order or formatting changed; no sentence added or removed)");
  return lines.join("\n");
}
