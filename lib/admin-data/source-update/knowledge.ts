import { chunkText } from "@/lib/chunk-text";

/**
 * The chat knowledge base side of "Update from official source". On approval the source text is indexed for the state and the documents the admin ticked
 * are removed in the SAME transaction, so an embedding failure changes nothing.
 *
 * The state's documents (earlier approved updates, and source documents seeded from data/knowledge whose file name starts with the state's name or code)
 * are only LISTED in the review, as candidates. What is removed is exactly what the admin ticked. The only document preselected is one from the SAME
 * source (same URL, or same uploaded file), and occupation-list files are never preselected. Authorities' skills-assessment documents are never listed.
 */

export type KnowledgeDoc = {
  source: string;
  category: string;
  chunks: number;
  /** Where the document came from, when the index recorded it (admin source updates do). */
  sourceUrl?: string | null;
  fileName?: string | null;
};

/** A document the review lists as removable. Nothing is removed unless the admin ticks it; only `preselected` ones start ticked. */
export type KnowledgeCandidate = KnowledgeDoc & { sameSource: boolean; occupationList: boolean; preselected: boolean };

export const docKey = (d: Pick<KnowledgeDoc, "source" | "category">) => `${d.category}|${d.source}`;

const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();

/** Spreadsheet files and anything named or filed as an occupation list: never preselected for removal. */
export const isOccupationListDoc = (d: Pick<KnowledgeDoc, "source" | "category">) => /\.(xlsx|xls|csv)$/i.test(d.source) || /occupation/i.test(d.source) || /occupation/i.test(d.category);

/**
 * Which listed documents come from THIS source: the same URL (recorded on documents created by an earlier admin update of that URL) or the same uploaded file.
 * State-name prefixes only decide what is LISTED, never what is removed.
 */
export function classifyCandidates(docs: KnowledgeDoc[], source: { sourceUrl: string | null; fileName: string | null }): KnowledgeCandidate[] {
  return docs.map((d) => {
    const sameUrl = Boolean(source.sourceUrl && d.sourceUrl && normUrl(d.sourceUrl) === normUrl(source.sourceUrl));
    const sameFile = Boolean(source.fileName && ((d.fileName && d.fileName === source.fileName) || d.source === source.fileName));
    const occupationList = isOccupationListDoc(d);
    const sameSource = sameUrl || sameFile;
    return { ...d, sameSource, occupationList, preselected: sameSource && !occupationList };
  });
}

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
  /** The state's documents that the review lists as candidates for removal (read only). */
  preview(stateCode: string): Promise<KnowledgeDoc[]>;
  /** Index the text and remove `remove` (plus an earlier version of the same new document), atomically. */
  replace(input: { stateCode: string; stateName: string; sourceUrl: string | null; fileName?: string | null; checkedOn: string; text: string; remove: KnowledgeDoc[] }): Promise<{ removedChunks: number; addedChunks: number; docName: string }>;
}

const fnv = (t: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
};

/** One document per source: two pages checked on the same day get different names, so one never overwrites the other. */
export const sourceDocName = (stateCode: string, checkedOn: string, sourceKey?: string | null) =>
  `${stateCode} admin source update ${checkedOn}${sourceKey ? ` ${fnv(sourceKey.trim().toLowerCase())}` : ""}.txt`;

/** The chunks of an update: a header paragraph (state, URL, date) followed by the text, chunked like every other document. */
export function chunksFor(input: { stateCode: string; stateName: string; sourceUrl: string | null; fileName?: string | null; checkedOn: string; text: string }): Array<{ content: string; metadata: Record<string, string> }> {
  const header = `${input.stateName} (${input.stateCode}) nomination program: official source checked on ${input.checkedOn}${input.sourceUrl ? ` (${input.sourceUrl})` : ""}. This is the current published information for ${input.stateName}.`;
  const docName = sourceDocName(input.stateCode, input.checkedOn, input.sourceUrl ?? input.fileName);
  return chunkText(`${header}\n\n${input.text}`).map((content) => ({
    content,
    metadata: {
      source: docName,
      category: "State Immigrations",
      state: input.stateCode,
      origin: ADMIN_SOURCE_ORIGIN,
      checkedOn: input.checkedOn,
      ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
      ...(input.fileName ? { fileName: input.fileName } : {}),
    },
  }));
}

type MemChunk = { source: string; category: string; content: string; state?: string; origin?: string; sourceUrl?: string; fileName?: string };

/** In-memory index for the tests and the dry run: the chunks it holds, with what a real run would delete. */
export function memoryKnowledgeIndex(initial: Array<Omit<MemChunk, "content"> & { content?: string }> = []) {
  const chunks: MemChunk[] = initial.map((c) => ({ content: "", ...c }));
  const index: KnowledgeIndex & { chunks: MemChunk[] } = {
    chunks,
    async preview(stateCode) {
      const pattern = stateSourcePattern(stateCode);
      const counts = new Map<string, KnowledgeDoc>();
      for (const c of chunks) {
        const mine = (c.state === stateCode && c.origin === ADMIN_SOURCE_ORIGIN) || (pattern !== null && new RegExp(pattern, "i").test(c.source) && !isProtectedCategory(c.category));
        if (!mine) continue;
        const key = docKey(c);
        const d = counts.get(key) ?? { source: c.source, category: c.category, chunks: 0, sourceUrl: c.sourceUrl ?? null, fileName: c.fileName ?? null };
        d.chunks++;
        counts.set(key, d);
      }
      return [...counts.values()];
    },
    async replace(input) {
      const add = chunksFor(input);
      if (add.length === 0) throw new Error("There is no text to index.");
      // The new document's own earlier version always goes (re-running the same page replaces it, never duplicates it); nothing else unless listed in `remove`.
      const self = { source: add[0].metadata.source, category: add[0].metadata.category };
      const gone = new Set([...input.remove, self].map(docKey));
      let removed = 0;
      for (let i = chunks.length - 1; i >= 0; i--) {
        if (gone.has(docKey(chunks[i]))) {
          chunks.splice(i, 1);
          removed++;
        }
      }
      for (const c of add) {
        chunks.push({ content: c.content, source: c.metadata.source, category: c.metadata.category, state: input.stateCode, origin: ADMIN_SOURCE_ORIGIN, ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}), ...(input.fileName ? { fileName: input.fileName } : {}) });
      }
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
    const rows = await prisma.$queryRaw<Array<{ source: string; category: string; chunks: bigint; source_url: string | null; file_name: string | null }>>`
      SELECT metadata->>'source' AS source, COALESCE(metadata->>'category', '') AS category, count(*) AS chunks,
             max(metadata->>'sourceUrl') AS source_url, max(metadata->>'fileName') AS file_name
      FROM document_chunks
      WHERE (metadata->>'state' = ${stateCode} AND metadata->>'origin' = ${ADMIN_SOURCE_ORIGIN})
         OR (metadata->>'source' ~* ${pattern} AND COALESCE(metadata->>'category', '') !~* 'skill|assess|occupation')
      GROUP BY 1, 2
      ORDER BY 1`;
    return rows.map((r) => ({ source: r.source, category: r.category, chunks: Number(r.chunks), sourceUrl: r.source_url, fileName: r.file_name }));
  },
  async replace(input) {
    const add = chunksFor(input);
    if (add.length === 0) throw new Error("There is no text to index.");
    // Embed first: if OpenAI fails nothing has changed. Then delete and insert in one transaction.
    const { embedChunks } = await import("@/lib/document-processor");
    const embeddings = await embedChunks(add.map((c) => c.content));
    const { prisma } = await import("@/lib/prisma");
    const self = { source: add[0].metadata.source, category: add[0].metadata.category };
    const gone = new Map([...input.remove, self].map((d) => [docKey(d), d] as const));
    let removed = 0;
    await prisma.$transaction(async (tx) => {
      for (const d of gone.values()) {
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
