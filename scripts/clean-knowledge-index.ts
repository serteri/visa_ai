/**
 * Knowledge-index audit and cleaner.
 *
 *   npx tsx scripts/clean-knowledge-index.ts                        DRY RUN (default): READ-ONLY audit of every indexed
 *                                                                   document + the list of chunks it WOULD delete
 *   npx tsx scripts/clean-knowledge-index.ts --dry-run              same (explicit)
 *   npx tsx scripts/clean-knowledge-index.ts --delete --expect-chunks N
 *                                                                   REAL deletion; N must equal the chunk count the dry run
 *                                                                   printed (a review checksum); needs data/knowledge on disk
 *
 * The audit reads the index through PROD_DATABASE_URL in a READ ONLY transaction (scripts/lib/prod-db.ts).
 * "On disk" means data/knowledge; where that folder is absent (gitignored) the dry run falls back to the committed
 * manifest snapshot (src/data/knowledge-versions.json `paths`) and says so -- the real deletion refuses to run on
 * that fallback. Deletion uses DATABASE_URL (production: a write, run it only after reviewing the dry-run list) and
 * removes the chunks of every SUPERSEDED and ORPHANED document, in one transaction; current documents are never touched.
 *
 * Besides the indexed documents the audit lists the reverse: files on disk that are not indexed. Status "not_indexed" is
 * "on disk, latest version, not indexed" (index them with scripts/seed-knowledge.ts --missing-only); "skipped" files are
 * archive copies, older versions, unsupported types or copies of an indexed document.
 */
import "dotenv/config";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { classifyIndex, findUnindexed, rowsToDelete, summarizeAudit, type DiskFile } from "../lib/chat/index-audit";
import { readIndexedDocs } from "./lib/knowledge-index";

const ROOT = path.join(process.cwd(), "data", "knowledge");

function walk(dir: string, out: DiskFile[]) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), out);
    else out.push({ name: e.name, category: path.basename(dir), path: path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join("/") });
  }
}

async function diskFiles(): Promise<{ files: DiskFile[]; origin: "data/knowledge" | "manifest" }> {
  if (existsSync(ROOT)) {
    const files: DiskFile[] = [];
    walk(ROOT, files);
    return { files, origin: "data/knowledge" };
  }
  const { default: manifest } = await import("../src/data/knowledge-versions.json");
  const paths = (manifest as unknown as { paths: Record<string, string> }).paths;
  return { files: Object.entries(paths).map(([name, rel]) => ({ name, category: rel.split("/").slice(-2, -1)[0] ?? "", path: rel })), origin: "manifest" };
}

async function main() {
  const args = process.argv.slice(2);
  const del = args.includes("--delete");
  if (del && args.includes("--dry-run")) throw new Error("--delete and --dry-run are mutually exclusive.");
  const expectIdx = args.indexOf("--expect-chunks");
  const expected = expectIdx >= 0 ? Number(args[expectIdx + 1]) : NaN;

  const { files, origin } = await diskFiles();
  if (del && origin !== "data/knowledge") throw new Error("Refusing to delete: data/knowledge is not on disk here, so 'orphaned' cannot be trusted. Run where data/knowledge exists.");

  const indexed = await readIndexedDocs();
  const rows = classifyIndex(indexed, files);

  console.log(`Disk listing: ${origin}${origin === "manifest" ? " (committed snapshot -- data/knowledge is not present here; orphan/superseded results are provisional)" : ""}; ${files.length} files`);
  console.log(`Indexed documents: ${rows.length}\n`);
  console.log(["STATUS".padEnd(11), "CHUNKS".padStart(7), "DOCUMENT (category)", "WHY"].join("  "));
  for (const r of [...rows].sort((a, b) => a.status.localeCompare(b.status) || a.source.localeCompare(b.source))) {
    console.log([r.status.padEnd(11), String(r.chunks).padStart(7), `${r.source} (${r.category ?? "-"})`, r.reason].join("  "));
  }
  const sum = summarizeAudit(rows);
  console.log("");
  for (const s of ["current", "superseded", "orphaned"] as const) console.log(`${s.padEnd(11)} ${String(sum[s].documents).padStart(4)} documents, ${String(sum[s].chunks).padStart(7)} chunks`);

  // The other direction: files on disk that no indexed document covers.
  const unindexed = findUnindexed(indexed, files);
  const toIndex = unindexed.filter((r) => r.status === "not_indexed");
  console.log(`\nON DISK, NOT INDEXED: ${unindexed.length} files (${toIndex.length} are the latest version and should be indexed)`);
  console.log(["STATUS".padEnd(11), "LATEST", "FILE (folder)", "WHY"].join("  "));
  for (const r of [...unindexed].sort((a, b) => a.status.localeCompare(b.status) || (a.path ?? a.name).localeCompare(b.path ?? b.name))) {
    console.log([r.status.padEnd(11), (r.latest ? "yes" : "no").padEnd(6), `${r.path ?? r.name} (${r.category || "-"})`, r.reason].join("  "));
  }
  if (toIndex.length > 0) console.log(`Index them (dry run first): npx dotenv-cli -e .env.local -- tsx scripts/seed-knowledge.ts --missing-only`);

  const victims = rowsToDelete(rows);
  const total = victims.reduce((n, r) => n + r.chunks, 0);
  console.log(`\n${del ? "DELETING" : "DRY RUN -- would delete"} ${total} chunks of ${victims.length} superseded / orphaned documents:`);
  for (const r of victims) console.log(`  - [${r.status}] ${r.source} (${r.category ?? "-"}): ${r.chunks} chunks`);

  if (!del) {
    console.log(`\nNothing was changed. To delete after review: npx tsx scripts/clean-knowledge-index.ts --delete --expect-chunks ${total}`);
    return;
  }
  if (!Number.isInteger(expected) || expected !== total) throw new Error(`--expect-chunks must equal ${total} (the reviewed count); got ${Number.isNaN(expected) ? "nothing" : expected}.`);

  const db = new PrismaClient();
  try {
    const deleted = await db.$transaction(async (tx) => {
      let n = 0;
      for (const r of victims) {
        n += await tx.$executeRaw`DELETE FROM document_chunks WHERE metadata->>'source' = ${r.source} AND COALESCE(metadata->>'category', '') = ${r.category ?? ""}`;
      }
      if (n !== total) throw new Error(`Deleted ${n} chunks but expected ${total}; rolled back.`);
      return n;
    });
    console.log(`\nDeleted ${deleted} chunks.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
