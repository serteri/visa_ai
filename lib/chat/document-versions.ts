import versions from "@/src/data/knowledge-versions.json";

/**
 * Superseded knowledge-base documents. The same official document is kept under several dated file names
 * ("..._26April2026.pdf", "..._23September2026.pdf", "..._23_09_2026.pdf") and older copies sit in "_archive"
 * folders. Only the LATEST version of a document may be retrieved or cited: an older one can carry superseded fees
 * or rules (e.g. the April 2026 subclass 491 document).
 *
 * The vector index (document_chunks) holds the bare file name (metadata.source) and its parent folder
 * (metadata.category), not the path, so versions are matched by a document key: the file name without its extension
 * and date suffix. The latest date per key comes from src/data/knowledge-versions.json, generated from data/knowledge
 * by scripts/generate-knowledge-versions.ts -- an indexed version that is no longer on disk (deleted or renamed)
 * is still recognised as older when a newer dated version of the same key exists.
 */

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export type DocumentVersion = { key: string; date?: string };

/** "Subclass 820 Partner visa (temporary)_23September2026.pdf" -> { key: "subclass 820 partner visa (temporary)", date: "2026-09-23" }. */
export function parseDocumentVersion(filename: string): DocumentVersion {
  let base = filename.replace(/\.[A-Za-z0-9]{2,5}$/, "").trim();
  let date: string | undefined;
  // _23September2026 / _23 September 2026 / _01July2026
  const named = base.match(/[\s_-]+(\d{1,2})[\s_-]?([A-Za-z]{3,9})[\s_-]?(\d{4})$/);
  // _23_09_2026 / _23-09-2026
  const numeric = base.match(/[\s_-]+(\d{1,2})[_-](\d{1,2})[_-](\d{4})$/);
  if (named && MONTHS[named[2].toLowerCase()]) {
    date = iso(Number(named[3]), MONTHS[named[2].toLowerCase()], Number(named[1]));
    base = base.slice(0, named.index);
  } else if (numeric) {
    date = iso(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
    base = base.slice(0, numeric.index);
  }
  // A duplicate-download marker (" (1)") is not part of the document's identity.
  base = base.replace(/\s*\(\d+\)$/, "");
  const key = base.replace(/[_\s]+/g, " ").trim().toLowerCase();
  return { key, ...(date ? { date } : {}) };
}

type Manifest = {
  /** Latest effective date per document key (only keys with a dated version). */
  latest: Record<string, string>;
  /** File names that are superseded on disk (an older dated version, or a copy in an _archive folder). */
  superseded: string[];
};
const MANIFEST = versions as unknown as Manifest;

/** Folder names that hold retired copies. */
const ARCHIVE_CATEGORIES = new Set(["_archive", "archive", "old", "superseded"]);

export function isSupersededSource(source: string, category?: string, manifest: Manifest = MANIFEST): boolean {
  if (category && ARCHIVE_CATEGORIES.has(category.trim().toLowerCase())) return true;
  if (manifest.superseded.includes(source)) return true;
  const v = parseDocumentVersion(source);
  const latest = manifest.latest[v.key];
  // A newer dated version exists: this one is older (dated earlier) or undated.
  return Boolean(latest && (!v.date || v.date < latest));
}

/**
 * Drops chunks of superseded documents; also, among the chunks themselves, keeps only the newest dated version of
 * each document (covers a version indexed after the manifest was generated).
 */
export function dropSupersededChunks<T extends { metadata: unknown }>(chunks: T[], manifest: Manifest = MANIFEST): T[] {
  const meta = (c: T) => (c.metadata && typeof c.metadata === "object" ? (c.metadata as Record<string, unknown>) : {});
  const src = (c: T) => (typeof meta(c).source === "string" ? (meta(c).source as string) : "");
  const cat = (c: T) => (typeof meta(c).category === "string" ? (meta(c).category as string) : undefined);
  const newestInBatch = new Map<string, string>();
  for (const c of chunks) {
    const v = parseDocumentVersion(src(c));
    if (v.date && (!newestInBatch.has(v.key) || v.date > newestInBatch.get(v.key)!)) newestInBatch.set(v.key, v.date);
  }
  return chunks.filter((c) => {
    const s = src(c);
    if (!s) return true;
    if (isSupersededSource(s, cat(c), manifest)) return false;
    const v = parseDocumentVersion(s);
    const newest = newestInBatch.get(v.key);
    return !(newest && (!v.date || v.date < newest));
  });
}

export const KNOWLEDGE_VERSIONS = MANIFEST;
