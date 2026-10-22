# Knowledge index: retired source `Skilled list.md`

`data/knowledge/Skilled list.md` (and its copy `public/Skilled list.md`) is an obsolete duplicate of the occupation list. Checked 2026-10-23
against `public/skilled-occupation-list.json` (the dataset the occupation pages read):

- 225113 is listed as **Market Research Analyst**; the current mapping is 225113 = Marketing Specialist, 225112 = Market Research Analyst.
- 122 of its code/title pairs disagree with the current list, 51 of its codes are not on the current list, 179 current codes are missing from it.
- `Skilled Occupation List.md` and `skilled-occupation-list.json` (both still active) cover all 684 current codes.

What changed in the repo: `lib/chat/knowledge-sources.ts` retires the source. `lib/chat/deps.ts` excludes `RETIRED_KNOWLEDGE_SOURCES` from both
retrieval queries, so the assistant cannot return its chunks whatever `document_chunks` holds. `scripts/test-chat-occupation-sources.ts` guards this.

What the repo change does not do: it does not remove rows already embedded in production `document_chunks`. If the index was built with this file,
its chunks are still stored (unreachable by retrieval now, but stale data). A targeted removal is needed:

```sql
-- inspect first (read-only)
SELECT count(*) FROM document_chunks WHERE metadata->>'source' = 'Skilled list.md';
-- then, only with explicit approval (production write)
DELETE FROM document_chunks WHERE metadata->>'source' = 'Skilled list.md';
```

Also move the file out of `data/knowledge` (or add it to the ingest ignore list) before the next full re-index, or it will be embedded again.
Production could not be read from this session (the read-only `PROD_DATABASE_URL` login failed), so the index contents are unverified.
