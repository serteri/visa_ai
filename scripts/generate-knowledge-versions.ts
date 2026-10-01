/**
 * Builds src/data/knowledge-versions.json from data/knowledge (gitignored, so the result is committed): the latest
 * effective date per document and every superseded file (older dated versions, copies in _archive folders), as
 * lib/chat/document-versions.ts reads it at retrieval time. Source files are never moved or deleted.
 *
 *   npx tsx scripts/generate-knowledge-versions.ts           write the manifest and print the superseded pairs
 *   npx tsx scripts/generate-knowledge-versions.ts --check   exit 1 if the committed manifest is stale (SKIPPED without data/knowledge)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseDocumentVersion } from "../lib/chat/document-versions";

const ROOT = path.join(process.cwd(), "data", "knowledge");
const OUT = path.join(process.cwd(), "src", "data", "knowledge-versions.json");

type FileRow = { rel: string; name: string; category: string; key: string; date?: string };

function walk(dir: string, out: FileRow[]) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else {
      const v = parseDocumentVersion(e.name);
      out.push({ rel: path.relative(ROOT, p).replace(/\\/g, "/"), name: e.name, category: path.basename(dir), key: v.key, ...(v.date ? { date: v.date } : {}) });
    }
  }
}

export function buildKnowledgeVersions(files: FileRow[]) {
  const latest: Record<string, string> = {};
  for (const f of files) if (f.date && (!latest[f.key] || f.date > latest[f.key])) latest[f.key] = f.date;
  const archived = (f: FileRow) => ["_archive", "archive", "old", "superseded"].includes(f.category.toLowerCase());
  const supersededFiles = files.filter((f) => archived(f) || (latest[f.key] !== undefined && (!f.date || f.date < latest[f.key])));
  const pairs = supersededFiles.map((f) => {
    const newer = files.find((g) => g !== f && g.key === f.key && !archived(g) && (latest[f.key] ? g.date === latest[f.key] : true));
    return { superseded: f.rel, by: newer?.rel ?? "(no current copy on disk)" };
  });
  return {
    _provenance: { generatedFrom: "data/knowledge", generator: "scripts/generate-knowledge-versions.ts" },
    latest: Object.fromEntries(Object.entries(latest).sort()),
    superseded: [...new Set(supersededFiles.map((f) => f.name))].sort(),
    pairs: pairs.sort((a, b) => a.superseded.localeCompare(b.superseded)),
    /** File name -> path under data/knowledge: the folder tells the publisher (state, assessing authority) for citations. */
    paths: Object.fromEntries(files.map((f) => [f.name, f.rel]).sort((a, b) => a[0].localeCompare(b[0]))),
  };
}

function main() {
  if (!existsSync(ROOT)) {
    console.log("SKIPPED: data/knowledge is not present (gitignored)");
    return;
  }
  const files: FileRow[] = [];
  walk(ROOT, files);
  const json = `${JSON.stringify(buildKnowledgeVersions(files), null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const committed = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== json) {
      console.error("src/data/knowledge-versions.json is stale -- run: npx tsx scripts/generate-knowledge-versions.ts");
      process.exitCode = 1;
    } else console.log("src/data/knowledge-versions.json matches data/knowledge");
    return;
  }
  writeFileSync(OUT, json);
  const data = JSON.parse(json) as { pairs: Array<{ superseded: string; by: string }> };
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${data.pairs.length} superseded file(s)`);
  for (const p of data.pairs) console.log(`  ${p.superseded}\n    -> superseded by ${p.by}`);
}

if (/generate-knowledge-versions\.ts$/.test(process.argv[1] ?? "")) main();
