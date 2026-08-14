/**
 * One-off re-seed of a single file that failed during the main
 * scripts/seed-knowledge.ts run (null-byte encoding error, now fixed in
 * saveDocumentChunks). Usage: npx tsx scripts/seed-single-file.ts <filename>
 */
import { scanKnowledgeFiles, processDocument } from "../lib/document-processor";
import { prisma } from "../lib/prisma";

async function main() {
  const targetFilename = process.argv[2];
  if (!targetFilename) {
    console.error("Usage: npx tsx scripts/seed-single-file.ts <filename>");
    process.exitCode = 1;
    return;
  }

  const files = await scanKnowledgeFiles();
  const file = files.find((f) => f.filename === targetFilename);
  if (!file) {
    console.error(`File not found in data/knowledge: ${targetFilename}`);
    process.exitCode = 1;
    return;
  }

  const { chunkCount } = await processDocument(file);
  console.log(`${file.filename} (${file.category}) -> ${chunkCount} chunks`);
}

main()
  .catch((err) => {
    console.error("Script crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
