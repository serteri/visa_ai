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
      return ref ? `[${ref.id}] (${sourceLabel(ref)})\n${chunk.content}` : `(not citable)\n${chunk.content}`;
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

/** The visa subclass a source document is about ("... (subclass 191).pdf", "Subclass 491 ...", "Student visa_class_500"), if any. */
export function sourceSubclass(source: string): string | undefined {
  return source.match(/subclass(?:es)?[\s_-]*(\d{3})/i)?.[1] ?? source.match(/class[\s_]*(\d{3})/i)?.[1];
}

const MENTION = /(?:subclass|alt sınıf|vize|visa|子类)?\s*\b(189|190|191|482|485|491|500|186|820|801)\b/gi;

/**
 * A claim about subclass N is cited to subclass N's document: when a sentence is about one or more subclasses and a
 * marker in it points at a retrieved document about ANOTHER subclass (a 191 statement tagged with the 189 page), the
 * marker is moved to the retrieved document of the subclass the sentence is about; with none retrieved the marker is
 * dropped rather than left pointing at the wrong document. Sentences about no subclass, and documents that are about
 * no subclass (lists, state documents), are left alone.
 */
export function alignCitationsToSubclass(text: string, refs: SourceRef[]): string {
  const bySubclass = new Map<string, SourceRef>();
  for (const r of refs) {
    const sc = sourceSubclass(r.source);
    if (sc && !bySubclass.has(sc)) bySubclass.set(sc, r);
  }
  const byId = new Map(refs.map((r) => [r.id, r]));
  // Splitting with a capture group keeps the separators, so the text is rebuilt exactly.
  return text
    .split(/((?<=[.!?。！？])\s+|\n+)/)
    .map((piece, i) => {
      if (i % 2 === 1) return piece; // a separator
      const mentioned = [...new Set(Array.from(piece.matchAll(MENTION), (m) => m[1]))];
      if (mentioned.length === 0) return piece;
      return piece.replace(MARKER, (m, id: string) => {
        const ref = byId.get(id);
        const sc = ref ? sourceSubclass(ref.source) : undefined;
        if (!ref || !sc || mentioned.includes(sc)) return m;
        const target = mentioned.map((x) => bySubclass.get(x)).find(Boolean);
        return target ? `[${target.id}]` : "";
      });
    })
    .join("");
}

/** Client-side: [S2] -> "[document, p.4]" from the metadata the server sent; markers not in the catalogue vanish. */
export function renderCitations(text: string, refs: SourceRef[]): string {
  const byId = new Map(refs.map((r) => [r.id, r]));
  return alignCitationsToSubclass(text, refs)
    .replace(MARKER, (_m, id: string) => {
      const ref = byId.get(id);
      return ref ? ` [${sourceLabel(ref)}]` : "";
    })
    .replace(/ {2,}/g, " ");
}

export function catalogRefs(catalog: Array<SourceRef | null>): SourceRef[] {
  return catalog.filter((r): r is SourceRef => r !== null);
}
