# Admin: State nomination (what it does and what to check)

Page: **Admin portal > State nomination** (`/<locale>/admin/crm/states`; sign in with your admin account, the same one as CRM & Agents).
The old `/admin/states` page redirects there.

## What is the source of truth now

The rows you save on this page. Reports, the chat and the page monitor read them (cached for up to 60 s; saving expires the cache at once).
The admin row always wins: there is no date comparison with the code files any more. If the database or the tables are not available, the bundled
seed (the data the rows start from) is used so nothing breaks. `lib/state-nomination/state-rules-config.ts` and
`src/data/state-nomination-status.json` are the seed and the fallback only.

## One-time setup (each step is a production write, so each waits for your go-ahead)

1. Run `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` in Neon (creates 4 new tables: state_programs, state_program_subclasses, admin_audit_log, state_occupation_lists; nothing existing is touched; rollback is in the file header).
2. Review `docs/admin-data-seed-dry-run.md`, or run `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts` (dry run, also lists the old admin rows).
3. `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts --execute --expect-rows 8`.

Until step 3 the page shows the seed read-only and says so; reports and the chat are unchanged.

## Update from official source (top of each state's page)

Use this instead of editing field by field.

1. Open the state (**Admin > State nomination > <state>**). In the blue panel paste the text of the official page(s) and/or choose a file (PDF, DOCX, XLSX or CSV, max 10 MB), enter the source URL and the date you checked it, press **Find changes**. The file is read in the request; the extracted text is kept with the update record in the audit log.
2. The assistant compares the text with the row and proposes changes (status, program year, opening / closing date, allocation and fee per subclass, exceptions, conditions with category and residence tag, note, chat summary). Each proposal shows *current -> proposed* and **the sentence of the source that states it**. The server drops any proposal whose quote is not in the text or whose figures, dates, year or status wording the quote does not state; those are listed under "rejected".
3. Tick the changes that are right and press **Approve selected** (or **Discard**). Only the ticked changes are saved. Each goes to the history with the source URL, the date and the quote, under your name; **last verified becomes the date you entered**. A new status brings its scoring inputs with it. If the English of a note or condition changes, its Turkish / Chinese translations are removed (customers see English until you translate and review again). Fee excl. and incl. GST must be approved together.
4. **Chat knowledge**: the pasted page (or file) is indexed as its own document. Removal is never by state name: the review lists the state's documents with a checkbox each, and only the ticked ones are removed. The only document ticked for you is one from the SAME source URL (or the same uploaded file); occupation lists (xlsx or named as one), fee pages and other pages are never ticked unless you tick them. "Update chat knowledge for this page only" and "Mark verified" are separate buttons that work with no field change approved; neither closes the update. If indexing fails the data is still saved and the panel says so.
5. **Occupation lists** (XLSX / CSV): if the file is a state occupation list (ACT, NT, QLD, WA, SA), the panel shows the codes found per subclass and the added / removed / changed occupations against the list the reports use now; tick what to apply. If the file does not say which subclass its rows are for, choose it in the form and upload again (nothing is assumed). Approved lists replace that state's bundled list in the occupation match.

Limits: Vercel itself rejects request bodies over 4.5 MB, so a file between 4.5 and 10 MB cannot be uploaded in production; paste the text instead. The extraction needs `OPENAI_API_KEY` (model `ADMIN_EXTRACTION_MODEL`, default `gpt-4.1`).
