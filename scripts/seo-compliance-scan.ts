/**
 * Lists every eligibility / recommendation / directive phrase on the occupation pages and the points calculator
 * (docs/seo-occupation-audit.md section 5). Read-only.   npx tsx scripts/seo-compliance-scan.ts [--git-ref <ref>]
 * --git-ref scans the page sources as they were at that commit (the "before" state, e.g. 53324bd).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { BANNED_INFORMATION_PAGE_PHRASES } from "../lib/seo/banned-phrases";

const refIdx = process.argv.indexOf("--git-ref");
const ref = refIdx > 0 ? process.argv[refIdx + 1] : undefined;
const read = (f: string) => (ref ? execSync(`git show "${ref}:${f}"`, { encoding: "utf8" }) : readFileSync(f, "utf8"));

const sources: Array<{ name: string; text: string }> = [];
for (const f of [
  "app/[locale]/(main)/occupations/[id]/page.tsx",
  "components/StateDemandRadar.tsx",
  "components/MiniCvTeaser.tsx",
  "app/[locale]/(main)/tools/points-calculator/[slug]/page.tsx",
  "app/[locale]/(main)/tools/points-calculator/page.tsx",
  "app/[locale]/(main)/tools/points-calculator/australia/page.tsx",
  "app/[locale]/(main)/tools/visa-comparison/page.tsx",
  "app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient.tsx",
  "app/[locale]/(main)/resources/occupation-list/page.tsx",
  "app/[locale]/(main)/tools/anzsco-finder/page.tsx",
  "lib/seo/points-calculator-content.ts",
]) {
  try {
    sources.push({ name: f, text: read(f).replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "") });
  } catch {
    /* file not present at that ref */
  }
}
for (const loc of ["en", "tr", "zh-Hans"]) {
  const d = JSON.parse(readFileSync(`public/locales/${loc}.json`, "utf8")) as Record<string, string>;
  sources.push({ name: `public/locales/${loc}.json (pc.* calculator strings)`, text: Object.entries(d).filter(([k]) => k.startsWith("pc.")).map(([k, v]) => `${k}: ${v}`).join("\n") });
}

for (const s of sources) {
  const lines = s.text.split("\n");
  const hits: string[] = [];
  lines.forEach((line, i) => {
    for (const p of BANNED_INFORMATION_PAGE_PHRASES) {
      const m = line.match(p.re);
      if (m) hits.push(`  [${p.id}] ${line.trim().slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 70)}`);
    }
  });
  console.log(`\n### ${s.name} -- ${hits.length} hit(s)`);
  for (const h of hits.slice(0, 40)) console.log(h);
}
