# LogiVisa Sprint 2D — measurement and first organic distribution

Checked 2026-10-19/20. Labels: **EXECUTED** (done), **VERIFIED** (observed directly), **PREPARED** (ready, nothing published), **BLOCKED** (needs access I do not have), **DATA NOT AVAILABLE**. Prepared assets are not marketing results. No email, LinkedIn, Facebook, Reddit, paid, bought-link or bulk-content activity took place.

**Conclusion: E — too early / insufficient evidence.** The measurement foundations improved (one real tracking defect found and fixed), but Search Console and GA4 reporting are not reachable from this environment, and no external distribution route was found that is explicit enough to count as verified.

## Search Console status — BLOCKED / DATA NOT AVAILABLE
- No Search Console or GA connector is connected in this session (connectors present: Claude Docs, visualize, Google Drive, scheduled-tasks). The registry offers third-party SEO connectors (Ahrefs, Supermetrics, OpenSEO, Ubersuggest …); none is connected and none is Search Console itself. Signing in to a Google account is not something I do on the user's behalf.
- Property type, verification status, preferred domain, apex/www coverage: **DATA NOT AVAILABLE**. (Ownership is also carried by the static file `public/google036d36ffea7887ed.html`; its presence on production was not re-fetched this sprint.)
- To unblock: either open Search Console in your Chrome and ask me to read it with the Chrome extension, or export the Performance report (28 days, 3 months, with Pages and Queries tabs) as CSV into the repo folder.

## Sitemap — VERIFIED (public) / submission BLOCKED
- URL `https://www.logivisa.com/sitemap.xml` → HTTP 200, 1,888 URLs (checked on production at commit a3a078c; later commits add the 5 pair pages and, with step 8, the cost calculator).
- `/en/` duplicates: **0**. Research tools present: points calculator (australia), ANZSCO finder, skills assessment finder, visa comparison, state nomination — each once.
- Thin-page exclusion intact: 585 English occupation entries against 693 occupations (108 thin pages noindex and not listed).
- Submission, timestamp, discovered-URL count, warnings: **BLOCKED** (needs Search Console). A sitemap being accepted would not mean pages are indexed.

## 28-day and 3-month baselines — DATA NOT AVAILABLE
No first-party performance or URL-Inspection data exists in this environment. The table keeps the structure; nothing is zero.

| Page | Clicks | Impressions | CTR | Avg position | Activated sessions | Notes |
|---|---:|---:|---:|---:|---:|---|
| Carpenter 331212 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | no distinction card; TRA block |
| Chef 351311 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | Chef/Cook card live |
| Electrician General 341111 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | |
| Software Engineer 261313 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | IT card live |
| Developer Programmer 261312 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | IT card live |
| Civil Engineer 233211 | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | accredited/CDR card live |
| Points calculator (AU) | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | |
| ANZSCO finder | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | |
| Skills assessment finder | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | |
| Visa comparison | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | |

Indexed status, Google-selected canonical, last crawl (URL Inspection snapshot, a separate source from performance data): **DATA NOT AVAILABLE**. Per Part 4 no page or title was changed in response to (absent) data.

## GA4 receipt verification — BLOCKED / DATA NOT AVAILABLE
GA reporting (property G-T2J1QC7E20, from the production tag) is not reachable here, so "received by GA" is unverified for every event. Three levels, kept apart:

| Event | In code | Dispatched in production browser (2026-10-19) | Received by GA |
|---|---|---|---|
| occupation_tool_click | yes | **VERIFIED** — dataLayer entry and an `analytics.google.com/g/collect?en=occupation_tool_click&ep.occupation_code=351311&ep.destination=skills_assessment&ep.locale=en` request | DATA NOT AVAILABLE |
| occupation_page_view | yes | **FAILED on production**: never reached the dataLayer on a hard load; console: "@next/third-parties: GA has not been initialized" | DATA NOT AVAILABLE (and, until the fix deploys, the event was not being sent) |
| comparison_page_view | yes | not tested; same mount-time pattern, so affected | DATA NOT AVAILABLE |
| research_continuation_click, assessment_entry_click, professional_help_click, outbound_official_link_click | yes (click handlers) | not individually clicked on production this sprint (click path proven by occupation_tool_click) | DATA NOT AVAILABLE |
| calculator_start, calculator_complete | yes (user actions) | not exercised on production | DATA NOT AVAILABLE |

## GA4 event/parameter issues
1. **Defect found and fixed (EXECUTED, code):** mount-time events (`occupation_page_view`, `comparison_page_view`) fired before the GoogleAnalytics component had initialised gtag and were dropped. `trackEvent` now queues until `window.gtag` exists (200 ms checks for up to 10 s), re-checks the assessment privacy flag at send time, and still passes every parameter through `sanitizeParams`. Test: `scripts/test-analytics-queue.ts` (in CI). Commit `03f13e2` (pushed with step 7 as `c31a98d`). It is live only after that deploy; re-check `dataLayer` for `occupation_page_view` on a hard load afterwards. Every earlier "page views" figure for these two events would have been undercounted.
2. **Test traffic disclosed:** while checking dispatch I used a real browser on the live site: 2 page loads (`page_view`) and 1 `occupation_tool_click` reached GA from that browser (2026-10-19 ~14:55 UTC). Exclude or ignore them in the first reports.
3. **Parameters are safe categorical values only** (allow-list in `lib/analytics/events.ts`): occupation_code (6 digits), locale, subclass (3 digits), calculator, link_host, page_type, destination, source_page_type, source_page_id (6 digits), continuation_stage, entry_source, product_type. No name, email, report id, free text, answers or personal circumstances; tested (`test-assessment-discovery.tsx`, `test-analytics-queue.ts`). The event itself is not sent at all on `/full-check/result` or on assessment URLs carrying personal query keys (privacy boundary).
4. **Custom dimensions worth registering (event-scoped, 5 at most):** `destination`, `entry_source`, `continuation_stage`, `source_page_type`, `occupation_code`. Do not register `locale` (GA has language), `subclass`, `link_host` or `calculator` yet. `landing_type`, `resource_type`, `research_stage` do not exist in code and are not proposed: campaign attribution for external links comes from the UTM parameters GA records automatically.

## Live verification debt (Part 15)
- Software Engineer distinction card, en / tr / zh-Hans: **VERIFIED** live (card present in all three; also Chef, Developer Programmer, Civil Engineer).
- Canonical / hreflang after cc5324d: **VERIFIED** (`/tr/occupations/261313-software-engineer`: `<html lang="tr">`, self canonical, hreflang en / tr / zh-Hans / x-default).
- Sitemap count: **VERIFIED** 1,888 (see above).
- Assessment result → state nomination link: **VERIFIED in code with a synthetic fixture** (`scripts/test-assessment-continuation.tsx`, in CI): five research links plus the official register in en / tr / zh-Hans, none for Canada. Not verified on a production result page (that needs a real report; none was created).

## Distribution route research (Part 8–9) — EXECUTED, nothing submitted
| Organisation | Exact page(s) checked | Finding | Classification |
|---|---|---|---|
| ACS | acs.org.au/skilled-migrant.html; acs.org.au/contact-us.html | No resource-suggestion route. Contact page lists general enquiries, Migration Skills Assessment enquiries (assessment@, "refer all skills assessment enquiries to our head office"), media enquiries (named Director of Corporate Affairs and Public Policy), complaints, ethics reporting. "Professional Partner Program" is named but not described. | EDITORIAL CONTACT POSSIBLE (media/corporate affairs only); unsolicited resource placement not invited |
| Engineers Australia | engineersaustralia.org.au/migrants/migration-agents | The only contact route is for migration agents choosing an assessment pathway. No suggest-a-resource, partnership or content route. | NO SUITABLE ROUTE |
| Jobs and Skills Australia | jobsandskills.gov.au/engage/connect-with-us, /contact-us | Pages are in search results ("We welcome your thoughts, feedback or questions on any aspect of our work", online enquiry form); direct page fetches timed out twice, so this is from the search summary. A feedback form is not a resource-submission route. | EDITORIAL CONTACT POSSIBLE (general feedback form; unverified by direct fetch) |
| Study Australia (Austrade) | studyaustralia.gov.au/en/about-us | No contact route on the page; "Agent Hub" and the Marketing Toolkit serve registered agents/providers; enquiries address only in a search snippet. | NO SUITABLE ROUTE |
| TAFE / university career resources | none specific found | Searches found provider pages and the Department of Education's state-agency directory, not a submission mechanism; each institution is a separate, unverified decision. | NO SUITABLE ROUTE (none credible found) |

No route qualifies as **VERIFIED SUBMISSION ROUTE**. A generic contact form is not labelled a placement route. No PAID / REJECT route was encountered (the Professional Partner Program's terms are unknown, so it is not pursued).

## Three best external opportunities (Part 10)
None meets the bar. All three are **NOT WORTH PURSUING** as placement requests:
1. ACS media/corporate affairs — a media contact, not a resource directory; an unsolicited "please link our tool" request to the assessing authority would be out of place.
2. Jobs and Skills Australia general feedback form — feedback channel, not a listing.
3. Engineers Australia agents' contact — for agents asking about pathway selection; not for third-party tools.
A better use of effort than these cold requests is waiting for Search Console to show which pages already attract queries.

## First video — Chef 351311 short (PREPARED, not recorded or published)
- **Title:** Chef (ANZSCO 351311): the code is only the start
- **Hook, first 3 s (on screen and spoken):** "Chef is ANZSCO 351311. That code answers one question."
- **Script (~40 s, ~100 words):** "Chef is ANZSCO 351311. That code answers one question: what the occupation is called. Research has more steps. Trades Recognition Australia is listed as the assessing authority, and TRA publishes more than one assessment program, so read the original guidance and its dates. Chef and Cook are separate occupations in ANZSCO, in different unit groups, so read both descriptions side by side. LogiVisa puts the occupation, the TRA references and those next steps on one source-linked page. It is information, not advice. Link in the description."
- **Screen sequence (all on https://www.logivisa.com/occupations/351311-chef; record at 1080×1920 with the page zoomed to fit):** 0–3 s page header "Chef (351311)" · 3–10 s scroll to "Skills assessment: Trades Recognition Australia (TRA)" · 10–18 s highlight the program list and the source/date line · 18–27 s "Chef or Cook? Two separate ANZSCO occupations" card, then click through to the Cook page · 27–35 s back to Chef, scroll the fact table (source and "Data verified" columns) · 35–40 s "Continue your research" links.
- **Subtitles:** the script above, one sentence per caption, same wording; burn in.
- **Description:** "ANZSCO 351311 is Chef. This short shows where the occupation page points next: the TRA assessment information, the Chef vs Cook distinction, and the original sources with their dates. General information only, not migration advice. https://www.logivisa.com/occupations/351311-chef?utm_source=youtube&utm_medium=video&utm_campaign=occupation_research&utm_content=chef351311"
- **CTA:** "Link in the description." (spoken and on the last caption)
- **Tracked URL:** `https://www.logivisa.com/occupations/351311-chef?utm_source=youtube&utm_medium=video&utm_campaign=occupation_research&utm_content=chef351311`
- **Thumbnail concept:** dark background, large "351311", underneath "Chef ≠ Cook", small "ANZSCO → TRA → sources"; no faces, no claims.
- **File name:** `logivisa_chef-351311_short_v1_2026-10-20.mp4` (thumbnail `…_thumb.png`).
- **Publishing:** BLOCKED — no authenticated YouTube capability and no explicit publishing approval; nothing posted. Wording check: no eligibility language, no "best visa", no personalised advice.
- **Tracking:** no new analytics architecture; the existing `utm_*` parameters are read by GA's standard acquisition reports.

## Weekly scorecard (structure; all values DATA NOT AVAILABLE until Search Console / GA are reachable)
| Block | Metric | Source | Value |
|---|---|---|---|
| Search | indexed pilot pages (of 10) | GSC URL Inspection | DATA NOT AVAILABLE |
| Search | impressions, clicks, CTR, avg position, top queries | GSC Performance | DATA NOT AVAILABLE |
| Research activation | sessions with occupation_tool_click ÷ occupation_page_view sessions | GA4 | DATA NOT AVAILABLE |
| Research activation | research_continuation_click sessions; calculator_complete → further research | GA4 | DATA NOT AVAILABLE |
| Research activation | assessment_entry_click; assessment completions; professional_help_click | GA4 / DB | DATA NOT AVAILABLE |
| Distribution | verified placements; referral sessions; activated referral sessions | manual + GA4 | 0 verified placements (none found); sessions DATA NOT AVAILABLE |
| Video | views, link clicks (utm_medium=video), activated sessions | YouTube + GA4 | DATA NOT AVAILABLE (nothing published) |

## Evidence-based decision
**E — Too early / insufficient evidence.** Search, external distribution and video all lack first-party data. Foundations established: public sitemap verified; page-load tracking defect found and fixed; safe-parameter review and a 5-dimension plan; five external routes checked with honest classifications; one video package ready. Next evidence-producing steps, in order: (1) deploy the analytics fix and confirm `occupation_page_view` in the dataLayer; (2) connect Search Console and submit the sitemap; (3) export the 28-day baseline; (4) publish the Chef short only when you choose to.
