# Agent referral flow: audit (Phase 0) and proposal (Phase 1)

Date: 2026-10-09. Commit audited: `4df7287` on `main`. Read-only: nothing in the product was changed to write this.

Business model assumed: a registered migration agent sends their own prospective client to LogiVisa through a referral link; the client buys the Visa Information Report; the agent earns a commission and receives the client's entered details and the report as pre-screening.

How this was checked: by reading the code, and by running the real agent-PDF generator (`generateReadinessPDF` with `audience: "agent"`) on a synthetic profile. Nothing was run against production and no production data was read, so anything that depends on production rows (how many agents exist, their `commission_rate`, whether the three missing tables now exist) is marked **not verified**.

Assumptions (no questions asked; correct any that are wrong):
1. "Registered migration agent" means an Australian agent on the Migration Agents Registration Authority register. The product has no field that records a registration number (see gap G12), so this is the owner's description, not something the system knows.
2. Commission is a ledger only, paid outside the system, as the code comments say.
3. The agent's own client is also the buyer (the client pays unless Phase 1 adds "agent pays").
4. No legal conclusion is drawn here. Where a legal rule decides the design, it is listed in section 8 for counsel.

---

## 1. Summary

| Question | Answer |
|---|---|
| Does attribution work end to end for a normal paid report? | Yes, with caveats: the agent id travels `?agentId=` → cookie → `user_reports.agent_id` → Stripe metadata → `transactions` row. |
| Is the agent id trustworthy at checkout? | **No.** `POST /api/checkout` accepts `agentId` from the request body (G2). |
| Is consent to share the client's details with the agent collected or checked? | **No consent exists anywhere.** Not in the form, not stored, not checked before the agent portal or the agent PDF shows data (G1). |
| Does the agent see data before the client pays? | **Yes**, including the full report PDF (G3). |
| Can an unapproved or rejected agent receive and see client data? | **Yes** (G4). |
| Is commission paid out by the system? | **No.** It is a ledger row with no status, no payout, no refund handling (G6–G8). |
| Is the agent PDF the information-only report, labelled "automated, not reviewed"? | For AU skilled reports: **yes**. For partner (820/801) and Canada: **no, still the old layout** (section 7). |
| What is the client told? | **Nothing** about the referral, the agent, the commission or the data sharing (section 5). |

---

## 2. How an agent gets a link, and how attribution works

**Becoming an agent**
- `/agent/register` (`app/[locale]/(portal)/agent/register/actions.ts`) creates a `User` with `role = AGENT`, `approvalStatus = "PENDING"`. Fields: name, email, password, phone, company. No MARN / registration number, no terms acceptance, no identity or registration check.
- An admin approves or rejects (`approveAgentAction` / `rejectAgentAction`, `app/[locale]/(portal)/admin/crm/actions.ts:61-85`; legacy copies in `app/[locale]/(main)/admin/agents/actions.ts`). An admin can also create an agent that is approved at once (`createAgentAction`, same file, sets `commissionRate`).

**The link**
- `ReferralLinkCard` (`app/[locale]/(portal)/agent/referral-link-card.tsx`) shows `<origin>/full-check?country=AU&agentId=<agent's User.id>`. It is shown only to an approved agent (dashboard and pool pages check `isApprovedAgent`).
- The "code" is the agent's internal user id (a UUID). There is no short code, no per-campaign code, no vanity link.

**Capture**
- `components/ref-capture.tsx` (mounted in the `(main)` layout, so any page) reads `?ref=` or `?agentId=` and writes the cookie `logivisa_ref` in the browser: `path=/`, `max-age` 30 days, `SameSite=Lax`, not `HttpOnly`, not `Secure`-flagged in code.
- **Last click wins**: every visit with a `ref` overwrites the cookie. There is no first-click rule and no record of earlier referrers.
- The value is not validated when stored; it is validated only when used.

**Resolution at submit**
- `resolveReferralAgent()` (`app/[locale]/(main)/full-check/actions.ts:56-72`) reads the cookie and calls `getAgentUser(id)` (`lib/crm/leads.ts:180`): any `User` with `role = AGENT`. **It does not check `approvalStatus`** (G4).
- At submit (`actions.ts:874-891`) the report row gets `agent_id` and `assigned_via_ref = true`. This is the only moment the cookie is read for reports. Two reports by the same visitor can therefore belong to two different agents if the cookie changed between them.
- The agent is emailed "New Lead Assigned: <client name>" **immediately at submit, before any payment** (`actions.ts:901`, `lib/email/agent-notifications.ts`), unless the client's address is on the owner's test lists.

**Other ways a lead reaches an agent**
- Admin assignment: `assignLeadToAgent` (`admin/crm/actions.ts:23`, `admin/leads/actions.ts:29`) sets `agent_id` on any report; the approved-agent check exists only in the legacy `admin/leads` action. No client involvement.
- Pool claim: approved agents can claim unassigned guide-download leads (`lib/crm/leads.ts:221-255`, `PDF_LEAD_SOURCES`) and then see the person's name, email and phone. That form has no agent-sharing consent either (adjacent to this audit, same gap).

## 3. How attribution survives the form, checkout, webhook and free/admin unlocks

| Stage | What carries the agent | Check |
|---|---|---|
| Form submit | cookie → `user_reports.agent_id` (`createUserReport`, `src/lib/user-reports.ts`) | frozen on the row at creation; later cookie changes do not move it |
| Unlock action (`unlockPremiumReport`, `actions.ts:1197`) | `createCheckoutSession({ agentId: record.agentId })` reads the **database** row | correct |
| `POST /api/checkout` (`app/api/checkout/route.ts`) | `body.agentId` goes straight into Stripe `metadata.agentId` (lines 16, 149) | **trusts the browser** (G2): any caller who can start a checkout for a report (needs the report id and its email) can set any agent id |
| Stripe metadata | `leadId` (= report id) and `agentId` | |
| Webhook (`app/api/stripe/webhook/route.ts`, `handleReportUnlock`, lines 159-212) | `recordCommissionTransaction(session)` reads `metadata.leadId` / `metadata.agentId` | uses the metadata, not the report's `agent_id` (G5); errors are caught and only logged ("best-effort"), so a failed ledger write is silent and Stripe does not retry (G9) |
| Lead-magnet checkout (`app/actions/stripeActions.ts`) | cookie read **at checkout time** (not at form time), `metadata.agentId`; commission via `recordCommissionTransactionForLead` (webhook line ~356) | here a ledger failure returns 500 and Stripe retries (inconsistent with the report path) |
| Free-beta unlock (flag off) | `unlock_method = beta_free`, no Stripe | **no transaction row, no commission** |
| Admin unlock (`admin_free`) | no Stripe | no transaction row, no commission (correct for a test, but the agent portal still counts it as "paid", G10) |
| 100% coupon | webhook runs | a `transactions` row is written with `total_amount = 0`, `commission_amount = 0` |
| Report re-send / webhook redelivery | `transactions.stripe_session_id` is unique, so no second row | but `handleReportUnlock` itself re-runs on a redelivery (unlock update and emails repeat) |

The agent-assignment email, the agent dashboard and the PDF route read `user_reports.agent_id` only.

## 4. Commission: calculation, storage, payout

**Calculation** (`lib/stripe/commission.ts`)
- Rate: `User.commissionRate` (a whole-number percentage set by an admin at creation) ÷ 100; **default 20%** when null (all self-registered agents). Resolved at sale time and frozen on the row.
- Base: `totalAmount = session.amount_total / 100`, which is the **GST-inclusive** amount actually charged (A$21.99 for the report). Commission = `round(total × rate, 2)`; at 20% that is A$4.40 on A$21.99. GST (`gst_cents`) is stored but not deducted; Stripe fees are not deducted.
- Currency: stored as Stripe's (`aud`); the agent portal formats every figure as **USD** (`earnings/page.tsx:14`, dashboard likewise) (G11).

**Storage**: table `transactions` (`prisma/schema.prisma`, model `Transaction`): `lead_id`, `agent_id`, `buyer_email`, `stripe_session_id` (unique), `total_amount`, `commission_rate`, `commission_amount`, `total_cents`, `gst_cents`, `currency`, `created_at`. **No status, no payable date, no paid date, no payout reference, no refund link, no payer type.**

**Statuses**: none. The dashboard calls the sum "Total confirmed commission", but a row is "confirmed" the moment the webhook writes it; there is no cooling-off period, so a refunded or disputed sale still counts.

**Payout**: none in the system. The code comments say agents are not paid through Stripe and the table is a ledger. `grep` finds no refund, dispute or chargeback handling anywhere (`charge.refunded` is not handled), no payout screen, no export, no statement. Whatever payout happens is manual and outside the product. **Not verified**: whether any agreement with agents exists on paper.

**Agent-facing figures** (`lib/crm/transactions.ts`): `totalReferred` = reports with the agent's id; `totalPaid` = those with `is_unlocked = true` (this includes `beta_free` and `admin_free` unlocks); `totalCommission` = sum of `commission_amount`.

## 5. What the agent can see, and what the client is told

**Agent portal** (`app/[locale]/(portal)/agent/*`)
- Dashboard (`agent/dashboard`): every report with the agent's id: name, email, phone, internal tier (Hot / Warm / Cold from `lib/readiness/internal-lead-tier.ts`), source, status, plus the commission table. No purchase status per client, no consent column.
- Lead detail (`agent/lead/[id]/page.tsx`): contact details, a workflow form, notes, and the **full report** as an inline PDF (`/api/agent/lead/[id]/pdf`) plus a Download button, labelled with `AGENT_LEAD_NOTICE`.
- Earnings (`agent/earnings`): counts and the transaction list.

**What decides access**: `requireRole("AGENT")` and `agent_id = caller` (`getAgentLead`, `lib/crm/leads.ts:90`; the PDF route `app/api/agent/lead/[id]/pdf/route.ts`). Nothing else. In particular:
- **No consent check** anywhere (G1). The only "consent" in the product is the Terms checkbox in the unlock modal (`components/premium-feature-gate.tsx:123-131`), which is a client-side gate: it is not stored, has no text version, no timestamp, and the server action does not re-check it. It says nothing about an agent.
- **No payment check**: an agent sees the full report of a client who has not paid (G3). This also bypasses the pre-payment preview gate built for clients.
- **No approval check on the detail page or the PDF route** (G4): only the dashboard, pool and earnings pages show the pending notice; the detail page and the PDF route do not call `isApprovedAgent`. Only the workflow action does (`agent/lead/[id]/actions.ts:18`).

**What the client is told**: nothing. There is no text on `/full-check`, in the unlock modal, on the checkout, in the confirmation or the report email that says the visit came through an agent, that the agent will receive their name, email, phone, entered details and report, or that the agent earns a commission. The Terms page (`terms-content.tsx`) says LogiVisa is not a registered migration agent and does not mention agent referrals, data sharing with agents, or commission. The privacy/legal page (`app/[locale]/(main)/legal/page.tsx`) has no agent-sharing language. **Not verified**: whether a privacy policy exists outside the repository.

## 6. Gaps and bugs

Severity: **S1** privacy / money / trust; **S2** wrong or misleading; **S3** hygiene.

| # | Sev | Gap | Where |
|---|---|---|---|
| G1 | S1 | No consent to share the client's details and report with the agent; nothing stored or checked. Applies to the portal, the PDF, the assignment email and admin reassignment | whole flow; `lib/crm/leads.ts:90`, `app/api/agent/lead/[id]/pdf/route.ts` |
| G2 | S1 | `/api/checkout` trusts `agentId` from the request body, so commission can be attributed to any user id (self-dealing, or diverting another agent's sale). The unlock action passes the database value, but the endpoint is public | `app/api/checkout/route.ts:16,149` |
| G3 | S1 | Agent receives the full report for an unpaid client (and the pre-payment preview gate does not apply to agents) | `getAgentLead`, PDF route |
| G4 | S1 | Pending and rejected agents are attributable (`getAgentUser` ignores `approvalStatus`) and can open `/agent/lead/[id]` and the PDF by URL | `lib/crm/leads.ts:180`, `agent/lead/[id]/page.tsx`, PDF route |
| G5 | S2 | Commission uses the agent in Stripe metadata, not the report's current `agent_id`; an admin reassignment between checkout and payment pays the old agent | `lib/stripe/commission.ts` (`recordCommissionTransaction`) |
| G6 | S2 | Commission is on the GST-inclusive total, gross of Stripe fees; the rule is not written down for agents | `commission.ts:95-96` |
| G7 | S1 | No refund or dispute handling: a refunded sale keeps its commission row | webhook (no `charge.refunded`) |
| G8 | S2 | No status, no payable date, no payout record or process; "confirmed commission" is an unconfirmed ledger sum | `Transaction` model, dashboard label |
| G9 | S2 | Ledger write failure on the report path is swallowed (log only), so a paid sale can have no commission row and nobody is alerted | `webhook/route.ts` ~210-216 |
| G10 | S2 | "Paid" counts `is_unlocked`, so free-beta and admin unlocks count as paid sales | `lib/crm/transactions.ts` (`totalPaid`) |
| G11 | S3 | Agent portal formats AUD amounts as USD | `agent/earnings/page.tsx:14`, `agent/dashboard/page.tsx` |
| G12 | S2 | Agent self-registration records no MARN / registration number or terms acceptance; an admin approves on whatever evidence they have | `agent/register/actions.ts` |
| G13 | S2 | Last-click-wins cookie, non-HttpOnly, JS-set; the agent's internal user id is the public code; a client who later clicks another agent's link moves the next report | `components/ref-capture.tsx` |
| G14 | S2 | Self-referral not blocked (an agent's own email as client earns commission); an admin testing with a ref cookie in the browser creates attributed test leads | `full-check/actions.ts:874` |
| G15 | S2 | The agent is emailed the client's name at submit, before payment and before any consent | `full-check/actions.ts:901` |
| G16 | S3 | Redelivered `checkout.session.completed` re-runs the unlock and the emails; only the ledger row is idempotent | webhook `handleReportUnlock` |
| G17 | S2 | The Terms checkbox is client-side only: no server record of acceptance | `components/premium-feature-gate.tsx` |

## 7. Is the agent PDF the information-only report, labelled "automated, not reviewed"?

Tested by generating agent PDFs with the current code (`audience: "agent"`):

- **AU skilled reports (all targets except partner): yes.** The agent PDF is the same information report as the client's (19 pages for the test profile: details, at a glance, points, visas, states, invitations, costs, process, documents, sources). The notice "Automated information summary based on user-entered details — not reviewed or assessed by a migration agent" (`lib/readiness/agent-lead-notice.ts`, en / tr / zh-Hans) is on the cover and in the footer of every following page (18 occurrences in 19 pages); the information-report disclaimer sentence is on every page (19). No banned verdict or "proceed to application" phrase from `scripts/test-report-banned-phrases.ts` was found. The words "eligible" and "ranked" appear only inside quoted published conditions (for example "eligible bridging visa", "merit-ranked Canberra Matrix"), not as an outcome for the client.
- **Partner visa (820/801) and Canada: no.** These still use the older layout. The agent PDF for a partner profile is 3 pages titled "CONFIDENTIAL READINESS ASSESSMENT", "Visa Information Report … A personalised visa readiness assessment", has an "Assessment Snapshot", "Sponsor Status Eligible NZ Citizen" (a value the client entered, shown as a label), "No immediate sponsorship bar is flagged", and a "Premium Sections" paragraph. The not-reviewed notice is present, but the information-report disclaimer sentence is not, and the wording is not the information-only wording. This is the same older layout the client's partner report uses (already known).
- The agent portal card carries the notice (`agent/lead/[id]/page.tsx`); the admin CRM page carries it too.

Conclusion: for the main product the agent PDF meets the stated label and the information-only form; for partner and Canada reports it does not, and those should not be offered to agents until redone.

---

## 8. Phase 1 proposal (not implemented)

Principles: attribution is decided by the server and frozen at report creation; consent is stored and checked in one place; the agent sees nothing about a client without consent; money has a lifecycle.

### 8.1 Attribution
1. New per-agent short code (`User.referralCode`, unique, random, not the user id). Link `https://www.logivisa.com/full-check?ref=<code>`. Old `agentId=<uuid>` links keep working for a transition period and are mapped to the code server side.
2. Capture in the server (`proxy.ts` or a route handler), setting an **HttpOnly, Secure, SameSite=Lax** cookie, 30 days. Only a code that resolves to an **approved** agent is stored; anything else is dropped.
3. First-click-wins for 30 days (the first valid referrer is kept; a later click by the same browser does not replace it), recorded as `referral_attributed_at` and `referral_code` on the report at creation. Stated rule shown to agents in their terms.
4. Block self-referral (client email equals the agent's email or any address on the agent's account) and ignore the cookie for admin sessions.
5. `/api/checkout` stops reading `agentId` from the body. The webhook reads the agent from the report row, never from metadata, and writes `payer_type`.

### 8.2 Consent (shown only to referred clients)
- A checkbox on the full-check form only when the server resolved an approved agent from the cookie. Text (en / tr / zh-Hans; wording for counsel to approve):
  "I agree that my details and report are shared with **[agent name]**, the registered migration agent who referred me."
  The agent's name comes from the database, never from the URL or cookie.
- Unchecked: the report is still created and can be bought (consent to share is not a condition of buying; to be confirmed with counsel), but no identity is shown to the agent.
- Stored in a new append-only table `referral_consents`: `id`, `report_id`, `agent_id`, `consent_text_version`, `consent_text` (the exact text shown), `locale`, `granted_at`, `withdrawn_at`, `ip_hash`, `user_agent`. A version constant is bumped whenever the wording changes. A withdrawal link in every client email sets `withdrawn_at`.
- **One server-side function**, `canAgentSeeClient(agentId, reportId)`: report's `agent_id` equals the agent, the agent is `APPROVED`, a consent row exists with `withdrawn_at` null, and the text version is current or accepted. Used by every agent-facing read: dashboard list, detail page, PDF route, notes, assignment email, any export. Admin views are unchanged (role-based) but log their access.
- Agent sees without consent: only "Referred client" with a purchase status and the commission (no name, email, phone, tier, report). The assignment email is sent without the client's name until consent exists.
- Existing leads (before this change): no consent record, so they become hidden from agents until a consent request goes to the client. Alternative: grandfather them for a fixed period. Recommendation: do not grandfather.
- Fix the Terms checkbox at the same time: store acceptance server side (same table pattern).

### 8.3 Agent portal
- "My referred clients": one row per report: status (report created / awaiting payment / paid by client / paid by you), consent (granted / not given / withdrawn), commission amount and status, and **the report PDF only if consent is granted and the report is unlocked**.
- Commission lifecycle on `transactions`: `status` (`pending` → `payable` → `paid`, or `void`), `payable_after` (end of a refund window, for example 30 days), `paid_at`, `payout_reference`, `refund_of`. `charge.refunded` and dispute events void the row. A ledger-write failure alerts the operator and Stripe retries.
- Basis stated in the agent terms: percentage of the amount **excluding GST** (to be decided by the owner; the current behaviour is GST-inclusive), AUD display, a monthly statement CSV, and an admin payout screen.
- Fix the USD formatting and the paid / unlocked counting (G10, G11).

### 8.4 Agent pays on the client's behalf
- A "Pay for this report" button in the portal, available only for the agent's own referred report that is locked and has consent. It creates a Checkout session in the agent's name (the agent is signed in; the route checks the session role, the report's `agent_id` and approval), `metadata.payer = agent`.
- The webhook unlocks the report; the client's report-ready email goes to the client's address as usual (the client still owns the report); the agent receives a receipt.
- Commission on an agent-paid report: recommended none (or a stated reduced rate), written in the agent terms, so an agent cannot earn on their own purchase.

### 8.5 Agent terms and onboarding
- Registration collects MARN, registration status and a declaration; an admin verifies the entry against the public register before approval (a recorded check, not a claim by LogiVisa that the agent is registered).
- Versioned terms accepted with a timestamp (`agent_terms_acceptances`): commission rate, basis, payable timing, refund clawback, no onward sharing of client data, data kept only while there is a client relationship, the agent as responsible for their own obligations to the client.
- **Commission disclosure to clients is the agent's responsibility**: the terms say so in plain words, and LogiVisa also shows a short factual notice to the client ("[agent] referred you to LogiVisa and may receive a commission if you buy a report") at the consent step. Whether the agent's own professional obligations require more is for counsel and the agent, not for this product to decide.

### 8.6 Client notices
- On the form (above), on the checkout page and in the report email: that the visit came through the agent, what is shared and when, that sharing needs consent, how to withdraw, and that the agent may receive a commission. Privacy policy and Terms updated.

### 8.7 Tests
Server-side (not UI): consent absent / granted / withdrawn / old text version; pending, rejected and other agents denied on every read path (list, detail, PDF, notes, email); unpaid report never reaches the agent PDF; checkout ignores a body `agentId`; webhook uses the report row; self-referral and admin-session attribution blocked; refund voids commission; agent-paid flow unlocks and emails the client; ledger failure alerts; en / tr / zh-Hans consent text; the partner and Canada agent PDF excluded until redone.

### 8.8 Order of work
1. Close the leaks first (small, independent): G2 (checkout body), G4 (approval on every agent read), G3 (no PDF before payment), G15 (no client name before consent) — these are exposure fixes that do not need the new tables.
2. Consent table, the checkbox, `canAgentSeeClient`, tests.
3. Commission lifecycle, refund handling, statements, AUD.
4. Agent-pays flow.
5. Agent terms, MARN capture, client notices, privacy and Terms text.

### 8.9 Decisions needed from the owner (assumed here, marked)
| Decision | Assumed in this proposal |
|---|---|
| Commission base | excluding GST (current: including) |
| Refund window before a commission is payable | 30 days |
| First-click vs last-click | first-click, 30 days |
| Commission on an agent-paid report | none |
| Existing leads | hidden until consent |
| Can a client buy without consenting to share | yes |

### 8.10 For counsel (no conclusion drawn)
- Wording of the consent and of the client notice; the privacy-law position when an agent receives personal data (and the agent's own obligations as a separate recipient).
- Whether referral commissions paid to or by a registered migration agent need disclosure beyond the notice proposed, and who must give it.
- Whether the product's information-only position is affected when an agent receives the report as "pre-screening" (the notice already says it is not reviewed or assessed).
