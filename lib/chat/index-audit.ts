import { parseDocumentVersion } from "./document-versions";

/**
 * Classifies every document in the vector index (document_chunks, grouped by metadata.source + metadata.category)
 * against the files on disk (data/knowledge):
 *   current     a file with that name is on disk and it is the latest version of its document;
 *   superseded  on disk, but an older dated version of the same document (a newer one is on disk), or a copy in an
 *               _archive-style folder;
 *   orphaned    no file with that name on disk (deleted or renamed since it was indexed).
 * Superseded and orphaned documents' chunks are what scripts/clean-knowledge-index.ts deletes.
 */

export type IndexedDoc = { source: string; category: string | null; chunks: number };
export type DiskFile = { name: string; category: string };
export type AuditStatus = "current" | "superseded" | "orphaned";
export type AuditRow = IndexedDoc & { status: AuditStatus; reason: string };

const ARCHIVE = new Set(["_archive", "archive", "old", "superseded"]);
const isArchive = (c: string | null | undefined) => ARCHIVE.has((c ?? "").trim().toLowerCase());

export function classifyIndex(indexed: IndexedDoc[], disk: DiskFile[]): AuditRow[] {
  const byName = new Map<string, DiskFile[]>();
  for (const f of disk) byName.set(f.name, [...(byName.get(f.name) ?? []), f]);

  // Latest dated version per document key among the current (non-archive) files on disk.
  const latest = new Map<string, string>();
  for (const f of disk) {
    if (isArchive(f.category)) continue;
    const v = parseDocumentVersion(f.name);
    if (v.date && (!latest.has(v.key) || v.date > latest.get(v.key)!)) latest.set(v.key, v.date);
  }

  return indexed.map((d): AuditRow => {
    const files = byName.get(d.source);
    const v = parseDocumentVersion(d.source);
    const newer = latest.get(v.key);
    if (!files) {
      return { ...d, status: "orphaned", reason: newer && (!v.date || v.date < newer) ? `no file on disk (a newer version, ${newer}, is)` : "no file on disk" };
    }
    if (isArchive(d.category) || files.every((f) => isArchive(f.category))) {
      return { ...d, status: "superseded", reason: "the copy in an archive folder" };
    }
    if (newer && (!v.date || v.date < newer)) {
      return { ...d, status: "superseded", reason: `older version (${v.date ?? "undated"}); latest on disk is ${newer}` };
    }
    return { ...d, status: "current", reason: "on disk, latest version" };
  });
}

export function summarizeAudit(rows: AuditRow[]): Record<AuditStatus, { documents: number; chunks: number }> {
  const out: Record<AuditStatus, { documents: number; chunks: number }> = {
    current: { documents: 0, chunks: 0 },
    superseded: { documents: 0, chunks: 0 },
    orphaned: { documents: 0, chunks: 0 },
  };
  for (const r of rows) {
    out[r.status].documents += 1;
    out[r.status].chunks += r.chunks;
  }
  return out;
}

/** The (source, category) pairs whose chunks the cleaner deletes. */
export const rowsToDelete = (rows: AuditRow[]) => rows.filter((r) => r.status !== "current");
