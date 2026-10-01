export interface RetrievedChunk {
  content: string;
  metadata: unknown;
}

/** One citable source: built ONLY from the metadata of a chunk that was retrieved for the message. */
export interface SourceRef {
  /** "S1", "S2", ... -- the marker the model writes after a claim and the client resolves. */
  id: string;
  /** Source document (file name) from the chunk metadata. */
  source: string;
  /** Page from the chunk metadata; absent for sources with no pages (spreadsheets, markdown). */
  page?: number;
}
