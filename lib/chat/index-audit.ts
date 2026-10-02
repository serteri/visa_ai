import { parseDocumentVersion } from "./document-versions";

/**
 * Classifies every document in the vector index (document_chunks, grouped by metadata.source + metadata.category)
 * against the files on disk (data/knowledge):
 *   current     a file with that name is on disk and it is the latest version of its document;
 *   superseded  on disk, but an older dated version of the same document (a newer one is on disk), or a copy in an
 *               _archive-style folder;
 *   orphaned    no file with that name on disk (deleted or renamed since it was indexed).
 * Superseded and orphaned documents' chunks are what scripts/clean-knowledge-index.ts deletes.
 *
 * The reverse direction, findUnindexed(), lists the files on disk that have no document in the index:
 *   not_indexed  the latest version of its document, an indexable type, not in an archive folder: it should be indexed
 *                (scripts/seed-knowledge.ts --missing-only);
 *   skipped      deliberately left out: an archive copy, an older dated version, an unsupported file type, or a copy of a
 *                document that is already indexed under another name.
 */

export type IndexedDoc = { source: string; category: string | null; chunks: number };
export type DiskFile = { name: string; category: string; /** path relative to data/knowledge, when known */ path?: string };
export type AuditStatus = "current" | "superseded" | "orphaned";
export type AuditRow = IndexedDoc & { status: AuditStatus; reason: string };

const ARCHIVE = new Set(["_archive", "archive", "old", "superseded"]);
const isArchive = (c: string | null | undefined) => ARCHIVE.has((c ?? "").trim().toLowerCase());

/** File types lib/document-processor.ts can extract text from (the only ones that can be indexed). */
export const INDEXABLE_EXTENSIONS = new Set([".pdf", ".xlsx", ".md", ".json"]);
const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
};
export const isIndexableName = (name: string) => INDEXABLE_EXTENSIONS.has(extOf(name));

/** Latest dated version per document key among the current (non-archive) files on disk. */
function latestByKey(disk: DiskFile[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const f of disk) {
    if (isArchive(f.category)) continue;
    const v = parseDocumentVersion(f.name);
    if (v.date && (!latest.has(v.key) || v.date > latest.get(v.key)!)) latest.set(v.key, v.date);
  }
  return latest;
}

export function classifyIndex(indexed: IndexedDoc[], disk: DiskFile[]): AuditRow[] {
  const byName = new Map<string, DiskFile[]>();
  for (const f of disk) byName.set(f.name, [...(byName.get(f.name) ?? []), f]);

  const latest = latestByKey(disk);

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

export type UnindexedStatus = "not_indexed" | "skipped";
export type UnindexedRow = DiskFile & {
  status: UnindexedStatus;
  /** The latest version of its document (an archive copy or an older dated version is not). */
  latest: boolean;
  reason: string;
};

/**
 * Every file on disk whose name has no document in the index. "on disk, latest version, not indexed" is status
 * "not_indexed"; everything else is "skipped" with the reason. Two files are the same document when they share the
 * document key, extension and date: an indexed copy under another name ("X.pdf" indexed, "X (1).pdf" on disk) is
 * skipped, and of several unindexed copies only the first (by path) is indexed.
 */
export function findUnindexed(indexed: IndexedDoc[], disk: DiskFile[]): UnindexedRow[] {
  const indexedNames = new Set(indexed.map((d) => d.source));
  const identity = (name: string) => {
    const v = parseDocumentVersion(name);
    return `${v.key}|${extOf(name)}|${v.date ?? ""}`;
  };
  const indexedByIdentity = new Map(indexed.map((d) => [identity(d.source), d.source]));
  const latest = latestByKey(disk);
  const claimed = new Map<string, string>();

  const rows: UnindexedRow[] = [];
  const candidates = disk.filter((f) => !indexedNames.has(f.name)).sort((a, b) => (a.path ?? a.name).localeCompare(b.path ?? b.name));
  for (const f of candidates) {
    const v = parseDocumentVersion(f.name);
    const newer = latest.get(v.key);
    const older = Boolean(newer && (!v.date || v.date < newer));
    const row = (status: UnindexedStatus, isLatest: boolean, reason: string): UnindexedRow => ({ ...f, status, latest: isLatest, reason });
    if (isArchive(f.category)) rows.push(row("skipped", false, "in an archive folder"));
    else if (older) rows.push(row("skipped", false, `older version (${v.date ?? "undated"}); latest on disk is ${newer}`));
    else if (!isIndexableName(f.name)) rows.push(row("skipped", true, `unsupported file type (${extOf(f.name) || "none"}), the ingester cannot read it`));
    else {
      const id = identity(f.name);
      const twin = indexedByIdentity.get(id) ?? claimed.get(id);
      if (twin) rows.push(row("skipped", true, `same document as ${indexedByIdentity.has(id) ? "indexed" : "unindexed"} "${twin}"`));
      else {
        claimed.set(id, f.name);
        rows.push(row("not_indexed", true, "on disk, latest version, not indexed"));
      }
    }
  }
  return rows;
}
