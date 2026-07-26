# ADR 0001 — Admin/CRM Routing Cleanup, RBAC Verification, and Dynamic Commission Rates

**Date:** 2026-07-26
**Status:** Accepted / Implemented (Adım 1–4 complete)

## Context

This work started as a routing-cleanup request ("Adım 1") and expanded into four
sequential steps once each step's investigation surfaced facts that didn't match
the original assumptions. The project runs **two independent ORMs against one
Postgres database** (Prisma for auth/CRM, Drizzle for everything else — see
`prisma/schema.prisma`'s own header warning) and **two independent admin
surfaces** (a legacy password-gated admin, and a newer NextAuth-RBAC-gated CRM).
Both facts shaped every decision below.

---

## Adım 1 — Routing Cleanup

### What we assumed going in
`app/admin/*` contained the real legacy dashboard/leads/agents pages, with a
`crm` subfolder to exclude from deletion.

### What was actually true
- `app/admin/{agents,dashboard,full-check-waitlist,leads,referrals,visas}/page.tsx`
  were **thin locale-redirect stubs only** (`redirect("/en/admin/...")`) — not
  the real pages.
- The real legacy pages live at `app/[locale]/(main)/admin/*`, password-cookie
  gated, still actively linked from `components/header.tsx` and their own
  `AdminNav`, and contain functionality with **no CRM equivalent** (visas DB
  browser, EOI-round scraper, agent-referral tracking, full-check-waitlist
  viewer).
- There is no `crm` folder under `app/admin` at all. The real CRM lives at
  `app/[locale]/(portal)/admin/crm/*`, a NextAuth-RBAC-gated, Prisma-backed
  system entirely separate from the legacy one.

### Decision
- Deleted only the 6 stub files under `app/admin/*`. Left `(main)/admin/*`
  untouched — it's live, linked, and covers functionality the CRM doesn't
  replace yet.
- The "`/admin` → `/admin/crm/dashboard`" redirect was implemented in
  **`proxy.ts` (middleware)**, not `app/admin/page.tsx`. Middleware already
  intercepted bare `/admin` and hard-redirected it to the legacy dashboard
  *before any page component could run* — a page.tsx at that path would have
  been dead code. Changed the middleware's existing special case instead.

### Why this matters
A literal reading of the request ("silme + page.tsx redirect ekle") would have
either deleted live, linked functionality with no replacement, or created a
redirect page that middleware would never let execute.

---

## Adım 2 — Agent Creation Module

### What we assumed going in
"Acente/Kullanıcı tablosu" was one table; adding `commissionRate` + role was a
single schema edit.

### What was actually true
- **Two unrelated tables share the word "agent"**: Drizzle's `agents` table
  (a referral-partner directory — no auth, no role, no password field) and
  Prisma's `User` table (the actual RBAC/auth entity, already has
  `role`/`approvalStatus`/`market`). Confirmed with the user before writing
  any code: **Prisma `User` is the authority for agent accounts.**
- Running `npx prisma db push` (dry-run, no `--accept-data-loss`) surfaced two
  problems, neither caused by this step's own change:
  1. It proposed **dropping the entire `campaigns` table** (1 live row) —
     because it wasn't declared `@@ignore` in `schema.prisma` yet. This is
     exactly the failure mode `schema.prisma`'s own header comment warns
     about for cross-ORM tables.
  2. While fixing that, introspection revealed the **live `campaigns` table's
     actual structure didn't match `db/schema.ts`'s Drizzle definition** — the
     live table has a `text`/`gen_random_uuid()` id and a `created_at` column,
     while the Drizzle schema declared a `serial` id and an `updated_at`
     column (from an earlier migration-conflict resolution that diverged from
     the original design). This meant **`claimLeadMagnetSlot` — the atomic
     lead-magnet slot-counter action from earlier work — was writing to a
     column that didn't exist on the live table**, i.e. a live, previously
     undetected production bug.

### Decisions
- Added `campaigns` to `schema.prisma` as a correctly-shaped `@@ignore`d model
  (matching the *actual* live columns, verified via a direct read-only
  `information_schema` query — not guessed).
- Fixed `db/schema.ts` and `app/actions/leadMagnetActions.ts` to match the
  real live table (`text` id, `created_at`, no `updated_at` write).
- Did **not** run `prisma db push --accept-data-loss`. Two unrelated columns
  on `user_reports` (`points_tier_backup`, `report_json_backup`, holding real
  data) were also flagged for deletion by the diff — pre-existing drift,
  untouched.
- Applied the actual schema change (`User.commissionRate Float?`) via a
  **targeted `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** through
  `prisma db execute`, bypassing the full-diff engine entirely — the
  documented-in-this-repo safer alternative for small, isolated Prisma-model
  changes.
- Built `/admin/crm/agents/create` (page + client form) and
  `createAgentAction` (`admin/crm/actions.ts`): `requireAdmin()` check,
  `bcrypt.hash(password, 12)` (matching the existing `/agent/register` flow's
  library/rounds — `bcryptjs`, already a dependency), `role: "AGENT"`,
  `approvalStatus: "APPROVED"` (admin creation = immediate approval, unlike
  self-registration's `"PENDING"`), `commissionRate` stored as a whole-number
  percentage.
- Verified end-to-end with a real, cleaned-up test row: Prisma write → read
  back → `bcrypt.compare` against the exact method `auth.ts` uses for login →
  confirmed `role`/`commissionRate` round-trip correctly.

### Why this matters
A blind `db push --accept-data-loss` here would have deleted a live table with
real data. The commissionRate column itself was zero-risk; the path to
applying it safely was not obvious from the request as written.

---

## Adım 3 — RBAC / Data Isolation Verification

### What was requested
Make `/admin/crm/dashboard` (and any leads list) conditionally filter by role:
ADMIN sees everything, AGENT sees only their own leads, enforced at the DB
query level, not hidden in the UI.

### What was actually true
- `/admin/crm/*` is **already hard-gated to `role === "ADMIN"` only**, both in
  `proxy.ts` (`portalRoleForPath`, strict equality redirect) and per-page
  (`requireRole("ADMIN", ...)`). An AGENT cannot reach this route tree at all.
- A **separate, already-correct** AGENT-facing portal already exists:
  `/agent/dashboard` and `/agent/lead/[id]`, both querying
  `lib/crm/leads.ts` functions that filter by `agentId` at the Prisma query
  level (`where: { agentId }`, `findFirst({ id, agentId })`) — not by hiding
  UI elements.
- The one unscoped function, `getLeadById`, is explicitly commented
  admin-only and is only ever called from the ADMIN-gated lead-detail page.
  The PDF-serving API route (`/api/agent/lead/[id]/pdf`) independently
  re-verifies role and picks the scoped vs. unscoped fetch itself, rather than
  trusting the calling page.

### Decision
**Did not implement the literal request.** Implementing it as described would
have required *weakening* `requireRole`'s single-role model and `proxy.ts`'s
strict-equality gate to let AGENT reach an ADMIN-only route — replacing an
already-correct, strictly-separated two-portal design with a single
shared-but-more-permissive one, purely to re-implement functionality that
already existed safely. Flagged this explicitly and got explicit confirmation
to keep the existing two-portal architecture rather than merge them.

### Verification performed
Real leak test (temporary DB rows, cleaned up after): two test AGENT accounts,
three leads (one per agent, one unassigned). Confirmed via direct function
calls — not assumption — that:
- An agent's own-leads query never returns another agent's or an unassigned
  lead.
- Fetching another agent's lead by ID returns `null` (maps to a 404), i.e. URL
  guessing cannot cross agent boundaries.
- Admin-facing aggregate functions still see all agents/leads (the ADMIN path
  wasn't accidentally narrowed while checking the AGENT path).

9/9 checks passed.

---

## Adım 4 — Dynamic Commission Rates

### What was requested
Replace `lib/stripe/commission.ts`'s hardcoded `COMMISSION_RATE = 0.2` with a
per-agent lookup against `User.commissionRate` (added in Adım 2), with a safe
fallback when unset.

### Implementation
- `recordCommissionTransaction` now reads `User.commissionRate` for the
  `agentId` in the checkout session's metadata, at the moment the transaction
  is recorded.
- **Unit mismatch caught before it shipped**: `User.commissionRate` is a
  whole-number percentage (e.g. `20`, per the Adım 2 form), while
  `Transaction.commissionRate` and this file's math use a fraction (`0.2`).
  Centralized the conversion in one function
  (`resolveCommissionRateFraction`) so this can't silently drift apart again.
- **Fallback**: `null`/unset → defaults to `0.2` (20%), the same value the
  hardcoded constant used before — chosen specifically so agents created
  before this change, or via the separate self-registration flow (which never
  sets a rate), see no behavior change.
- **Freezing guarantee preserved**: the resolved rate/amount is still written
  onto the `Transaction` row at creation time and never re-read from `User`
  later — a future change to an agent's rate cannot retroactively alter
  already-recorded transactions. Only the *source* of the rate moved from a
  global constant to a per-agent column; the point-in-time freeze semantics
  are unchanged.
- Webhook call site (`app/api/stripe/webhook/route.ts`) required **zero
  changes** — the function signature was kept identical.

### Verification performed
Real, cleaned-up test transactions covering: a custom-rate agent (30% → exact
dollar commission), a no-rate agent (falls back to 20%, doesn't crash), a
no-agent purchase (rate/amount stay `null`), and **Stripe webhook redelivery
idempotency** (the same `stripeSessionId` submitted twice produces exactly one
`Transaction` row, via the existing unique-constraint-catch path). 10/10
checks passed.

---

## Summary of what changed on disk

| Area | Files |
|---|---|
| Routing | `proxy.ts`, deleted `app/admin/{agents,dashboard,full-check-waitlist,leads,referrals,visas}/page.tsx` |
| Schema | `prisma/schema.prisma` (`User.commissionRate`, `campaigns` `@@ignore`d model), `db/schema.ts` (`campaigns` corrected to match live table) |
| Agent creation | `app/[locale]/(portal)/admin/crm/actions.ts` (`createAgentAction`), `app/[locale]/(portal)/admin/crm/agents/create/page.tsx`, `create-agent-form.tsx`, `app/[locale]/(portal)/admin/crm/dashboard/page.tsx` (Add New Agent button) |
| Lead-magnet bug fix (found during Adım 2) | `app/actions/leadMagnetActions.ts` |
| Commission | `lib/stripe/commission.ts` |

## Open items carried forward (not done, deliberately)

- `points_tier_backup` / `report_json_backup` columns on `user_reports` are
  drifted from `schema.prisma` (pre-existing, unrelated to this work) — still
  pending a deliberate decision, not touched.
- The 3 announced-but-undetailed streams from the earlier Ontario PNP work
  remain undocumented pending official publication (unrelated to this ADR,
  noted for context continuity).
- BC/Alberta PNP modules remain unimplemented (same earlier work, same reason:
  scoped to Ontario only by explicit choice).
