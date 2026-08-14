/**
 * One-off seed script: reads every file in data/knowledge, chunks it,
 * embeds each chunk with OpenAI, and writes the results to the
 * DocumentChunk table. Makes real OpenAI API calls and real writes to the
 * production Neon DB -- run deliberately, not as part of CI/build.
 *
 * Usage: npx tsx scripts/seed-knowledge.ts
 */
import { scanKnowledgeFiles, processDocument } from "../lib/document-processor";
import { prisma } from "../lib/prisma";

async function main() {
  const files = await scanKnowledgeFiles();
  console.log(`Found ${files.length} files in data/knowledge.\n`);

  let totalChunks = 0;
  let failedFiles = 0;

  for (const [i, file] of files.entries()) {
    const label = `[${i + 1}/${files.length}] ${file.filename} (${file.category})`;
    try {
      const { chunkCount } = await processDocument(file);
      totalChunks += chunkCount;
      console.log(`${label} -> ${chunkCount} chunks`);
    } catch (err) {
      failedFiles += 1;
      console.error(`${label} -> FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. ${totalChunks} chunks written across ${files.length - failedFiles}/${files.length} files.`);
  if (failedFiles > 0) {
    console.log(`${failedFiles} file(s) failed -- see errors above.`);
  }
}

main()
  .catch((err) => {
    console.error("Seed script crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
