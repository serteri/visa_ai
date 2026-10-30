# Analytics integrity audit — Marketing Phase 1

Date: 2026-10-29 · Repository: `serteri/visa_ai` · Commit audited: `2bfb917` · Scope: audit only (no code, SEO, routing, ISR or deployment changes were made).

What was inspected: the repository (layouts, `lib/analytics/events.ts`, `components/analytics/*`, every `trackEvent` call site, the checkout success page, the lead-magnet forms), the three local env files (variable names and equality only, never values), and the live production HTML. What could **not** be inspected: the Vercel project's environment-variable scoping (the Vercel CLI is not installed or authenticated here), the GA4 property's admin settings, and the Meta Events Manager. Those items are marked *unverified* and are in the manual checklist.

## 1. Findings in priority order

| # | Severity | Finding |
| --- | --- | --- |
| 1 | **High (privacy)** | The Meta Pixel is mounted in the root layout and is **not covered by `AssessmentPrivacyBoundary`**. GA is switched off on `/full-check/result` and on prefilled `/full-check?…` URLs because report links carry access credentials (`/full-check/result?reportId=…&t=<token>`), but the Pixel still fires `PageView` there and sends the full page URL, including the token, to Meta. |
| 2 | **High (data integrity)** | Local development uses the production GA4 property. `.env` and `.env.local` hold the same `NEXT_PUBLIC_GA_ID` as the live site (SHA-256 prefix `9013cbdb` matches the measurement ID in the production HTML, `G-T2J1QC7E20`). `npm run dev` therefore mounts GA and sends events to production; React StrictMode in dev also double-fires mount events. |
| 3 | **High (data integrity)** | The Meta `Purchase` event fires on every visit to `/checkout/success`, with the fixed price, even when the Stripe session was **not** verified (`downloadHref === null`), and again on every reload. (The free-promo bypass in `app/api/checkout/route.ts` was cancelled, so it is no longer a source of unpaid `Purchase` events; a direct visit to `/checkout/success?product=premium` is.) It is the only revenue-style signal and it can be inflated by anyone opening `/checkout/success?product=premium`. There is no GA4 `purchase` event. |
| 4 | Medium | The Meta Pixel is gated only by `NODE_ENV === "production"`. Vercel Preview deployments are also `NODE_ENV=production`, so previews send `PageView` to the production pixel (hardcoded ID `1499026238624549`). No code reads `VERCEL_ENV` to separate environments. |
| 5 | Medium | GA mounts whenever `NEXT_PUBLIC_GA_ID` is set; it is inlined at build time. Whether Vercel Preview builds receive the variable is *unverified*. The production-target pull (`.env.production.local`) shows the variable as a "sensitive" value, so it is configured for Production. |
| 6 | Medium | `/checkout/success?session_id=cs_live_…&reportId=…` is sent to GA as `page_location` (the page is not excluded by the privacy boundary) and to Meta. The Stripe session id and report id are in the URL. |
| 7 | Medium | No consent handling: no banner, no consent mode (`gtag('consent', …)`), no opt-out other than the private-page flag. Both GA and Meta load for every visitor. Privacy copy was not verified. |
| 8 | Medium | No internal-traffic mechanism. Admin pages under `app/[locale]/(main)/admin/*` are inside the GA-mounted layout, so admin and QA visits are counted. QA browsing of production (for example from the in-app browser) is also counted; the repo's Playwright scripts block GA with a route abort, which is good practice. |
| 9 | Low | `LeadMagnetForm` pushes `{ event: "lead_magnet_inline_success", document_requested }` onto `window.dataLayer`. There is no GTM, and gtag ignores plain objects, so the event is never sent. It contains no personal data. |
| 10 | Low | Missing funnel instrumentation (section 5). |

No personal data was found in any custom event (section 6).

## 2. Current analytics architecture

- **GA4** only, through `@next/third-parties/google` `<GoogleAnalytics gaId>`. No GTM, no Vercel Analytics, no Clarity/PostHog.
- Mount point: `app/[locale]/(main)/layout.tsx`, only when `NEXT_PUBLIC_GA_ID` is set. Inside it, `AssessmentPrivacyBoundary` wraps `GoogleAnalytics`, `OutboundLinkTracker`, `ResearchContinuationTracker` and `AssessmentEntryTracker`.
- Not mounted: `app/[locale]/(portal)` (admin CRM and agent portal), `app/[locale]/widget/*`, API routes. `(main)/admin/*` **is** inside the mounted layout.
- **Measurement IDs:** one GA4 ID in code paths (env-driven): `G-T2J1QC7E20` in production HTML (a public value). The Meta Pixel ID `1499026238624549` is hardcoded in `app/[locale]/layout.tsx` and in the `<noscript>` image.
- **Event helper:** `lib/analytics/events.ts`. `trackEvent(name, params)` takes a typed name from a fixed list, runs params through `sanitizeParams` (a per-key allow-list with value validation), queues events until `window.gtag` exists (poll 200 ms, up to 10 s), and drops events when `window["ga-disable-<ID>"]` is set. Tests: `scripts/test-analytics-queue.ts` (`npm run test:analytics-queue`).
- **Meta Pixel:** inline script in the root layout, `NODE_ENV === "production"` only; `fbq('track','PageView')` once at init; `fbq('track','Purchase')` from `app/[locale]/(main)/checkout/success/success-client.tsx`.
- **Automatic GA4 collection** also captures `page_location` and `page_referrer` with query strings; that is where the URL-borne identifiers in findings 1 and 6 come from.

## 3. Environment separation

| Environment | GA4 | Meta Pixel | Result |
| --- | --- | --- | --- |
| Production (`www.logivisa.com`) | `G-T2J1QC7E20` from the Production env var | production pixel | Intended. |
| Local `npm run dev` | **Mounts, same ID as production** (`.env`, `.env.local`) | not loaded (`NODE_ENV=development`) | **Dev traffic pollutes the production property.** |
| Local `next build` + `start` | same ID if `.env` is read | loaded (`NODE_ENV=production`) | Pollutes both. |
| Vercel Preview | *Unverified:* mounts if the variable is scoped to Preview | **Loaded** (`NODE_ENV=production`, no `VERCEL_ENV` check) | Previews send to the production pixel; GA depends on env scoping. |
| Playwright QA scripts (`scripts/check-*-browser.mjs`) | blocked by route abort | not blocked | GA safe; pixel not blocked. |

The only environment-aware code is `app/api/version/route.ts`, which reports `VERCEL_ENV`. Nothing in the analytics path does.

## 4. Duplicate-tracking risks

- **Script init:** one `<GoogleAnalytics>` mount; it is unmounted and remounted when the privacy boundary toggles (public → private → public page). `next/script` de-duplicates by id, so a second init is not expected, but this should be confirmed in DebugView.
- **`page_view`:** the code never sends a manual `page_view`. Single-page navigations rely on GA4 enhanced measurement's "page changes based on browser history events". Make sure that setting is on and no other tag sends `page_view`. The custom `occupation_page_view` and `comparison_page_view` are separate event names, not duplicates, but they double the volume next to `page_view` on those pages.
- **React StrictMode (dev only):** mount-time events (`occupation_page_view`, `comparison_page_view`, `PageViewTracker`) can fire twice in `npm run dev`, and they go to production (finding 2).
- **Click listeners:** four delegated capture listeners (outbound, research continuation, assessment entry, occupation tool click). Occupation pages are excluded from the research-continuation listener, so `professional_help_click` is not double-counted. A single click on an official-source link that also carries `data-tool-destination` can emit two different events by design.
- **Meta:** `Purchase` repeats on reload and on revisits (no de-duplication, no verification). The Pixel may also auto-track history changes (*unverified*).

## 5. Existing funnel events

All events pass `sanitizeParams`; "GA key event?" is whatever is configured in GA4 (*unverified*).

| Event | Trigger (file) | Parameters | Notes |
| --- | --- | --- | --- |
| `occupation_page_view` | mount of an occupation page (`occupation-view-tracker.tsx`) | `occupation_code`, `locale` | |
| `occupation_search_start` | first focus of the hub search box (`occupation-hub-events.tsx`) | `locale` | The query typed is never sent. Only on `/occupations`. |
| `occupation_result_click`, `occupations_to_pdf_click`, `official_occupation_list_click`, `skills_assessment_click_from_occupations`, `assessment_click_from_occupations` | hub link clicks | `locale` | |
| `calculator_start` / `calculator_complete` | first answer / core factors answered (`points-calculator-client.tsx`) | `calculator=australia_points`, `locale`, `subclass` | No scores or answers sent. Australia only. |
| `comparison_page_view` | visa comparison pages | `locale`, `page_type` | |
| `occupation_tool_click` | link with `data-tool-destination` on an occupation page | `occupation_code`, `destination`, `locale` | |
| `research_continuation_click` | visa/tool/guide links | `source_page_type`, `subclass`, `destination`, `continuation_stage`, guide slug fields | |
| `professional_help_click` | `data-professional-help` link | `source_page_type`, `source_page_id`/`subclass`, `locale` | |
| `outbound_official_link_click` | click on a `*.gov.au` or `data-official-source` link | `link_host`, `locale` | Host only. |
| `assessment_entry_click` | click on a link to `/full-check` | `entry_source`, `locale` | Fixed vocabulary. |
| `full_check_start` / `full_check_submit` / `full_check_complete` | first field touch / form submit / report created | `locale` | Fired on pages the privacy boundary may disable (see below). |
| `pdf_download` | download of the **paid assessment report PDF** (`full-check-waitlist-form.tsx`) | `locale` | Name is misleading: it is not a lead-magnet download. |
| `report_unlocked` / `checkout_initiated` | unlock success / paid checkout about to start (`premium-feature-gate.tsx`) | `locale`, `product_type=premium` | `checkout_initiated` only when paid checkout is enabled. |
| `occupation_pdf_lead_start` / `occupation_pdf_submit` / `occupation_pdf_to_search_click` | occupation PDF page (`occupation-pdf-events.tsx`) | `locale` | `occupation_pdf_submit` fires on form submit, not on server success. |
| `site_guide_*` (impression, open, quick action, route click, AI hand-off, dismiss) | Site Guide (`lib/site-guide/analytics.ts`) | registry ids, `country`, `interaction_type` | `free_text` is a type only; the typed text is never sent. |
| Meta `PageView` | root layout | URL (automatic) | See finding 1. |
| Meta `Purchase` | checkout success page | `value`, `currency=AUD`, `content_name` | See finding 3. |

Privacy-boundary effect: GA is disabled on `/full-check/result` and on `/full-check` URLs that carry prefilled query parameters, so `full_check_complete` and `pdf_download` can be dropped by design on the pages where they fire. That is a deliberate privacy trade-off, but the funnel numbers will understate completion.

## 6. Personal information check

- **Custom events:** clean. `sanitizeParams` accepts only the 18 allow-listed keys, rejects values longer than 64 characters or containing `@` or whitespace, and restricts several keys to fixed vocabularies; `scripts/test-analytics-queue.ts` asserts that `name`, `answers` and free text never reach `gtag`. No call site passes an email, name, typed query, score, questionnaire answer or report content. Occupation codes and subclass numbers are not personal.
- **Automatic parameters:** not clean. `page_location` and `page_referrer` include query strings, so identifiers can leak through URLs: Stripe `session_id` and `reportId` on `/checkout/success` (GA and Meta), and the report access token `t` on `/full-check/result` (Meta only, because GA is blocked there).
- **Inert `dataLayer` push:** `lead_magnet_inline_success` carries `document_requested` (a document id), no personal data, and is never transmitted.

## 7. Missing instrumentation

- Skills Assessment Finder, ANZSCO Finder, State Nomination, Cost Calculator: no usage events at all (only generic link clicks through `data-tool-destination`).
- A lead-magnet **success** event (server confirmed) for every PDF form, including the occupation PDF and the guide downloads; today the occupation PDF fires on submit and the other forms fire nothing.
- A GA4 `purchase` event (ecommerce) for a verified Stripe payment, ideally server-sent from the Stripe webhook, with the same de-duplication key as the Meta event.
- A verified-purchase gate for the Meta `Purchase` event and de-duplication per session.
- Calculator coverage beyond Australia (Canada calculator emits nothing) and a calculator-to-assessment continuation event.
- An `environment`/`hostname` and `traffic_type` event parameter so internal and non-production traffic can be filtered.
- Consent state.

## 8. Internal traffic exclusion: recommended method (not implemented)

Requirements: explicit, opt-in, no hardcoded IP, no effect on ordinary visitors, no country or city exclusions.

1. **Opt-in browser flag.** Visiting any page with `?lv_internal=1` stores `lv_internal=1` in `localStorage` (and `?lv_internal=0` clears it). It is harmless: it only affects the visitor's own tracking, so it needs no secret. While set, the site sets `traffic_type=internal` on the GA4 config (and suppresses the Meta Pixel). The flag is read before GA initialises.
2. **GA4 side:** create the **Internal traffic** data filter on the `traffic_type` parameter, test it, then activate it. Events stay visible in DebugView while testing and drop out of reports once the filter is active. Prefer tagging over `ga-disable`, which makes the tagged data unrecoverable and untestable.
3. **Automatic tagging of signed-in staff.** The server already knows admin and agent roles; tag those sessions `traffic_type=internal` without any manual step. Admin pages should never be counted.
4. **Non-production environments:** send `debug_mode=true` (and the `traffic_type`) when `VERCEL_ENV !== "production"` or the hostname is not `www.logivisa.com`; the GA4 **Developer traffic** filter excludes `debug_mode` traffic. Better still, give Preview and Development a separate GA4 property, or no ID at all, and scope `NEXT_PUBLIC_GA_ID` to Production only.
5. **IP-based GA4 rules** ("Define internal traffic") may be added in the GA4 UI for a static office IP only. They must not live in the repository, and dynamic or mobile IPs make them unreliable.
6. **Scripted QA** should keep blocking `google-analytics.com`, `googletagmanager.com` and `connect.facebook.net` (as `scripts/check-*-browser.mjs` already do for the first two).

## 9. Recommended implementation order (needs approval)

1. Close the Meta privacy gap: apply the same private-page boundary to the Pixel, and strip query strings (or block the Pixel) on `/full-check/*`, `/checkout/success` and any URL carrying tokens.
2. Fire Meta `Purchase` (and a GA4 `purchase`) only after the Stripe session is verified, and once per session.
3. Stop local dev and non-production deployments sending to production: remove the production ID from `.env`/`.env.local`, scope the Vercel variable to Production, gate the Pixel on `VERCEL_ENV === "production"` and the production hostname.
4. Implement the opt-in internal-traffic flag and staff auto-tagging.
5. Add the missing funnel events (section 7) and a server-confirmed lead-magnet success.
6. Decide on consent handling (banner or consent mode) for GA and Meta, and confirm the privacy page describes both.

## 10. GA4 dashboard settings requiring manual configuration

Admin → Data collection and modification, unless noted. These cannot be set from the repository.

1. **Data stream → Enhanced measurement:** keep "Page changes based on browser history events" **on** (it is what produces SPA `page_view`s). Review "Outbound clicks" and "File downloads": they overlap with `outbound_official_link_click` and the PDF flow and add URLs.
2. **Data filters:** create **Internal traffic** (match `traffic_type = internal`) in *Testing*, verify in DebugView and Explore, then set to *Active*. Turn the **Developer traffic** filter *Active* once non-production traffic sends `debug_mode`.
3. **Define internal traffic** (Data streams → Configure tag settings): optional IP rules for a static office IP, entered only in the UI.
4. **Data retention:** set event data retention to 14 months (the default is 2).
5. **Google signals and ads personalisation:** keep off until a consent mechanism exists; review "Data collection" toggles.
6. **Key events:** mark `calculator_complete`, `assessment_entry_click`, `full_check_submit`, `full_check_complete`, `report_unlocked`, `occupation_pdf_submit` (after the success fix), and `purchase` once it exists. Do not mark `checkout_initiated` as the revenue conversion.
7. **Custom definitions (event-scoped):** `occupation_code`, `locale`, `subclass`, `calculator`, `destination`, `entry_source`, `page_type`, `source_page_type`, `source_page_id`, `continuation_stage`, `link_host`, `source_slug`, `destination_type`, `destination_slug`, `country`, `interaction_type`, `product_type`, `source_type`. Add `traffic_type` and `environment` when they are introduced.
8. **Unwanted referrals** (Data stream → Configure tag settings → List unwanted referrals): add `checkout.stripe.com` and any OAuth sign-in host so payments and sign-in do not restart sessions or steal attribution.
9. **Hostname check, right now:** in Explore, break down events by *Hostname* for the last 90 days to measure how much `localhost` and preview-host traffic is already in the production property, and apply an exploration filter `hostname = www.logivisa.com` until the filters above are active.
10. **Look for leaked identifiers:** in Explore, search `page_location` for `session_id=`, `reportId=` and `t=`; this sizes finding 6 and shows the retention of those URLs in GA.
11. **Vercel (Project → Settings → Environment Variables):** confirm `NEXT_PUBLIC_GA_ID` is scoped to Production only; the Development and Preview scopes should be empty or point to a separate property.
12. **Meta Events Manager:** check the Test Events tool, the domain verification and the event deduplication settings; review events received from Preview hostnames and the URLs stored for `/full-check/result`.
