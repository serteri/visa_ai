# E2E Verification — Affiliate Cookie → Stripe Checkout → Commission

Covers the flow introduced in the affiliate-attribution fix (commits
`5f71cae`, `c4d8d28`) after the legacy `agent_referrals` table was retired:
`?ref=<agentId>` → `logivisa_ref` cookie → `createCheckoutSession` metadata →
webhook → `Transaction` row (no `UserReport`, no dummy lead).

**Split into two parts.** Steps 2, 4, 5 are fully automated —
`scripts/e2e/test-affiliate-checkout-flow.ts` (`npx tsx
scripts/e2e/test-affiliate-checkout-flow.ts`) tests them directly against
the DB with no browser or live Stripe session needed. Steps 1 and 3 need a
real browser (`components/ref-capture.tsx` is client-only,
`document.cookie` doesn't exist outside one) and the Stripe CLI, so they're
manual, below.

## Prerequisites

- `npm run dev` running locally.
- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed and logged in
  (`stripe login`).
- A real `AGENT`-role user in your local/dev database to act as the
  referrer. The automated script creates and cleans up its own
  (`id: "TEST_AGENT_123"`) — for the manual browser steps below, either
  reuse that exact id while the script's cleanup hasn't run yet, or create
  one that persists via `/admin/crm/agents/create`, then use *its* real id
  in the `?ref=` link (the value must resolve via `getAgentUser()`, i.e. a
  real `User` row with `role = "AGENT"` — an arbitrary string like the
  task's literal `TEST_AGENT_123` only works if a user with that exact id
  exists).

## Step 1 — Confirm the `logivisa_ref` cookie is set

1. Start `stripe listen --forward-to localhost:3000/api/stripe/webhook` in
   one terminal (also needed for Step 3 — leave it running). It prints a
   webhook signing secret starting with `whsec_...`; set that as
   `STRIPE_WEBHOOK_SECRET` in `.env.local` for this session if it differs
   from your configured one.
2. In a browser, visit `http://localhost:3000/en?ref=TEST_AGENT_123` (any
   page under the `(main)` layout works — `RefCapture` is mounted at the
   layout level, not per-page).
3. Open DevTools → Application → Cookies → `http://localhost:3000`. Confirm:
   - A cookie named `logivisa_ref` exists, value `TEST_AGENT_123`.
   - `Max-Age` ≈ `2592000` (30 days), `Path=/`, `SameSite=Lax` — matches
     `components/ref-capture.tsx`'s exact `document.cookie` string.
4. Navigate to a different page (e.g. `/en/full-check`) without the `?ref=`
   param and confirm the cookie **persists** (this is the whole point — the
   referral survives navigation away from the landing page).

## Step 2 — Checkout metadata (automated, see script)

Run:
```bash
npx tsx scripts/e2e/test-affiliate-checkout-flow.ts
```
This directly calls `getAgentUser()` — the exact function
`app/actions/stripeActions.ts`'s `resolveReferralAgentId()` uses to turn the
cookie's raw string value into a verified agent id before it's ever placed
in Stripe metadata — and asserts a spoofed/made-up ref value resolves to
`null` (no commission attributed to a fake agent).

**To see it happen live instead of via the script**, with the cookie from
Step 1 already set in your browser:
1. Go to a campaign paywall page that calls `createCheckoutSession`
   (e.g. `/en/checkout/australia-guide-2026`, once its `slots_remaining`
   is 0 — see `app/actions/leadMagnetActions.ts`) and click "Proceed to
   Payment".
2. In the Stripe Dashboard (test mode) → Payments → find the session just
   created → its `metadata` should show `campaign` **and** `agentId:
   TEST_AGENT_123`.

## Step 3 — Trigger `checkout.session.completed` locally

With `stripe listen` running (Step 1), two options:

**Option A — complete a real test-mode checkout** (most faithful — this is
the only way to get a genuine `session.customer_details.email`, since
Stripe collects it on its own hosted page, not from our code):
1. Click through Step 2's checkout with cookie set.
2. Use Stripe's test card `4242 4242 4242 4242`, any future expiry/CVC.
3. `stripe listen`'s terminal will show the forwarded event and your
   webhook's response (200 expected).

**Option B — synthetic trigger** (faster, but Stripe's fixture won't have a
real `customer_details.email` or your `agentId` unless overridden):
```bash
stripe trigger checkout.session.completed \
  --add checkout_session:metadata[campaign]=australia-guide-2026 \
  --add checkout_session:metadata[agentId]=TEST_AGENT_123
```
Fixture field-override support varies by CLI version — verify the
forwarded payload in the `stripe listen` terminal actually contains both
metadata keys before trusting the result. If it doesn't, use Option A.

Expected webhook route behavior (`app/api/stripe/webhook/route.ts`): PDF
delivery email sent, then a `Transaction` row created directly (see Step 4).

## Step 4 — Confirm the DB write (no dummy `leadId`)

After Step 3, check Prisma Studio (`npx prisma studio`) or query directly:
```sql
SELECT id, lead_id, buyer_email, agent_id, commission_rate, commission_amount, stripe_session_id
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```
Expected: `lead_id` is `NULL`, `buyer_email` is the real card-holder email
from Step 3 Option A (or whatever you set in Option B), `agent_id` is
`TEST_AGENT_123`, `commission_rate`/`commission_amount` are populated from
that agent's `User.commissionRate`. Also confirm **no new row** was added
to `user_reports` — the whole point of the redesign was that this purchase
never creates a placeholder lead.

## Step 5 — Idempotency at the real webhook/HTTP level

`scripts/e2e/test-affiliate-checkout-flow.ts` already proves this at the
function level (two concurrent `recordCommissionTransactionForLead` calls
for one `stripeSessionId` yield exactly one row). To prove it at the actual
HTTP endpoint level too:

1. From the Stripe Dashboard (test mode) → Developers → Events, find the
   `checkout.session.completed` event from Step 3.
2. Note its event id (`evt_...`), then resend it:
   ```bash
   stripe events resend evt_XXXXXXXXXXXX
   ```
3. Resend it a **second** time.
4. Check `stripe listen`'s terminal: the first resend should log
   `[stripe webhook] campaign session already processed, skipping` (see
   `app/api/stripe/webhook/route.ts`'s `hasRecordedTransaction` check) and
   return `200`, same for the second.
5. Confirm in the DB: still exactly **one** `Transaction` row for that
   `stripe_session_id`, and — check your inbox / Resend dashboard — the PDF
   delivery email was sent only **once**, not on every resend. This is the
   part that matters most: the idempotency check runs *before*
   `handlePdfBookPurchase`, so a redelivered webhook event can never
   re-trigger the email.
