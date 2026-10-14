# Admin panel as the single source of truth: design (Phase 0)

Status: **design for approval. No code has been changed.** Scope: state nomination data and skills assessment authority data
become editable in the admin panel, with PDF upload, indexing, AI-drafted changes and an explicit Approve step.

Everything below is grounded in the repository as of 2026-10-14. Where I rely on a fact in the code I name the file.

---

## 0. Summary and the decisions I need from you

**What changes in one paragraph.** Two new admin pages (State Nomination, Skills Assessment Authorities) edit rows in the
database. Reports, the chat, the state monitor and the occupation pages read those rows through one cached **data snapshot**
instead of `state-rules-config.ts`, `state-nomination-status.json`, the 15 authority files and their fee JSON files. The static files stay as a
one-time seed and as an offline fallback. A PDF uploaded on either page is stored privately, indexed in the background, and
proposes a **draft** of the structured fields; nothing reaches a report until you click Approve. Every change is audit-logged.

**Findings that shape the design** (details in section 1):

1. The engine is **synchronous and pure** (`runReadinessEngine`, `buildEngineFacts`, `getAuthorityById` read module constants).
   A database cannot be read from inside it. The design passes a **snapshot object in** (the pattern already used for
   `stateNominationConfig`), not a hidden global.
2. The legacy admin (`/admin/states`) is a **single shared password** (`lib/admin-auth.ts`): there is no identity, so an audit
   log could only say "admin". The role-based CRM portal (`app/[locale]/(portal)/admin/crm`, NextAuth `ADMIN` role) has
   identity. The new pages must live there.
3. Storage already exists: **Cloudflare R2** via the S3 client in `lib/aws/s3.ts` (the project left Vercel Blob because Blob
   offers only public URLs). I propose R2, not Blob.
4. There is **no job queue** in the stack. There is `after()` (used for PDF downloads), Vercel crons (3 today) and a 60 s
   `maxDuration` pattern. I propose a database job table driven by a cron plus "run now" calls, in steps small enough for 60 s.
5. The translations of state notes are keyed by the **exact English sentence** (`state-note-translations.ts`,
   `state-keyfact-translations.ts`), and the residence rule is detected by **matching a key-fact prefix**
   (`residence-rules.ts`). Both are fragile and are replaced by explicit fields.
6. `data/knowledge/` is **gitignored**. Production never had the PDFs; only their chunks exist in `document_chunks`. Moving to
   uploads is also how the source PDFs get into storage at all.
7. The database is **production only** (`docs/database-environments.md`). Every migration and seed is a production write and
   needs your go-ahead, step by step. Tests must never need a database.

**Decisions I need from you** (my recommendation first):

| # | Decision | Recommendation |
|---|---|---|
| D1 | Where the pages live | New pages in the **CRM admin** (identity, audit "who"); `/admin/states` redirects there |
| D2 | File storage | **Cloudflare R2** (already in use, private, pre-signed upload) |
| D3 | Background runner | **DB job table + cron + "Run now"**, steps under 60 s; revisit Inngest/QStash only if volume grows |
| D4 | When the old document is superseded and its chunks removed | **When the new document finishes indexing** (as you asked), with a visible banner "document newer than approved data" until you Approve |
| D5 | Unreviewed machine translations | **Never shown to customers**: the report falls back to English until you mark a language reviewed |
| D6 | The fortnightly state scraper (`StateIntelligence`, `/api/cron/sync-states`) | **Retire from the display chain**; keep only the page-change monitor |
| D7 | Vercel plan limits | Please confirm plan (function `maxDuration`, cron frequency). Cron `0 */6 * * *` implies at least Pro |
| D8 | State occupation lists (xlsx/CSV) | **Out of this scope**; the document type is reserved so it can be added later |

---

## 1. What exists today (evidence)

### 1.1 State nomination data: five sources, with a precedence chain

| Source | File / table | Written by | Used for |
|---|---|---|---|
| Admin row | `state_nomination_configs` (`StateNominationConfig`): `status`, `supportedVisas`, `feeAud`, `customAiNote`, `officialWebsite`, `updatedBy` (never set), timestamps | `/admin/states` (shared password) | status override, one fee, one note |
| Scraper | `state_intelligence` (`StateIntelligence`) | fortnightly cron `sync-states` | displayed status, `lastVerifiedAt` |
| Rules file | `lib/state-nomination/state-rules-config.ts` (`STATE_RULES`: status, note, offshoreQuotaPressure, aiSummary, keyFacts[], lastVerified, sourceDocument) | code + deploy | PDF note, chat grounding, residence rules, state-claims, `content-dates` |
| Dataset | `src/data/state-nomination-status.json` | code + deploy | score formula inputs, `programWindow`, `specialConditions` |
| Occupation-level | `src/data/state-sponsorship.json`, `StateOccupationListEntry`, state xlsx lists | code / scripts | heat-map, list matching |

Precedence today (`lib/state-nomination/state-status.ts`): admin row **only if saved on or after the rule's `lastVerified`**,
else scraper, else rule, else dataset. That date rule is what you want removed: it is why saving a row on 13 Oct could
override a fresh code refresh (and why a stale admin row silently loses to the file).

Other readers that must keep working: `lib/readiness/state-nomination.ts` (score and PDF table), `lib/reports/report-states.ts`
(section, "data may have changed" note via `stateDataFlag`), `lib/reports/content-dates.ts` (data-as-of date from
`STATE_RULES[*].lastVerified`), `lib/chat/engine-facts.ts` (state lines), `lib/chat/state-claims.ts` (statements and sources),
`lib/state-nomination/residence-rules.ts`, `lib/state-monitor/*` (pages, `sourceFilesFor`), `lib/ai/retrieve-state-context.ts`,
`app/api/admin/states/route.ts`.

### 1.2 Skills assessment authorities: 15 TypeScript files, 9 data JSON files, 2 parallel systems

* `lib/skills-assessment/authorities/*.ts` (5,734 lines): `SkillsAssessmentAuthority` (`types.ts`): occupations, pathways (fees, documents,
  exams, processing time, notes), services, English requirements, review/appeal fees, `lastVerified`, `sourceDocument`; text is
  `LocalizedString` (en/tr/zh-Hans).
* Fee files: `src/data/skills-assessment/{acs,adc,aims,caanz,engineers-australia}-fees.json` + `tra-sources.json`, and `src/data/health-registration/{amc,anmac}-fees.json` + `img-pathways.json`; each with its
  **own GST rule** (for example ACS: fees stated excluding GST; the report adds 10 percent for an applicant in Australia).
* Registry: `lib/skills-assessment/index.ts` (`AUTHORITIES`, `listAuthorities`, `getAuthorityById`, `getSkillsAssessmentAuthority`),
  16 call sites outside the authority files (engine, `report-costs`, `chat/authority-fees`, `occupations/page-content`, ...).
* Outside that registry: `lib/health-registration/{anmac-fees,img-pathways}.ts` (ANMAC, AMC, Ahpra) and
  `lib/skills-assessment/tra-osap.ts` + `lib/occupations/tra-block.ts` (TRA; **currently uncommitted work in your tree**, to be
  coordinated before Part 3).
* Knowledge folders in `data/knowledge/Skill Assessments/` (15): ACS, Engineers Australia, VETASSESS, TRA, Australian Institute of
  Medical Scientists (AIMS), ADC, ANMAC, AMC (IMG pathways), CPA, CAANZ, IPA, AACA, OTC, CASA, plus the "Assessing authorities" overview.

### 1.3 Documents and the chat index

* `document_chunks` (content, `metadata` JSON {source filename, category, page}, `embedding vector(1536)`).
* Indexing is a local script (`scripts/seed-knowledge.ts`, read from the local folder, OpenAI `text-embedding-3-small`), version
  handling is by **file name and folder** (`lib/chat/index-audit.ts`, `scripts/clean-knowledge-index.ts`), and chunk-to-state
  attribution in the chat comes from the **committed manifest** `src/data/knowledge-versions.json` generated from the local folder.
* Citation names come from the same manifest (`lib/chat/source-names.ts`).

---

## A. State Nomination Config as the single source

### A.1 Rules

1. **The admin row always wins.** `resolveDisplayStatus`, `currentAdminStatus`, `adminStatusStillCurrent` and the date comparison are deleted.
   The chain becomes: **admin row, else bundled seed** (used only if the table is empty or the database is unreachable).
2. **The rules file seeds rows once** (`scripts/seed-admin-data.ts`, idempotent, never overwrites an existing row) and is then
   frozen as the offline fallback. After cutover it is no longer edited by hand.
3. The scraper (`StateIntelligence`) leaves the chain (D6). The page-change **monitor stays** and raises a "needs review" badge on the state row.
4. "Last verified" is **set on save** (server time, by the saved-in-by user), not typed. A "Mark verified, no change" button updates only that field.

### A.2 Statuses

Existing values keep working as aliases; new values are added. Each status maps to scoring and availability behaviour in one table (code: `lib/state-nomination/status.ts`).

| Status (admin label) | Counted open for a subclass? | Notes |
|---|---|---|
| Open (Onshore & Offshore) | yes | as today |
| **Open (Onshore only)** | yes for applicants in Australia | replaces `Open (Onshore Only)` (capital O); old value migrated |
| Open (Offshore only) | yes for applicants abroad | as today |
| **Closed with exceptions** | **no**, exceptions text is shown next to the status | the NT case: closed, plus a narrow onshore 491 exception. Exceptions are structured (below) so a later iteration can open a subclass for the matching applicants |
| Suspended / Closed | no | as today |
| **Not yet published** | no | the state said the new program is not out (QLD, VIC today). Distinct from the next row |
| **Check official page** | no | we cannot confirm (WA today). Now available in the dropdown (it is missing from the current admin dropdown, which is why WA cannot be saved correctly today) |

Legacy values ("High Demand", "Open for Offshore", "Onshore Only", "Closed") are mapped on seed and no longer offered.

### A.3 Data model (targeted `CREATE TABLE IF NOT EXISTS`, no `prisma db push`)

Program data is keyed by **program year** so a past year is history, not an overwrite.

```
state_programs                       -- one row per state per program year; exactly one per state is is_current
  id, state_code, program_year ("2026-27"), is_current,
  status, status_changed_at,
  opening_date date null, closing_date date null,
  official_url, extra_urls text[],             -- monitor pages; replaces MONITORED_PAGES (below)
  exceptions jsonb,                            -- {text:{en,tr,zh}, subclass:"491", applies_to:"onshore", criteria:[...], deadline date}
  notes jsonb,                                 -- {en, tr, zh-Hans} each {text, reviewed:boolean, drafted_at, reviewed_by, reviewed_at}
  ai_summary jsonb,                            -- same shape (chat grounding paragraph)
  conditions jsonb,                            -- list, see A.4
  scoring jsonb,                               -- the heuristic inputs the score formula needs (A.5)
  last_verified_at timestamptz, last_verified_by,
  source_document_id text null,                -- the admin_documents row the data was approved from
  created_at, updated_at, updated_by           -- updated_by is filled from the NextAuth session
  unique (state_code, program_year)

state_program_subclasses             -- per subclass (190, 491)
  state_program_id, subclass,
  availability: inherit | open | closed | exception,  -- optional per-subclass override (TAS offshore 491 paused, NT 491 exception)
  allocation int null, allocation_used int null,       -- replaces the existing state_allocations table (read today by lib/services/report-service.ts for the viability section); its rows are migrated and that reader switched
  fee_excl_gst numeric(10,2) null, fee_incl_gst numeric(10,2) null,
  gst_basis: stated_by_state | computed_10pct | no_gst,
  fee_note jsonb, effective_from date null

admin_audit_log                      -- shared by states and authorities (section B)
  id, at timestamptz, actor_id, actor_email,
  entity_type ('state_program'|'authority'|'document'), entity_key (e.g. 'NT/2026-27', 'ACS'),
  field_path (e.g. 'fees.190.fee_excl_gst'), old_value jsonb, new_value jsonb,
  action ('edit'|'seed'|'approve_draft'|'reject_draft'|'mark_verified'|'translate_draft'|'translate_review'),
  document_id null, note null
```

Validation on save (server, not just UI): excl/incl GST consistent (`incl = round(excl * 1.10, 2)` unless `stated_by_state`),
subclass must be 190/491, dates parse, URLs are https, notes under a length cap, `status = Closed with exceptions` requires an exceptions text.

### A.4 Conditions: explicit instead of sentence-matching

`conditions` is a list of structured items instead of `keyFacts[]` strings:

```
{ id, kind: 'residence'|'employment'|'study'|'english'|'points'|'fee'|'process'|'other',
  subclasses: ['190','491'] | [], stream: 'Skilled Employment' | null,
  text: {en,tr,zh-Hans with reviewed flags},
  quote: 'verbatim sentence from the source', source: {document_id, page}, 
  residence_rule: 'required'|'not_required'|'not_stated'   -- only for kind=residence
}
```

Effects: `residence-rules.ts` reads `residence_rule` (no more key-fact prefix matching); `state-claims.ts` supports a sentence
against these items; the chat quotes the translated `text`. The provenance (`quote`, `source`) is what lets the chat keep
saying only what a state published.

### A.5 Scoring inputs

The report score formula uses the dataset fields (`minimumPoints`, `minimumEnglish`, `minimumExperienceYears`, `regionalFocus`,
`preferredVisaTypes`, `requiresStateResidence`, `requiresRecentEmployment`, `offshoreAvailability`/`onshoreAvailability`,
`offshoreQuotaPressure`). They go into a collapsed **Scoring inputs (advanced)** section, seeded from the dataset, edited by
you. Most are already derivable from `status` and `availability`; I propose removing the redundant ones in a later cleanup.

### A.6 Admin UI (CRM portal, `/admin/crm/states`)

* Table of the 8 states: status, program year, opening date, allocations, fees, last verified (age badge), monitor "needs review" badge, document status.
* State editor: the fields above; **per-language notes** with a **"Draft translation" button** (calls the model, fills tr/zh as
  *draft*, flagged "machine draft, not reviewed"; you edit and press "Mark reviewed"). Unreviewed text is never used for customers (D5).
* **History tab**: audit log filtered to the state (who, when, old to new), with "restore this value".
* **Documents tab**: part C.
* Save is immediate for manual edits (as today) but is logged and revalidates the snapshot cache.

---

## B. Skills Assessment Authorities admin page

### B.1 One row per authority, rich body as validated JSON

The authority type is deep (pathways, exams, services, document lists). Normalising all of it into columns would be the biggest part
of the work for little gain. Design: **structured columns for what you edit often and what other code queries, plus a JSON body for the rest**, both
validated by one schema derived from `SkillsAssessmentAuthority`.

```
skills_authorities
  authority_id text pk ('ACS','ENGINEERS_AUSTRALIA','VETASSESS','TRA','AIMS','ADC','ANMAC','AMC','AHPRA','CPA','CAANZ','IPA','AACA','OTC','CASA','GENERAL',...),
  name, country ('AU'|'CA'), is_active,
  official_url, source_page_url,
  processing_time jsonb,                     -- as stated: {weeks?, label:{en,tr,zh}, not_stated:boolean, note}
  key_requirements jsonb,                    -- i18n list
  notes jsonb,                               -- i18n with reviewed flags (as A.3)
  gst_treatment: fees_excl_gst_add_if_onshore | fees_incl_gst | no_gst | per_fee,   -- replaces six hand-written GST rules
  last_verified_at, last_verified_by, source_document_id,
  body jsonb,                                -- pathways, services, exams, English requirements, review/appeal ... (schema-validated)
  updated_at, updated_by

authority_occupations                         -- queried by the registry (code -> authority)
  authority_id, anzsco_code, osca_code null, title, unique(authority_id, anzsco_code)

authority_fees                                -- one row per fee per pathway
  id, authority_id, pathway_id, label jsonb, fee_excl_gst numeric, fee_incl_gst numeric, previous_fee_excl_gst null,
  gst_basis, currency, effective_from date, applicant_location null ('onshore'|'offshore'|'singapore'),
  estimated boolean, source_page text, source_quote text, note jsonb
```

Pathway **fees** and **occupations** are the editable tables; the pathway **requirements text, exams, documents** are edited as
structured JSON forms (typed fields, not a raw JSON box) for the common cases, with a raw-JSON view for the rest.

### B.2 Page

List of authorities with fee-count, occupation-count, last verified age, document status. Editor tabs: Overview (URL, processing time, notes en/tr/zh with the draft-translation workflow), Occupations (table, CSV paste), Fees (table per pathway with excl/incl GST, effective date, source page and quote), Requirements, Documents (part C), History (audit log).

### B.3 How reports and chat read it

`lib/skills-assessment/index.ts` keeps its API (`listAuthorities`, `getAuthorityById`, `getSkillsAssessmentAuthority`, `occupation-authority-map`)
but gets its data from the **snapshot** (section D). The six fee modules (`acs-fees.ts`, `aims-fees.ts`, ...) become thin readers of
`authority_fees` rows; their existing tests become **seed-parity tests** (the seeded rows reproduce today's numbers exactly).

### B.4 Inventory (what is migrated, from where)

| Authority | Code today | Fee data | Knowledge folder |
|---|---|---|---|
| ACS | `authorities/acs.ts` | `acs-fees.json` | Australian Computer Society Incorporated |
| Engineers Australia | `engineers-australia.ts` | `engineers-australia-fees.json` | The Institution of Engineers Australia |
| VETASSESS | `vetassess.ts` | in file | Vocational Education and Training Assessment Services |
| TRA | `tra-australia.ts`, `tra-osap.ts`, `occupations/tra-block.ts` | `tra-sources.json` | Trades Recognition Australia |
| AIMS | `aims.ts` | `aims-fees.json` | Australian Institute of Medical Scientists |
| ADC | `adc.ts` | `adc-fees.json` | Australian Dental Council Limited |
| ANMAC | `anmac.ts` + `health-registration/anmac-fees.ts` | in file | Anmac |
| AMC / Ahpra (IMG) | `ahpra.ts` + `health-registration/img-pathways.ts` | `amc-fees.json`, `img-pathways.json` | Australian Medical Council(AMC), Pathways to registration for IMGs |
| CPA Australia | `cpa-australia.ts` | in file (price by location) | CPA Australia Ltd |
| CAANZ | `caanz.ts` | `caanz-fees.json` | Chartered Accountants Australia and New Zealand |
| IPA | `ipa-australia.ts` | in file | Institute of Public Accountants Ltd |
| AACA | `aaca.ts` | in file | Architects Accreditation Council of Australia |
| OTC | `otc-australia.ts` | in file | Occupational Therapy Council of Australia Limited |
| CASA | `casa-australia.ts` | in file | Civil Aviation Safety Authority |
| General / other | `general-authority.ts` | n/a | Skills assessment Assessing authorities.pdf |

---

## C. Document upload for both pages

### C.1 Flow

```
Admin picks a PDF on a state or authority  -->  (1) browser asks the server for a pre-signed R2 upload
   -->  (2) browser PUTs the file straight to R2 (bypasses the Vercel body limit)  -->  (3) browser confirms
   -->  admin_documents row = uploaded  -->  background job runs the stages below, resumable, one stage per run
```

| Stage | What happens | Output / failure |
|---|---|---|
| `validating` | size, `%PDF` magic bytes, page count, sha256 (duplicate of the current document is rejected with a message) | reject with reason |
| `extracting` | text per page (the same `pdf-parse` the indexer uses), stored as JSON in R2 | scanned PDFs with no text are detected and flagged "needs OCR", never silently indexed empty |
| `chunking` | the existing chunker (`lib/document-processor.ts`) | chunk count |
| `embedding` | OpenAI embeddings in batches of ~50 per run (60 s budget), progress saved | retries with backoff, failed batch is retried, not restarted |
| `indexing` | **in one transaction**: insert the new chunks with metadata, mark the previous current document for this state/authority `superseded`, delete its chunks | atomic: a failure leaves the old document and its chunks untouched |
| `extracting_fields` | model fills the structured fields as a **draft proposal** (C.3) | draft diff ready, or error |
| `ready` | draft awaits Approve | |

Statuses shown on the page: `uploaded, validating, extracting, chunking, embedding, indexing, extracting_fields, ready, approved, rejected, failed, superseded`,
with the stage, attempt count, last error, and a **Retry** / **Re-run extraction** / **Delete** button. Errors are written to the row, not only to logs.

### C.2 Storage, limits, security

* **R2 private bucket** (D2): key `admin-docs/{state|authority}/{code}/{documentId}.pdf`; never a public URL; admin downloads through a short-lived pre-signed GET (the same pattern as `getSecureDocumentUrlAction`). New env: bucket name, plus the existing R2 credentials. The bucket needs a CORS rule for the admin origin (PUT).
* **Limits**: PDF only (`application/pdf` and magic bytes), 25 MB, 500 pages, 5 uploads per admin per hour, one active pipeline per entity.
* **Access**: CRM `ADMIN` role only, checked server-side on every action; all actions audit-logged (`action='upload'`).
* **Untrusted content**: PDF text is data. Prompt-injection text inside a PDF cannot change behaviour because (a) the model only returns JSON validated against a schema, (b) each field must carry a verbatim quote and page, and the server checks the quote exists on that page and contains the number (C.3), (c) nothing is applied without Approve.

### C.3 AI extraction as a draft diff

* The model gets the page texts, the field schema and the **current values**; it returns, per field, `{value, quote, page}` or `null`. Nothing is invented: a field without a quote is rejected by the server.
* **Verification before display**: the quote must appear on the stated page; every number in the value must appear in the quote; GST fields are recomputed and checked.
* The admin sees a **diff table**: field, current value, proposed value, quote and page, with per-field Accept / Reject / Edit. "Approve selected" writes the accepted fields, records `document_id`, sets last verified, writes one audit entry per field (`action='approve_draft'`), and invalidates the snapshot cache. "Reject" discards the proposal (logged).
* The proposal lives in `admin_data_proposals` (document_id, entity, proposed jsonb, diff jsonb, status pending|approved|rejected|partial, decided_by, decided_at); a proposal is never read by reports.
* Models: OpenAI structured output (the stack already uses OpenAI for chat and embeddings), model id in env (`ADMIN_EXTRACTION_MODEL`), cost per document logged.
* Optional later: the monitor, on a detected page change, fetches the page, runs the same extraction and creates a pending proposal (no upload needed).

### C.4 Index metadata and chat

Chunk metadata gains `document_id, entity_type, entity_code, document_status, effective_date`. The chat's source attribution and "current source" logic
(`state-claims.ts`, `source-names.ts`) read this metadata instead of the file-path manifest, so no committed manifest is needed. After cutover
`index-audit.ts`, `clean-knowledge-index.ts` and `seed-knowledge.ts` are used only for legacy chunks until those are re-attached (D.5).

---

## D. How everything reads the new data, and the migration

### D.1 The snapshot

```
loadAdminData(): Promise<AdminData>      -- states (current program), authorities (+fees, occupations), generated_at, source:'db'|'cache'|'seed'
getAdminData(): cached (unstable_cache, tag 'admin-data', revalidated on every save/approve; 60 s safety TTL)
fallback chain: database -> last exported snapshot in R2 (nightly cron) -> bundled seed files
```

* **Reports**: the route that builds a report loads the snapshot once and passes it into the engine (like `stateNominationConfig` today). The engine stays synchronous and testable; tests pass a snapshot built from the seed. `runReadinessEngine(input, { data })`; default is the bundled seed so existing tests keep running with no database.
* **Authorities**: `getAuthorityById` and friends take the snapshot (or read a request-scoped registry set from it). 16 call sites are updated. I will not use a hidden module-level global that could serve different requests different data.
* **Chat**: `buildEngineFacts(live)` already receives live data; the snapshot is added to `live`. `state-claims`, `residence-rules` and `authority-fees` read it.
* **State monitor**: monitored URLs come from `state_programs.official_url/extra_urls` (admin-editable) instead of `MONITORED_PAGES`; "files to replace" becomes "upload a document on this state's page". `stateDataFlag` and `content-dates` use `last_verified_at` from the row.
* **Viability section** (`lib/services/report-service.ts`): reads allocations from `state_program_subclasses` instead of `state_allocations`.
* **Occupation pages and sitemap** (`page-content.ts`, `richness.ts`): read authority fee/verification dates from the snapshot.
* **Stored reports** recompute on view (`refresh-report`), so approved data reaches existing reports with the existing "data as of" labelling.

### D.2 Migration plan (each step is a production write and waits for your go-ahead)

1. **Create tables** with `CREATE TABLE IF NOT EXISTS` migration files in `prisma/manual-migrations/` (no `db push`; new tables only, nothing existing is altered; the four Drizzle `@@ignore` tables are untouched). Rollback: drop the new tables.
2. **Seed** (`scripts/seed-admin-data.ts`, dry run first, then `--execute`): states from `STATE_RULES` + dataset (+ current admin rows merged: the latest admin value per field, listed in a report you review before it runs), authorities from the 15 files and fee JSONs. Idempotent; never overwrites a row that already has `updated_by`.
3. **Shadow mode** (`ADMIN_DATA_MODE=shadow`): reports read the static data as today but also compute from the snapshot and **log every difference**. Cutover requires zero unexplained differences over the report test suite and the 8 personas x 3 languages.
4. **Cutover** (`ADMIN_DATA_MODE=db`): the snapshot becomes the source; the static files remain the fallback. One env var switches back.
5. **Legacy import of documents**: a one-off script uploads each local PDF to R2 as an `admin_documents` row with status `approved`, and stamps the existing chunks' metadata (`document_id`, entity) by matching `source`+`category`, **without re-embedding**. Superseded/archived PDFs from `_archive/` are imported as `superseded` (their chunks are exactly what `clean-knowledge-index.ts` was going to delete).
6. **Retire**: delete the date-precedence code, `StateIntelligence` from the display chain, the rules-file editing instructions (`docs/state-recheck-2026-27.md` is rewritten), and the manifest-based attribution.

### D.3 What happens to `data/knowledge/`

It becomes **legacy**: kept on your machine as the archive and as the input to step 5, never read by production. Occupation list spreadsheets stay there until D8 is built. `scripts/seed-knowledge.ts` and `clean-knowledge-index.ts` remain as maintenance tools for legacy chunks only.

### D.4 Risks and mitigations

| Risk | Mitigation |
|---|---|
| The engine cannot read a DB | snapshot passed in; default seed; shadow mode proves parity |
| DB outage | fallback chain (R2 export, then bundled seed); reports never fail on the snapshot |
| Wrong data approved | quote + page verification, per-field Approve, audit log with restore, last-verified age badges |
| Serverless time limits | stage-per-run pipeline, 60 s budget, resumable, "Run now" and cron both drive it |
| Stale cache | `revalidateTag` on every save; 60 s TTL as a safety net |
| Translation quality | draft/reviewed flags; English fallback for unreviewed text (D5) |
| Two sources again | after cutover the static files are read only as fallback; a CI test fails if they diverge from the last export |
| Production-only database | every migration and seed has a dry run, an explicit go-ahead and a rollback |

### D.5 Tests (all database-free; the pipeline uses stubs)

* Schema and validation (GST consistency, subclass, status rules, exceptions required, URL/date checks).
* Status table: each status's open/closed behaviour per subclass and applicant location; "Closed with exceptions" is never counted open.
* Precedence: admin row always wins regardless of dates; empty table falls back to the seed (replaces `test-state-status-precedence.ts`).
* Seed parity: a snapshot built from the seed reproduces today's report outputs, authority fees (ACS/EA/AIMS/CAANZ/ADC/ANMAC/AMC/CPA...), chat facts, state notes (en/tr/zh-Hans), residence rules and content dates; the existing `test:*-fees` suites run against it.
* Audit log: every field change writes who/when/old/new; restore works; seed writes are marked `seed`.
* Upload: type/size/magic-byte/page limits, duplicate, admin-only (non-admin rejected), pre-signed URL scoping.
* Pipeline state machine with stubbed extraction/embedding/storage: resume after failure, no half-indexed document, atomic supersede (old chunks survive a failure), scanned-PDF detection, error shown in status.
* Extraction safety: a proposal with a missing or non-matching quote is rejected; an injected instruction in a PDF changes nothing; the diff shows only changed fields; Approve is required before any report changes.
* Snapshot: cache invalidation on save, TTL, fallback order.
* Chat: `state-claims` supports statements against `conditions`; sources resolve from chunk metadata, not the manifest.

---

## E. Effort and order

Estimates are working days of build plus your review time, assuming this design is approved and the decisions in section 0 are as recommended.

| Part | Scope | Estimate | Depends on |
|---|---|---|---|
| **1. Foundations** | tables + migrations, audit log, shared schemas, snapshot loader + cache + fallback, seed script (dry run), shadow-mode harness, CRM page shell with identity | 3 to 4 days | D1, D7 |
| **2. State Nomination admin (A)** | statuses, program-year model, per-subclass fees/allocations, structured conditions, exceptions, notes + draft translation + reviewed flags, history tab, readers switched (report, chat, residence, state-claims, content-dates), monitor URLs from rows, precedence code removed | 5 to 7 days | 1 |
| **3. Authorities admin (B)** | schema from `SkillsAssessmentAuthority`, fee/occupation tables, registry reads snapshot (16 call sites), six fee modules to row readers, seed parity tests, TRA/ANMAC/AMC/Ahpra folded in | 8 to 11 days (largest; 15 authorities with different fee rules) | 1 (TRA WIP resolved first) |
| **4. Documents (C, pipeline)** | R2 upload, `admin_documents`, job runner + cron + "Run now", stages, atomic supersede, status/error UI, legacy import script | 5 to 7 days | 1, D2, D3 |
| **5. AI extraction + draft diff + Approve (C.3)** | schema-per-entity, quote verification, `admin_data_proposals`, diff UI, per-field accept, audit | 5 to 6 days | 2 and 3 (what fields exist), 4 |
| **6. Cutover and retirement** | shadow comparison, switch, fallback export cron, retire scraper/manifest/old docs, final docs | 2 to 3 days | all |
| **Total** | | **28 to 38 days** | |

**Proposed order: 1, 2, 4, 3, 5, 6.** State first because it is smaller, has a live pain (the date precedence and the missing "Check official page" option), and proves the snapshot/audit/draft pattern. The document pipeline (4) comes before the big authority migration (3) so uploads work for states early and the pipeline is reused for authorities. AI extraction (5) last because it needs both field sets. Each part ships behind `ADMIN_DATA_MODE` and is reversible.

**Smallest useful first slice** (if you want value sooner): Part 1 plus the state page from Part 2 without translations or documents (about 5 to 6 days). That alone gives you "admin row always wins", the new statuses and the audit log, which removes the situation where a saved row loses to a code file.

---

## Appendix: questions I could not answer from the code

1. Vercel plan, function `maxDuration` ceiling, and cron frequency allowed (D7).
2. Whether the R2 bucket used for the Document Vault can also hold admin documents under a separate prefix, or a second bucket is preferred.
3. Whether any customer-facing page besides the report, chat and occupation pages reads state or authority data (I found none, but pages under `app/[locale]` import `STATE_RULES` in `StateDemandRadar` through `state-sponsorship.json`).
4. Whether the 27 current files (28 including `_archive`) under `data/knowledge/Skill Assessments/` are the complete set you want imported in step 5 of the migration.
