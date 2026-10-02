/**
 * Seeds the vector index (document_chunks) from data/knowledge: reads a file, chunks it, embeds each chunk with OpenAI
 * and writes the chunks. Real OpenAI calls and real writes to the production Neon DB (DATABASE_URL) -- run deliberately,
 * with explicit go-ahead, not as part of CI/build.
 *
 * It never re-indexes a document that is already in the index (that would duplicate its chunks): which documents are
 * indexed is read first, through PROD_DATABASE_URL in a READ ONLY transaction (scripts/lib/prod-db.ts), and a file whose
 * name is in the index is skipped. Archive copies, older dated versions, unsupported file types and copies of an indexed
 * document are skipped too (lib/chat/index-audit.ts findUnindexed). Chunking, embedding model and metadata are the ones
 * of every existing chunk (lib/document-processor.ts).
 *
 *   npx dotenv-cli -e .env.local -- tsx scripts/seed-knowledge.ts --missing-only
 *       DRY RUN (default): lists the files that would be indexed and their exact chunk count. No OpenAI call, no write.
 *   npx dotenv-cli -e .env.local -- tsx scripts/seed-knowledge.ts --files "<name>[,<name>...]"
 *       the same, limited to these files (file name or path under data/knowledge; repeat --files or comma-separate).
 *       A named file that is already indexed, an archive copy or an older version is reported and skipped.
 *   npx dotenv-cli -e .env.local -- tsx scripts/seed-knowledge.ts --missing-only --execute --expect-chunks N
 *       REAL indexing; N must equal the chunk count the dry run printed (a review checksum).
 *   --all   index every file (the original behaviour); only allowed while the index is empty.
 */
import { findUnindexed, type DiskFile, type UnindexedRow } from "../lib/chat/index-audit";
import { buildChunkInputs, embedChunks, saveDocumentChunks, scanKnowledgeFiles, type DocumentChunkInput, type KnowledgeFile } from "../lib/document-processor";
import { prisma } from "../lib/prisma";
import { readIndexedDocs } from "./lib/knowledge-index";

const SCRIPT = "npx dotenv-cli -e .env.local -- tsx scripts/seed-knowledge.ts";

function flagValues(args: string[], flag: string): string[] {
  const out: string[] = [];
  args.forEach((a, i) => {
    if (a === flag && args[i + 1]) out.push(...args[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
  });
  return out;
}

type Selection = { selected: KnowledgeFile[]; notes: string[] };

function select(mode: "missing" | "files" | "all", requested: string[], files: KnowledgeFile[], rows: UnindexedRow[], indexedCount: number): Selection {
  const notes: string[] = [];
  const rowFor = (f: KnowledgeFile) => rows.find((r) => r.path === f.relativePath);

  if (mode === "all") {
    if (indexedCount > 0) throw new Error(`--all refused: ${indexedCount} documents are already indexed and it would duplicate them. Use --missing-only.`);
    return { selected: files, notes };
  }

  let wanted: KnowledgeFile[];
  if (mode === "missing") wanted = files;
  else {
    wanted = [];
    for (const r of requested) {
      const hits = files.filter((f) => f.relativePath === r || f.filename === r);
      if (hits.length === 0) throw new Error(`Not found in data/knowledge: ${r}`);
      wanted.push(...hits);
    }
  }

  const selected: KnowledgeFile[] = [];
  for (const f of wanted) {
    const row = rowFor(f);
    if (row?.status === "not_indexed") selected.push(f);
    else if (mode === "files") notes.push(`skipped ${f.relativePath}: ${row ? row.reason : "already indexed"}`);
  }
  return { selected, notes };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  if (execute && args.includes("--dry-run")) throw new Error("--execute and --dry-run are mutually exclusive.");
  const requested = flagValues(args, "--files");
  const modes = [args.includes("--missing-only") && "missing", requested.length > 0 && "files", args.includes("--all") && "all"].filter(Boolean) as ("missing" | "files" | "all")[];
  if (modes.length !== 1) {
    throw new Error(`Pick exactly one of --missing-only, --files <names>, --all. Dry run first:\n  ${SCRIPT} --missing-only`);
  }
  const mode = modes[0];
  const expectIdx = args.indexOf("--expect-chunks");
  const expected = expectIdx >= 0 ? Number(args[expectIdx + 1]) : NaN;

  const files = await scanKnowledgeFiles();
  if (files.length === 0) throw new Error("No files found in data/knowledge (is the folder present here?).");
  const disk: DiskFile[] = files.map((f) => ({ name: f.filename, category: f.category, path: f.relativePath }));
  const indexed = await readIndexedDocs();
  const rows = findUnindexed(indexed, disk);
  const { selected, notes } = select(mode, requested, files, rows, indexed.length);

  console.log(`data/knowledge: ${files.length} supported files; index: ${indexed.length} documents.`);
  for (const n of notes) console.log(`  ${n}`);

  // Exact chunks (extract + chunk only); embeddings are made only on --execute.
  const built: { file: KnowledgeFile; chunks: DocumentChunkInput[] }[] = [];
  let failed = 0;
  console.log(`\n${execute ? "INDEXING" : "DRY RUN -- would index"} ${selected.length} files:`);
  for (const file of selected) {
    try {
      const chunks = await buildChunkInputs(file);
      built.push({ file, chunks });
      const chars = chunks.reduce((n, c) => n + c.content.length, 0);
      console.log(`  ${String(chunks.length).padStart(5)} chunks  ${String(chars).padStart(8)} chars  ${file.relativePath} (${file.category})${chunks.length === 0 ? "  <- no text extracted, nothing will be written" : ""}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAILED to read ${file.relativePath}: ${err instanceof Error ? err.message : err}`);
    }
  }
  const total = built.reduce((n, b) => n + b.chunks.length, 0);
  console.log(`\n${built.length} files, ${total} chunks${failed ? `, ${failed} unreadable` : ""}.`);

  if (!execute) {
    console.log(`\nNothing was changed. To index after review:\n  ${SCRIPT} ${args.filter((a) => a !== "--dry-run").map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")} --execute --expect-chunks ${total}`);
    if (failed) process.exitCode = 1;
    return;
  }
  if (failed) throw new Error(`${failed} file(s) could not be read; fix or exclude them before indexing.`);
  if (!Number.isInteger(expected) || expected !== total) throw new Error(`--expect-chunks must equal ${total} (the reviewed count); got ${Number.isNaN(expected) ? "nothing" : expected}.`);

  let written = 0;
  let writeFailures = 0;
  for (const [i, { file, chunks }] of built.entries()) {
    const label = `[${i + 1}/${built.length}] ${file.relativePath}`;
    if (chunks.length === 0) {
      console.log(`${label} -> 0 chunks (skipped)`);
      continue;
    }
    try {
      const embeddings = await embedChunks(chunks.map((c) => c.content));
      await saveDocumentChunks(chunks, embeddings);
      written += chunks.length;
      console.log(`${label} -> ${chunks.length} chunks`);
    } catch (err) {
      writeFailures += 1;
      console.error(`${label} -> FAILED: ${err instanceof Error ? err.message : err}`);
      // The document was not in the index before this run, so any chunks it left are partial: remove them, otherwise
      // the next --missing-only run would see it as indexed and skip it.
      const removed = await prisma.$executeRaw`DELETE FROM document_chunks WHERE metadata->>'source' = ${file.filename} AND COALESCE(metadata->>'category', '') = ${file.category}`;
      if (removed > 0) console.error(`   removed ${removed} partial chunks of ${file.filename}`);
    }
  }
  console.log(`\nDone. ${written} chunks written across ${built.length - writeFailures}/${built.length} files.`);
  if (writeFailures > 0) {
    console.log(`${writeFailures} file(s) failed -- see errors above; re-run --missing-only to retry them.`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
