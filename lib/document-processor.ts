import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".xlsx", ".md", ".json"]);
const EMBEDDING_MODEL_ID = "text-embedding-3-small";
// OpenAI batches embedding requests; keep well under its input-array limit.
const EMBEDDING_BATCH_SIZE = 100;

export interface KnowledgeFile {
  absolutePath: string;
  filename: string;
  /** Immediate parent folder name relative to data/knowledge, or "general" for root-level files. */
  category: string;
  ext: string;
}

/** One unit of extracted text plus whatever locates it within the source file (page, sheet, ...). */
export interface TextSegment {
  text: string;
  page?: number;
  sheet?: string;
}

export interface DocumentChunkInput {
  content: string;
  metadata: Prisma.InputJsonValue;
}

/**
 * Recursively scans data/knowledge for .pdf/.xlsx/.md/.json files. Files
 * directly in data/knowledge get category "general"; files in a subfolder
 * (at any depth) get category = that subfolder's own name, e.g.
 * data/knowledge/visas/subclass-189.pdf -> category "visas".
 */
export async function scanKnowledgeFiles(dir: string = KNOWLEDGE_DIR): Promise<KnowledgeFile[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const files: KnowledgeFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await scanKnowledgeFiles(absolutePath)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const parentDir = path.dirname(absolutePath);
    const category = parentDir === KNOWLEDGE_DIR ? "general" : path.basename(parentDir);

    files.push({ absolutePath, filename: entry.name, category, ext });
  }

  return files;
}

async function extractPdfSegments(absolutePath: string): Promise<TextSegment[]> {
  const buffer = await readFile(absolutePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({ text: page.text, page: page.num }));
  } finally {
    await parser.destroy();
  }
}

async function extractMarkdownSegments(absolutePath: string): Promise<TextSegment[]> {
  const text = await readFile(absolutePath, "utf-8");
  return [{ text }];
}

async function extractJsonSegments(absolutePath: string): Promise<TextSegment[]> {
  const raw = await readFile(absolutePath, "utf-8");
  try {
    // Re-serialize (compact) so the embedded text isn't dominated by
    // formatting whitespace -- semantics matter for search, not indentation.
    const parsed = JSON.parse(raw);
    return [{ text: JSON.stringify(parsed) }];
  } catch {
    return [{ text: raw }];
  }
}

async function extractXlsxSegments(absolutePath: string): Promise<TextSegment[]> {
  const workbook = XLSX.readFile(absolutePath);
  return workbook.SheetNames.map((sheetName) => ({
    text: XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]),
    sheet: sheetName,
  })).filter((segment) => segment.text.trim().length > 0);
}

/** Dispatches to the right parser for a file's extension. */
export async function extractTextSegments(file: KnowledgeFile): Promise<TextSegment[]> {
  switch (file.ext) {
    case ".pdf":
      return extractPdfSegments(file.absolutePath);
    case ".md":
      return extractMarkdownSegments(file.absolutePath);
    case ".json":
      return extractJsonSegments(file.absolutePath);
    case ".xlsx":
      return extractXlsxSegments(file.absolutePath);
    default:
      throw new Error(`Unsupported file extension: ${file.ext}`);
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
    // Postgres text/jsonb columns reject the NUL byte outright (error 22021);
    // pdf-parse occasionally emits one from malformed embedded PDF content.
    const sanitizedContent = content.replace(new RegExp(String.fromCharCode(0), "g"), "");

    await prisma.$executeRaw`
      INSERT INTO document_chunks (id, content, metadata, embedding, created_at)
      VALUES (
        gen_random_uuid()::text,
        ${sanitizedContent},
        ${metadata}::jsonb,
        ${vectorLiteral}::vector,
        now()
      )
    `;
  }
}

/**
 * End-to-end pipeline for one knowledge-base file: extract -> chunk ->
 * embed -> store. Every chunk's metadata carries filename + category (plus
 * page/sheet when applicable) so retrieval-time citations can point back to
 * where the text came from.
 */
export async function processDocument(file: KnowledgeFile): Promise<{ chunkCount: number }> {
  const segments = await extractTextSegments(file);

  const chunkInputs: DocumentChunkInput[] = segments.flatMap((segment) =>
    chunkText(segment.text).map((content) => ({
      content,
      metadata: {
        source: file.filename,
        category: file.category,
        ...(segment.page !== undefined ? { page: segment.page } : {}),
        ...(segment.sheet !== undefined ? { sheet: segment.sheet } : {}),
      },
    })),
  );

  if (chunkInputs.length === 0) return { chunkCount: 0 };

  const embeddings = await embedChunks(chunkInputs.map((c) => c.content));
  await saveDocumentChunks(chunkInputs, embeddings);

  return { chunkCount: chunkInputs.length };
}

/**
 * Scans data/knowledge and processes every supported file found. Returns
 * a per-file chunk count summary for logging/inspection by the caller.
 */
export async function processAllKnowledgeFiles(): Promise<
  Array<{ filename: string; category: string; chunkCount: number }>
> {
  const files = await scanKnowledgeFiles();
  const results: Array<{ filename: string; category: string; chunkCount: number }> = [];

  for (const file of files) {
    const { chunkCount } = await processDocument(file);
    results.push({ filename: file.filename, category: file.category, chunkCount });
  }

  return results;
}
