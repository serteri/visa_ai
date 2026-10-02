/** Reads what the vector index (document_chunks) holds, one row per document, through the READ ONLY production connection. */
import type { IndexedDoc } from "../../lib/chat/index-audit";
import { withProdReadOnly } from "./prod-db";

export async function readIndexedDocs(): Promise<IndexedDoc[]> {
  const rows = await withProdReadOnly((tx) =>
    tx.$queryRawUnsafe<IndexedDoc[]>(`
      SELECT metadata->>'source' AS source, metadata->>'category' AS category, COUNT(*)::int AS chunks
      FROM document_chunks
      GROUP BY 1, 2
      ORDER BY 1, 2`),
  );
  return rows.filter((r) => r.source);
}
