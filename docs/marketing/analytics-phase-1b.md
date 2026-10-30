# Analytics Phase 1B: security and data-integrity fixes

Implements the P0 and P1 items of `analytics-integrity-audit.md`. Date: 2026-10-30.

## What changed

| Area | Before | Now |
| --- | --- | --- |
| Where vendors load | `<GoogleAnalytics>` in the `(main)` layout; the Meta Pixel inline in the root layout for every page | One gated component, `components/analytics/analytics-provider.tsx`. Nothing else loads a vendor script (a test enforces it). |
| URLs sent to vendors | Automatic: the real URL, query string and referrer, including the report token `t`, the Stripe `session_id` and `?ref=` | Rebuilt from an allow-list (`lib/analytics/policy.ts`); private routes send nothing; token-bearing URLs on public routes send nothing; referrers sanitised. |
| Report-result page | GA off, **Pixel on** (full URL with the token went to Meta) | Both off; also `Referrer-Policy: no-referrer` on the report-result and checkout routes. |
| Environments | GA: any build with the env var (local dev included); Pixel: `NODE_ENV` only | Production deployment (`VERCEL_ENV`) **and** production host only. Local, Preview and every other host load nothing. Optional separate test property. |
| QA traffic | none | Admin-issued, expiring, reversible QA cookie; loads nothing in that browser. |
| Consent | none | Banner (EN / TR / zh-Hans): GA after "analytics", Pixel after "advertising"; "Privacy choices" link in both footers. |
| Meta Purchase | fired on every visit to `/checkout/success` with a fixed price | Fired only for a payment Stripe confirmed to the server, with the real amount, once per browser, from an isolated frame; GA4 `purchase` added. |
| Funnel | see audit section 7 | `tool_use` (ANZSCO Finder, Skills Assessment Finder, State Nomination, Cost Calculator), Canada calculator start/complete, `lead_magnet_success` (after the backend answered), `checkout_initiated` (after the Checkout session exists). |

## How the URL policy works

`analyticsUrlDecision(url)` returns one of:

- **block**: private routes (`/full-check/result`, `/results`, `/reports`, `/dashboard`, `/admin`, `/agent`, `/sign-in`, `/login`, `/register`, `/journey`, `/api`), a public URL carrying a sensitive key (`t`, `token`, `session_id`, `reportId`, `code`, `state`, `email`, `name`, `phone`, …), or a prefilled `/full-check` form URL. No page view, no event, no location.
- **restricted**: `/checkout/*`. No page view; GA may carry only an explicit event with a path-only location (the verified purchase). The Pixel is off on that page.
- **allow**: the location is rebuilt as `origin + path` plus only `utm_*` (safe tokens, at most 64 characters), six-digit `occupation` and `q` values. `ref`, `agentId`, `fbclid`, `gclid`, free text and the hash are dropped.

The same location is `set` on GA for every event, so GA's automatic URL collection never sees the real query string. The Pixel cannot be told a different URL, so it sends a page view only when the URL needed no change.

Guards: before a navigation to a private URL completes (link click, `pushState`/`replaceState`, back/forward), the provider switches the vendors off, so a vendor's own history listener cannot send it.

## Purchase tracking

Source of truth: the Checkout session the server retrieves from Stripe (`lib/analytics/purchase.ts`). `payment_status === "paid"` and a positive amount; unpaid, failed, expired and free sessions produce nothing.

Transaction id: an opaque HMAC of the payment intent (key from the existing report-access secret), used as GA4 `transaction_id` and Meta `eventID`. It contains no Stripe id. Amount and currency are what Stripe charged.

Repeats: a per-browser, per-vendor ledger blocks reloads. Across devices or after clearing storage, GA4 (per property) and Meta (within its deduplication window) collapse repeated ids. **This is vendor-side best effort, not exactly-once.** There is no server-side vendor event (GA4 Measurement Protocol, Meta Conversions API): they need secrets and consented identifiers that are not configured, so none is sent; the webhooks emit no analytics event, so a retried webhook cannot create a purchase.

The Meta `Purchase` is sent from `public/analytics/purchase-frame.html` (fixed URL, no query, `referrerpolicy="no-referrer"`) because the Pixel always reads `document.location` and the success URL carries the Stripe session id.

## QA mode

1. Sign in as an admin and open `/admin/qa-mode` (any locale prefix works; the admin portal is outside the analytics layout).
2. **Enable QA mode** sets a cookie for 8 hours in that browser. **Disable QA mode** clears it. The page shows the status read from the cookie the browser holds.
3. Verify: with QA mode on, open a public page with the network tab filtered for `google-analytics`, `googletagmanager` and `facebook`; there must be no request. Turn it off, reload, accept consent, and requests resume.

A URL parameter cannot enable it. The cookie only suppresses analytics for that browser; forging it would only hide the forger's own visits. It changes no payment, checkout or sign-in behaviour. Agents are not excluded automatically. No country, city, ISP or IP rule exists.

For analytics testing without touching production data: set `NEXT_PUBLIC_GA_TEST_ID` (a separate GA4 property) and `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true` on a Preview or local environment. It is ignored on production hosts and the Pixel never loads there.

## Decisions that need a human

These are product and legal choices, not engineering facts; the implementation is a conservative default, not a statement of legal compliance.

1. **Opt-in everywhere.** Both tags need an explicit choice in every country (the strictest common standard; Turkey's KVKK and the EU/UK expect prior consent for non-essential cookies; Australia has no cookie-consent rule but the Privacy Act and APPs apply). Decide whether to keep opt-in globally or vary by region.
2. **Banner wording and the privacy page.** Check the "Privacy information" page (`/legal`) actually describes Google Analytics, the Meta Pixel, what is collected and how to withdraw. This audit did not verify that text.
3. **Google Consent Mode.** Implemented as "load GA only after consent" with ad storage and personalisation always denied. Advanced consent mode (cookieless pings before consent) is not used; decide if modelling is wanted.
4. **Meta Conversions API / GA4 Measurement Protocol** for server-side purchases need an access token / API secret and a lawful basis for any user data; not implemented.
5. **Retention and who can access the Meta pixel and GA4 property.**

## Manual configuration (cannot be done from the repository)

GA4
1. Admin → Data streams → web stream → Enhanced measurement → **turn off "Page changes based on browser history events"**. The site now sends its own `page_view` on every route change; leaving this on would double-count (and is the one place the vendor's own history listener runs).
2. Admin → Data collection and modification → **Data redaction → Query parameter redaction**: add `t, token, session_id, reportId, code, state, email, name, phone, ref, agentId`. This is the backstop for any URL that slips past the code policy.
3. Data filters: create **Internal traffic** (`traffic_type = internal`) and activate **Developer traffic**; QA mode now suppresses at the source, so these only matter if you later tag instead of suppress.
4. Mark key events: `calculator_complete`, `assessment_entry_click`, `full_check_submit`, `full_check_complete`, `lead_magnet_success`, `purchase`. Do not mark `checkout_initiated` as the revenue event.
5. Custom definitions (event-scoped): add `tool`, `document` (new) to the existing list in the audit.
6. Unwanted referrals: `checkout.stripe.com`, any OAuth host.
7. Data retention 14 months; Google signals off.
8. Explore: break down by Hostname for the last 90 days to measure the earlier `localhost` / Preview pollution; apply `hostname = www.logivisa.com` until old data ages out.

Vercel
1. `NEXT_PUBLIC_GA_ID`: Production only (the code no longer relies on this, but it removes the id from Preview bundles).
2. Remove `NEXT_PUBLIC_GA_ID` from the local `.env` and `.env.local` (they currently hold the production id; with the new gates local development sends nothing, but the value should not sit there).
3. Optional: `NEXT_PUBLIC_META_PIXEL_ID` (defaults to the current pixel id).
4. Confirm "Automatically expose System Environment Variables" is irrelevant: the code reads `VERCEL_ENV` on the server at build time.

Meta
1. Events Manager → Test events: confirm `Purchase` arrives once with `eventID` and no URL parameters from `/analytics/purchase-frame.html`.
2. Remove or archive earlier `PageView` URLs containing `t=` and review the data-use settings.

## Known residual risks

- **Past data.** Report tokens and session ids already sent to Meta, and GA4 `page_location` values already stored, are not removed by this change. Rotating the report access tokens for reports opened before this fix is a separate decision; tokens live in emailed links.
- **Navigation race.** The provider switches vendors off before a navigation to a private URL completes, but a vendor's own history listener is outside our control; the GA4 query-parameter redaction above is the backstop. The Pixel's own history tracking is disabled in code.
- **Same-origin referrers.** A same-origin `document.referrer` is the previous full URL; the code sanitises what it sends, but the Pixel reads the raw `document.referrer` itself. `Referrer-Policy: no-referrer` on the private routes removes it for navigations from those pages.
- **Purchase de-duplication is not exactly-once** (see above).
- **Events before consent are dropped** (a visitor's first page view is not counted until they choose; the first `page_view` after consent is sent).
- **Preview deployments may still contain the GA id in their bundle.** It is inert there (the host check stops loading).
- The consent banner and "Privacy choices" link appear only on a production host; they cannot be seen locally. Use the optional test property to exercise the flow on Preview.
