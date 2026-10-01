import { citationLabel, humanSourceName } from "./source-names";
import type { RetrievedChunk, SourceRef } from "./types";

/**
 * Citations are never written by the model. Each retrieved chunk that has usable metadata gets an id (S1, S2, ...);
 * the model may only place that id after a claim, and the document / page shown to the reader are looked up from
 * the retrieval metadata here. An id that is not in the catalogue is dropped, so a citation cannot point at a
 * document or page that was not retrieved for that message.
 */

function usableSource(metadata: unknown): { source: string; title: string; page?: number } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const source = typeof m.source === "string" ? m.source.trim() : "";
  if (!source) return null;
  const page = typeof m.page === "number" && Number.isInteger(m.page) && m.page > 0 ? m.page : undefined;
  const category = typeof m.category === "string" ? m.category : undefined;
  return { source, title: humanSourceName(source, category), ...(page !== undefined ? { page } : {}) };
}

/** Ids in retrieval order; chunks without a source in their metadata get no id (they cannot be cited). */
export function buildSourceCatalog(chunks: RetrievedChunk[]): Array<SourceRef | null> {
  let n = 0;
  return chunks.map((chunk) => {
    const s = usableSource(chunk.metadata);
    return s ? { id: `S${++n}`, ...s } : null;
  });
}

/** "Home Affairs – Subclass 491, p. 1": the publisher and document, never the file name. */
export function sourceLabel(ref: SourceRef): string {
  return citationLabel(ref);
}

/** The chunks as the premium prompt shows them: id + document/page header, or an explicit "not citable" header. */
export function formatPremiumReferences(chunks: RetrievedChunk[], catalog: Array<SourceRef | null>): string {
  if (chunks.length === 0) return "No matching reference material was found for this question.";
  return chunks
    .map((chunk, i) => {
      const ref = catalog[i];
      return ref ? `[${ref.id}] (${sourceLabel(ref)})\n${chunk.content}` : `[no citable source]\n${chunk.content}`;
    })
    .join("\n\n");
}

const MARKER = /\[(S\d+)\]/g;

export function extractCitationIds(text: string): string[] {
  return Array.from(text.matchAll(MARKER), (m) => m[1]);
}

export function validateCitations(text: string, refs: SourceRef[]): { valid: string[]; invalid: string[] } {
  const known = new Set(refs.map((r) => r.id));
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const id of new Set(extractCitationIds(text))) (known.has(id) ? valid : invalid).push(id);
  return { valid, invalid };
}

/** Client-side: [S2] -> "[document, p.4]" from the metadata the server sent; markers not in the catalogue vanish. */
export function renderCitations(text: string, refs: SourceRef[]): string {
  const byId = new Map(refs.map((r) => [r.id, r]));
  return text
    .replace(MARKER, (_m, id: string) => {
      const ref = byId.get(id);
      return ref ? ` [${sourceLabel(ref)}]` : "";
    })
    .replace(/ {2,}/g, " ");
}

export function catalogRefs(catalog: Array<SourceRef | null>): SourceRef[] {
  return catalog.filter((r): r is SourceRef => r !== null);
}
