/**
 * The assistant's active occupation-list sources can never return "225113 = Market Research Analyst": the obsolete "Skilled list.md" is retired
 * from retrieval, and the sources that remain carry 225113 = Marketing Specialist and 225112 = Market Research Analyst.
 *
 *   npx tsx scripts/test-chat-occupation-sources.ts
 */
import { existsSync, readFileSync } from "node:fs";

import { OCCUPATION_LIST_SOURCES, RETIRED_KNOWLEDGE_SOURCES } from "../lib/chat/knowledge-sources";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};

async function main() {
  console.log("\n1. the stale source is retired from both retrieval buckets");
  check(RETIRED_KNOWLEDGE_SOURCES.includes("Skilled list.md") && !OCCUPATION_LIST_SOURCES.includes("Skilled list.md"), "'Skilled list.md' is retired and is not an active occupation-list source");
  const deps = readFileSync("lib/chat/deps.ts", "utf8");
  check(/NOT IN \(\$\{Prisma\.join\(\[\.\.\.OCCUPATION_LIST_SOURCES, \.\.\.RETIRED_KNOWLEDGE_SOURCES\]\)\}\)/.test(deps) && /source' IN \(\$\{Prisma\.join\(OCCUPATION_LIST_SOURCES\)\}\)/.test(deps), "the primary query excludes retired sources (they cannot fall into the general bucket) and the occupation query reads only the active list");
  check(OCCUPATION_LIST_SOURCES.every((s) => !RETIRED_KNOWLEDGE_SOURCES.includes(s)), "no source is both active and retired");

  console.log("\n2. every active occupation-list source says 225113 = Marketing Specialist and 225112 = Market Research Analyst");
  // data/knowledge is not committed (.gitignore), so CI reads the committed copy under public/; a local data/knowledge copy is checked too.
  // The .xlsx has no committed copy and is only checked where data/knowledge has it.
  for (const source of OCCUPATION_LIST_SOURCES) for (const file of [`public/${source}`, `data/knowledge/${source}`].filter((f) => existsSync(f))) {
    if (source.endsWith(".json")) {
      const rows = JSON.parse(readFileSync(file, "utf8")) as Array<{ anzsco_code: string; occupation_en: string }>;
      check(rows.find((r) => r.anzsco_code === "225113")?.occupation_en === "Marketing Specialist" && rows.find((r) => r.anzsco_code === "225112")?.occupation_en === "Market Research Analyst", `${file}: 225113 Marketing Specialist, 225112 Market Research Analyst`);
    } else if (source.endsWith(".md")) {
      // A table row can wrap over several physical lines: split on the start of the next row.
      const lines = readFileSync(file, "utf8").split(/\r?\n(?=\| )/);
      const row = (code: string) => lines.find((l) => l.startsWith("|") && new RegExp(String.raw`\b${code}\b`).test(l)) ?? "";
      check(row("225113").startsWith("| Marketing Specialist |") && row("225112").startsWith("| Market Research Analyst |"), `${file}: 225113 Marketing Specialist, 225112 Market Research Analyst`);
      check(!/Market Research Analyst[^\n]*\b225113\b/.test(lines.join("\n")), `${file}: no row pairs Market Research Analyst with 225113`);
    } else {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(readFileSync(file));
      let bad = 0, seen = 0;
      for (const name of wb.SheetNames) for (const r of XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1 })) {
        const cells = (r as unknown[]).map((c) => String(c ?? ""));
        if (cells.includes("225113")) { seen++; if (cells.some((c) => /Market Research Analyst/i.test(c))) bad++; }
      }
      check(bad === 0, `${file}: no row pairs 225113 with Market Research Analyst`, `${seen} row(s) for 225113`);
    }
  }

  console.log("\n3. the retired file is the one with the wrong mapping (guard stays meaningful)");
  const stale = readFileSync("public/Skilled list.md", "utf8");
  check(/"occupation":\s*"Market Research Analyst",\s*\n\s*"anzscoCode":\s*"225113"/.test(stale), "the retired 'Skilled list.md' still carries 225113 = Market Research Analyst, which is why it must stay retired");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
