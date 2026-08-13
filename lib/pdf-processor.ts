import path from "node:path";
import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const PDF_DIR = path.join(process.cwd(), "data", "pdfs");
const EMBEDDING_MODEL_ID = "text-embedding-3-small";
// OpenAI batches embedding requests; keep well under its input-array limit.
const EMBEDDING_BATCH_SIZE = 100;

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface DocumentChunkInput {
  content: string;
  metadata: Prisma.InputJsonValue;
}

/**
 * Reads and extracts text from a PDF in data/pdfs by filename (not a full
 * path — callers must not pass path segments from user input).
 */
export async function extractPdfText(filename: string): Promise<PdfPage[]> {
  const filePath = path.join(PDF_DIR, filename);
  const buffer = await readFile(filePath);

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({ pageNumber: page.num, text: page.text }));
  } finally {
    await parser.destroy();
  }
}

/**
 * Splits text into ~500-1000 character chunks, breaking on paragraph
 * boundaries where possible so chunks stay semantically coherent instead of
 * cutting mid-sentence. Falls back to a hard split for paragraphs longer
 * than maxChars on their own.
 */
export function chunkText(text: string, minChars = 500, maxChars = 1000): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim().length > 0) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      for (let i = 0; i < paragraph.length; i += maxChars) {
        chunks.push(paragraph.slice(i, i + maxChars).trim());
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current.length >= minChars) {
      flush();
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  flush();

  return chunks;
}

/**
 * Embeds text chunks with OpenAI's text-embedding-3-small model, batching
 * requests to stay under the provider's per-call input limit. Returns
 * embeddings in the same order as the input chunks.
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const model = openai.textEmbeddingModel(EMBEDDING_MODEL_ID);
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const { embeddings: batchEmbeddings } = await model.doEmbed({ values: batch });
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Persists chunks + their embeddings to DocumentChunk. Uses $executeRaw
 * because Prisma Client has no native vector type -- `embedding` is
 * Unsupported("vector(1536)") in schema.prisma, so the pgvector column can
 * only be written via raw SQL with a `'[...]'::vector` literal.
 */
export async function saveDocumentChunks(
  chunks: DocumentChunkInput[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("chunks and embeddings must be the same length");
  }

  for (let i = 0; i < chunks.length; i++) {
    const { content, metadata } = chunks[i];
    const vectorLiteral = `[${embeddings[i].join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO document_chunks (id, content, metadata, embedding, created_at)
      VALUES (
        gen_random_uuid()::text,
        ${content},
        ${metadata}::jsonb,
        ${vectorLiteral}::vector,
        now()
      )
    `;
  }
}

/**
 * End-to-end pipeline for one PDF: extract -> chunk -> embed -> store.
 * Metadata on each chunk records the source filename and page number so
 * retrieval-time citations can point back to where the text came from.
 */
export async function processPdf(filename: string): Promise<{ chunkCount: number }> {
  const pages = await extractPdfText(filename);

  const chunkInputs: DocumentChunkInput[] = pages.flatMap((page) =>
    chunkText(page.text).map((content) => ({
      content,
      metadata: { source: filename, page: page.pageNumber },
    })),
  );

  if (chunkInputs.length === 0) return { chunkCount: 0 };

  const embeddings = await embedChunks(chunkInputs.map((c) => c.content));
  await saveDocumentChunks(chunkInputs, embeddings);

  return { chunkCount: chunkInputs.length };
}
