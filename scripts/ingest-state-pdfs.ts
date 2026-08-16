/**
 * RAG ingestion pipeline (pipeline 1 of 2) for data/knowledge/State
 * Immigrations: chunks + embeds every .pdf under that folder into
 * DocumentChunk (pgvector), the same store the AI assistant
 * (app/api/knowledge-chat/route.ts) retrieves from.
 *
 * Deliberately PDF-only. .xlsx/.csv files in the same folder are exact
 * occupation-list data (yes/no membership, ANZSCO codes) -- those go
 * through scripts/sync-state-occupation-lists.ts into
 * StateOccupationListEntry instead, a direct DB lookup, not a vector
 * similarity match. Answering "is my occupation on the NSW 190 list" from
 * embedded spreadsheet text invites exactly the kind of hallucination this
 * split is meant to avoid -- see that script's own header comment.
 *
 * Not idempotent (same caveat as scripts/seed-knowledge.ts): re-running
 * this inserts duplicate rows for files it has already processed. Clear
 * existing rows for a source file first (see scripts/seed-single-file.ts
 * for the pattern) before re-ingesting it.
 *
 * Usage: npx tsx scripts/ingest-state-pdfs.ts
 */
import path from "node:path";
import { scanKnowledgeFiles, processDocument } from "../lib/document-processor";
import { prisma } from "../lib/prisma";

const STATE_IMMIGRATIONS_DIR = path.join(process.cwd(), "data", "knowledge", "State Immigrations");

async function main() {
  const allFiles = await scanKnowledgeFiles(STATE_IMMIGRATIONS_DIR);
  const pdfFiles = allFiles.filter((f) => f.ext === ".pdf");

  console.log(`Found ${pdfFiles.length} PDF(s) under "State Immigrations" (${allFiles.length} total files, rest are xlsx/csv -- see sync-state-occupation-lists.ts for those).\n`);

  let totalChunks = 0;
  let failedFiles = 0;

  for (const [i, file] of pdfFiles.entries()) {
    const label = `[${i + 1}/${pdfFiles.length}] ${file.filename} (${file.category})`;
    try {
      const { chunkCount } = await processDocument(file);
      totalChunks += chunkCount;
      console.log(`${label} -> ${chunkCount} chunks`);
    } catch (err) {
      failedFiles += 1;
      console.error(`${label} -> FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. ${totalChunks} chunks written across ${pdfFiles.length - failedFiles}/${pdfFiles.length} PDFs.`);
  if (failedFiles > 0) {
    console.log(`${failedFiles} file(s) failed -- see errors above.`);
  }
}

main()
  .catch((err) => {
    console.error("Ingest script crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
