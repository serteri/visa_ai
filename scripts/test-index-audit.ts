/**
 * Knowledge-index audit, "on disk but not indexed" direction (lib/chat/index-audit.ts findUnindexed): which files the
 * ingester (scripts/seed-knowledge.ts --missing-only) would index and which it leaves out. Pure functions, no database.
 *
 *   npx tsx scripts/test-index-audit.ts
 */
import { classifyIndex, findUnindexed, INDEXABLE_EXTENSIONS, type DiskFile, type IndexedDoc } from "../lib/chat/index-audit";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

const d = (name: string, category: string): DiskFile => ({ name, category, path: `${category}/${name}` });
const ix = (source: string, category = "x"): IndexedDoc => ({ source, category, chunks: 5 });

const disk: DiskFile[] = [
  d("Subclass 820 Partner visa (temporary)_26April2026.pdf", "Subclass 820"),
  d("Subclass 820 Partner visa (temporary)_23September2026.pdf", "Subclass 820"),
  d("Subclass 820 Partner visa (temporary)_01July2026.pdf", "Subclass 820"),
  d("Engineers.pdf", "_archive"),
  d("Engineers (1).pdf", "Engineers"),
  d("Trades.pdf", "Trades"),
  d("Trades (1).pdf", "Trades"),
  d("Skilled list.md", "general"),
  d("Skilled list.xlsx", "general"),
  d("Upper.PDF", "Misc"),
  d("chart.png", "Misc"),
  d("data.csv", "Misc"),
  d("Already.pdf", "Misc"),
];
const rows = findUnindexed([ix("Trades.pdf"), ix("Skilled list.md"), ix("Already.pdf"), ix("Subclass 820 Partner visa (temporary)_26April2026.pdf")], disk);
const row = (name: string) => rows.find((r) => r.name === name);
const toIndex = rows.filter((r) => r.status === "not_indexed").map((r) => r.name).sort();

console.log("findUnindexed");
t("an indexed name is not listed", !row("Already.pdf") && !row("Trades.pdf"));
t("the latest dated version is not_indexed and flagged latest", row("Subclass 820 Partner visa (temporary)_23September2026.pdf")?.status === "not_indexed" && row("Subclass 820 Partner visa (temporary)_23September2026.pdf")?.latest === true);
t("an older dated version is skipped and not latest", row("Subclass 820 Partner visa (temporary)_01July2026.pdf")?.status === "skipped" && row("Subclass 820 Partner visa (temporary)_01July2026.pdf")?.latest === false);
t("an _archive copy is skipped", row("Engineers.pdf")?.status === "skipped" && /archive/.test(row("Engineers.pdf")!.reason));
t("a '(1)' copy is indexed when no indexed copy exists", row("Engineers (1).pdf")?.status === "not_indexed");
t("a '(1)' copy of an already-indexed document is skipped, not duplicated", row("Trades (1).pdf")?.status === "skipped" && /Trades\.pdf/.test(row("Trades (1).pdf")!.reason));
t("same document name in another format is a different document", row("Skilled list.xlsx")?.status === "not_indexed");
t("png / csv are skipped as unsupported", row("chart.png")?.status === "skipped" && row("data.csv")?.status === "skipped" && /unsupported/.test(row("chart.png")!.reason));
t("an upper-case .PDF extension is indexable", row("Upper.PDF")?.status === "not_indexed");
t("exactly the expected files would be indexed", JSON.stringify(toIndex) === JSON.stringify(["Engineers (1).pdf", "Skilled list.xlsx", "Subclass 820 Partner visa (temporary)_23September2026.pdf", "Upper.PDF"]), JSON.stringify(toIndex));

const twins = findUnindexed([], [d("A.pdf", "p1"), d("A (1).pdf", "p2")]);
t("of two unindexed copies of one document only the first is indexed", twins.filter((r) => r.status === "not_indexed").length === 1 && twins.find((r) => r.name === "A.pdf")?.status === "not_indexed");

const afterClean = findUnindexed([ix("Subclass 820 Partner visa (temporary)_01July2026.pdf")], disk);
t("an indexed older version does not hide the newer file", afterClean.find((r) => r.name === "Subclass 820 Partner visa (temporary)_23September2026.pdf")?.status === "not_indexed");

console.log("consistency with classifyIndex");
const all = [ix("Trades.pdf"), ix("Skilled list.md")];
const ind = classifyIndex(all, disk);
t("indexed + unindexed account for every file on disk", ind.length + findUnindexed(all, disk).length === disk.length);
t("the ingester supports exactly the audit's indexable types", [".pdf", ".xlsx", ".md", ".json"].every((e) => INDEXABLE_EXTENSIONS.has(e)) && INDEXABLE_EXTENSIONS.size === 4);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
