# Marketing readiness sprint 1

## Production baseline — 17 October 2026

- All 20 inspected routes answered final HTTP 200; apex redirects to canonical `www.logivisa.com`.
- Homepage search routes into report intake; unsupported usage/compliance badges and hardcoded testimonials appear. Research CTA hierarchy is absent.
- Occupation pages already have shared sourced data, dates, thin-page noindex and correct prefixless canonicals. Uncommitted TRA enrichment and click tracking are present locally; preserve and integrate those relevant changes.
- Tool/visa English canonicals point to redirecting `/en/` URLs; tool titles duplicate `LogiVisa`. Most have only three hreflang entries.
- Sitemap has 1,779 entries but omits skills assessment, comparison and the direct Australian calculator route. Robots references the sitemap and permits occupation crawling.
- State tool ranks matches against points with a May 2026 dataset, unsourced competition/processing figures and constructed source URLs. Replace predictions with dated references and clear coverage limits.
- Skills finder has 21 directory entries and 91 explicit mappings, not the advertised 500+ mapped occupations. Preserve fee data and state missing coverage honestly.
- GA loads; existing occupation/calculator/comparison/outbound events exist. Actual GA dashboard receipt is not available from public responses.

Baseline snapshots: `scratch/marketing-sprint/before/`. Implementation, checks and deployment results will be recorded below.

## Implemented

- Homepage now leads with Australian visa/occupation research: occupation search → ANZSCO finder, secondary direct Australian calculator, tertiary visa comparison. Removed report-first sections, hardcoded testimonials, unsupported compliance/usage/realtime badges and duplicated homepage footer. Existing paid products/payment flows are untouched and remain reachable elsewhere.
- Shared occupation template: sourced assessment references (retaining and integrating the existing TRA work), authority review dates, historical state-list context and official links, contextual tool cards, same-unit-group related occupations and optional official-agent-register help. Corrected nested headings that caused browser hydration failures. No separate pilot-only template.
- Skills finder carries occupation-code context, links back to occupation pages and onward to points/checklists, uses coverage-gap wording, corrects Chef/Cook to TRA with OSAP notes, and suppresses 22 unresolved legacy mappings. Current supported finder coverage: 69 mappings; directory cards without supported mappings are hidden. Legacy raw records remain for reconciliation and regression tracking.
- State tool now shows dated historical list references and official criteria, including NSW unit-group scope and ACT inferred coverage. Removed point-based ranking, open/closed predictions, competition figures and unsourced processing times. 2025–26 data is explicitly historical; it is not relabelled current.
- Visa continuation differs by subclass: 189/190/491 → points/occupation/comparison; 482 → occupation/assessment; 500 → official Student visa document guidance. The skilled checklist does not claim subclass-500 coverage.
- Thirteen tool/visa metadata implementations use the shared public URL helper, with prefixless English canonicals, complete hreflang/x-default and one brand suffix. Added five intentional research destinations to sitemap in all three locales; retained thin-page exclusions and robots behaviour.
- Preserved existing GA events; integrated occupation-tool clicks and added professional-help clicks. Parameters use coded fields and value allow-lists; no form values, free text, points totals or report contents are added. Browser assertions check one event per click. GA account-side receipt is not verified.

## Verification

- Typecheck passed. Production build passed (2,091 static routes); one existing Turbopack file-tracing warning remains.
- New marketing regression: 54 locale/metadata/occupation cases, sitemap membership, trust wording, source links, heading structure, unresolved-mapping suppression and analytics parameter safety.
- Relevant suites passed: occupation SEO, TRA block, visa comparison, tool-page fees, occupation redirects/matching, fee provenance, state status precedence, nomination availability, no-verdict routes, content dates and translation checks. The TRA test's optional local-PDF comparison was skipped because the source-PDF/tool prerequisite was unavailable; committed source-data checks passed.
- Browser checks passed against development and production builds: 26 route/viewport cases at 1440/820/390px, Turkish/Chinese smoke checks, a long occupation name, search navigation, Chef/TRA continuation, unresolved mapping, state references and both click events. No horizontal overflow or uncaught browser errors. Screenshots/results: `scratch/marketing-sprint/browser-built/`.
- Official state entry-point checks: ACT/NSW/QLD/SA/WA returned 200; NT/TAS/VIC returned bot/access 403, so their external content was not independently audited in this sprint. No inferred government hostnames are constructed.

## Boundaries

No marketplace, agent outreach, new languages, ads, bulk article generation or payment changes. No individual visa/nomination verdicts introduced. Missing ANZSCO edition details are not invented. Unresolved authority records and a full current-state data refresh remain deferred; the public promises have been reduced accordingly. Earlier research documents and unrelated scratch/audit files are excluded from the sprint commit.

## Deployment

Pending final commit/push and live verification. Production origin redirects from `logivisa.com` to `www.logivisa.com`; verification will check that final host and `/api/version` commit identity.
