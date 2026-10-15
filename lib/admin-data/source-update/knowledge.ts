import { chunkText } from "@/lib/chunk-text";

/**
 * The chat knowledge base side of "Update from official source". On approval the source text is indexed for the state and the state's previous
 * source chunks are removed in the SAME transaction, so the chat never mixes old and new (and an embedding failure changes nothing).
 *
 * Which chunks are "the state's previous source chunks" is decided before the review and shown in it: the chunks of earlier approved updates of the
 * state, and the chunks of the state's source documents seeded from data/knowledge (documents whose file name starts with the state's name or code).
 * What the admin saw is what is removed. Authorities' skills-assessment documents and every other document are never matched.
 */

export type KnowledgeDoc = { source: string; category: string; chunks: number };

export const ADMIN_SOURCE_ORIGIN = "admin-source-update";

/** File-name prefixes of a state's source documents in data/knowledge (State Immigrations/<state>/...). */
export const STATE_FILE_PREFIXES: Record<string, string[]> = {
  NSW: ["NSW", "New South Wales"],
  VIC: ["VIC", "Victoria", "Live in Melbourne"],
  QLD: ["QLD", "Queensland"],
  SA: ["SA", "South Australia"],
  WA: ["WA", "Western Australia"],
  TAS: ["TAS", "Tasmania"],
  NT: ["NT", "Northern Territory"],
  ACT: ["ACT", "Australian Capital Territory", "Canberra"],
};

/** A regular expression (Postgres ~* syntax) for the file names of a state's source documents, or null for an unknown state. */
export function stateSourcePattern(stateCode: string): string | null {
  const prefixes = STATE_FILE_PREFIXES[stateCode];
  if (!prefixes) return null;
  return `^(${prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^A-Za-z0-9]|$)`;
}

/** True for the documents the pattern must not match even if the name starts like a state's (assessing authorities, occupation lists). */
export const isProtectedCategory = (category: string) => /skill|assess|occupation/i.test(category);

export interface KnowledgeIndex {
  /** The documents that an approval would remove for this state (read only). */
  preview(stateCode: string): Promise<KnowledgeDoc[]>;
  /** Index the text and remove `remove`, atomically. */
  replace(input: { stateCode: string; stateName: string; sourceUrl: string | null; checkedOn: string; text: string; remove: KnowledgeDoc[] }): Promise<{ removedChunks: number; addedChunks: number; docName: string }>;
}

export const sourceDocName = (stateCode: string, checkedOn: string) => `${stateCode} admin source update ${checkedOn}.txt`;

/** The chunks of an update: a header paragraph (state, URL, date) followed by the text, chunked like every other document. */
export function chunksFor(input: { stateCode: string; stateName: string; sourceUrl: string | null; checkedOn: string; text: string }): Array<{ content: string; metadata: Record<string, string> }> {
  const header = `${input.stateName} (${input.stateCode}) nomination program: official source checked on ${input.checkedOn}${input.sourceUrl ? ` (${input.sourceUrl})` : ""}. This is the current published information for ${input.stateName}.`;
  return chunkText(`${header}\n\n${input.text}`).map((content) => ({
    content,
    metadata: { source: sourceDocName(input.stateCode, input.checkedOn), category: "State Immigrations", state: input.stateCode, origin: ADMIN_SOURCE_ORIGIN, checkedOn: input.checkedOn, ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}) },
  }));
}

/** In-memory index for the tests and the dry run: the chunks it holds, with what a real run would delete. */
export function memoryKnowledgeIndex(initial: Array<{ source: string; category: string; content?: string; state?: string; origin?: string }> = []) {
  const chunks = initial.map((c) => ({ content: "", ...c })) as Array<{ source: string; category: string; content: string; state?: string; origin?: string }>;
  const index: KnowledgeIndex & { chunks: typeof chunks } = {
    chunks,
    async preview(stateCode) {
      const pattern = stateSourcePattern(stateCode);
      const counts = new Map<string, KnowledgeDoc>();
      for (const c of chunks) {
        const mine = (c.state === stateCode && c.origin === ADMIN_SOURCE_ORIGIN) || (pattern !== null && new RegExp(pattern, "i").test(c.source) && !isProtectedCategory(c.category));
        if (!mine) continue;
        const key = `${c.category}|${c.source}`;
        const d = counts.get(key) ?? { source: c.source, category: c.category, chunks: 0 };
        d.chunks++;
        counts.set(key, d);
      }
      return [...counts.values()];
    },
    async replace(input) {
      const add = chunksFor(input);
      if (add.length === 0) throw new Error("There is no text to index.");
      let removed = 0;
      for (let i = chunks.length - 1; i >= 0; i--) {
        if (input.remove.some((d) => d.source === chunks[i].source && d.category === chunks[i].category)) {
          chunks.splice(i, 1);
          removed++;
        }
      }
      for (const c of add) chunks.push({ content: c.content, source: c.metadata.source, category: c.metadata.category, state: input.stateCode, origin: ADMIN_SOURCE_ORIGIN });
      return { removedChunks: removed, addedChunks: add.length, docName: add[0].metadata.source };
    },
  };
  return index;
}

/** The real index: the production vector table. Loaded lazily so importing this module never creates a database client or calls OpenAI. */
export const prismaKnowledgeIndex: KnowledgeIndex = {
  async preview(stateCode) {
    const pattern = stateSourcePattern(stateCode);
    if (!pattern) return [];
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRaw<Array<{ source: string; category: string; chunks: bigint }>>`
      SELECT metadata->>'source' AS source, COALESCE(metadata->>'category', '') AS category, count(*) AS chunks
      FROM document_chunks
      WHERE (metadata->>'state' = ${stateCode} AND metadata->>'origin' = ${ADMIN_SOURCE_ORIGIN})
         OR (metadata->>'source' ~* ${pattern} AND COALESCE(metadata->>'category', '') !~* 'skill|assess|occupation')
      GROUP BY 1, 2
      ORDER BY 1`;
    return rows.map((r) => ({ source: r.source, category: r.category, chunks: Number(r.chunks) }));
  },
  async replace(input) {
    const add = chunksFor(input);
    if (add.length === 0) throw new Error("There is no text to index.");
    // Embed first: if OpenAI fails nothing has changed. Then delete and insert in one transaction.
    const { embedChunks } = await import("@/lib/document-processor");
    const embeddings = await embedChunks(add.map((c) => c.content));
    const { prisma } = await import("@/lib/prisma");
    let removed = 0;
    await prisma.$transaction(async (tx) => {
      for (const d of input.remove) {
        removed += await tx.$executeRaw`DELETE FROM document_chunks WHERE metadata->>'source' = ${d.source} AND COALESCE(metadata->>'category', '') = ${d.category}`;
      }
      for (let i = 0; i < add.length; i++) {
        const vector = `[${embeddings[i].join(",")}]`;
        const content = add[i].content.replace(new RegExp(String.fromCharCode(0), "g"), "");
        const metadata = JSON.stringify(add[i].metadata);
        await tx.$executeRaw`INSERT INTO document_chunks (id, content, metadata, embedding, created_at) VALUES (gen_random_uuid()::text, ${content}, ${metadata}::jsonb, ${vector}::vector, now())`;
      }
    });
    return { removedChunks: removed, addedChunks: add.length, docName: add[0].metadata.source };
  },
};
