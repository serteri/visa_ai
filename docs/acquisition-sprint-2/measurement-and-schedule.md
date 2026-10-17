# Measurement and two-week execution

## Status and evidence boundary

Instrumentation/link preparation: EXECUTED — production commit ab306d3 verified; collection/results: DATA NOT AVAILABLE until first-party reports are accessible. No outreach/post distribution has been executed. Existing raw Google auto-pageviews may include query strings; do not share sensitive URLs. Custom events send only allowlisted route categories, codes and destinations. No names, emails, visa circumstances, form answers or points totals are added.

## Acquisition classification

Use GA4 **session** source/medium, not first-user source or the source of each individual event. Apply fixed pilot source matches first: agent_partner + referral; complementary_partner + referral; linkedin + social. A valid campaign also has resource_pilot and nonpersonal content ID P01–P30 / C01–C15 / post1–post3. Google organic uses google / organic. Direct requires (direct) / (none). Other/unassigned or missing evidence = unknown. Do not reclassify untagged visits as partners from a suspected share. Do not label unknown as direct. Never append campaign tags to internal links. Native session attribution preserves the acquisition relationship through internal navigation. See [Google's GA4 Traffic acquisition documentation](https://support.google.com/analytics/answer/12923437) and [traffic-source scopes](https://support.google.com/analytics/answer/11080067).

Landing type derives from the first page path in the session after removing an existing en/tr/zh-Hans prefix and query: /occupations/* = occupation; /tools/* = tool; /visas/NNN = visa; / = homepage. Other pages = other/outside the primary denominator. The professional resource page is reported separately as resource, with its first transition to an in-scope research page; do not silently label it a tool. Any GA sessions with missing landing page remain unknown.

## Qualified and activated sessions

“Qualified” is an operational research-session denominator, not visa eligibility: observed non-bot/non-internal sessions landing on one of the six pilot occupation pages, the four pilot tools, relevant visa pages or the homepage. Show occupation, tool, visa and homepage breakdowns separately so homepage intent does not distort tool comparisons. Report all resource-landed sessions as a separate professional-review funnel; once one enters an in-scope resource, report its continuation alongside that funnel, without rewriting its landing type. Do not infer Australian-migration interest from country alone. Show country/device separately when available.

Activated session = a distinct qualified session with at least one occupation_tool_click, professional_help_click, or research_continuation_click. For the new continuation event, visa_to_tool, tool_to_tool and calculator_complete_to_research are separate fixed stages. Count a session once even if it triggers several. The strongest strict subset requested by the brief excludes generic tool_to_tool unless it follows a completed calculation; report this strict subset separately. Occupation state-reference/document clicks may be retained as broader continuation but show destination breakdowns.

calculator_start and calculator_complete are funnel diagnostics; **completion alone does not meet completion → further research**. comparison_page_view alone is not activation. An occupation→comparison click is activation; a direct landing at comparison is only a landing. Report link clicks as continuation intent, not confirmed destination engagement or outcomes.

In a GA4 Exploration use session segments matching those events, filtered to qualified sessions, then session source/medium × landing page. The new continuation_stage parameter needs an event-scoped custom dimension to appear as a named breakdown in reporting; a top-level event segment can still identify research_continuation_click without that dimension. No GA admin changes have been made without access. If historical raw export supports event sequencing, it may establish older calculator follow-ons; otherwise mark unavailable. Session custom dimension is not substituted for native session identifiers. Avoid cross-user joins.

activation rate = distinct activated qualified sessions / distinct qualified sessions. For an observed denominator of 0, show N/A (not 0%). For missing source/denominator, show DATA NOT AVAILABLE, not 0/N/A. Export actual GA dates, reporting timezone, filters, thresholds/sampling and data freshness. Use a coherent observation window for numerator and denominator. Synthetic tests block GA requests and are excluded from results.

## First-party export checklist

GSC: URL Inspection for each of the ten URLs (coverage/indexing, last crawl, Google-selected canonical), plus Performance Search type Web, exact Page filter, requested 28-day and three-calendar-month windows in baseline.json. Export totals plus queries, country and device independently; do not sum query rows as page totals because anonymised queries are omitted. Record actual freshest available date. HTTP 200, robots/indexable and declared canonical are technical observations, never proof Google indexed or selected the page. [Google explains omitted/anonymised query data](https://support.google.com/webmasters/answer/17011259).

GA4: same windows, session source/medium, landing page, sessions, the relevant existing events and research_continuation_click, source categories, distinct session segments, country/device where accessible. Do not backfill unsupported event history. “No reporting access” does not mean “new property” or “no traffic.”

## Observation log

Use P/C/post ID, approval date, actual sent/published date, channel, intended URL, delivery status if verifiable, meaningful reply, conversation held, confirmed share/test, actual placement URL, aggregate qualified sessions, activated sessions and notes. Outcome fields begin **null / not observed**, not invented zeroes. Reply = substantive correction, relevant opinion or willingness to test; not auto-reply, open or generic thanks. Conversation = actual two-way discussion held; not proposed booking. Share/test = explicit test confirmation or observable placement, not positive sentiment. Contact approval, delivery, read and endorsement are different states.

## Days 1–14

| Days | Dates if started 17 October 2026 | Action | Current status / dependency |
|---|---|---|---|
| 1–2 | 17–18 Oct | Baseline access check; query map; 30 practices; 15 candidates | Research EXECUTED; first-party data DATA NOT AVAILABLE |
| 3–4 | 19–20 Oct | SERP review; English shortcut correction; small professional page; select 10/5; verify attribution | Implementation and research; see shipped status in sprint report |
| 5–7 | 21–23 Oct | Send only approved first wave; publish only approved post1; begin daily aggregate log | PREPARED — NOT EXECUTED; explicit sending/publishing approval required |
| 8–10 | 24–26 Oct | Record substantive replies/tests; approve then publish post2; no volume escalation | PREPARED — NOT EXECUTED |
| 11–14 | 27–30 Oct | At most one approved follow-up ≥5 business days after actual send; approve post3; record placements and activation | PREPARED — NOT EXECUTED; dependent on real sends/access |

These are scheduled work instructions, not a claim future days have happened or a background automation. Actual approved send date starts each response/follow-up clock. No follow-up is due inside 14 days if minimum interval has not elapsed. Re-observe SEO around 13 and 27 November (several weeks); no 14-day ranking target.

## Pilot thresholds and decisions

For 10 agents: about three meaningful replies, two conversations, at least one actual resource share/test. For five complementary organisations: about two meaningful replies and at least one actual placement/share. These are management thresholds, not benchmarks or probability claims. Professional critique can validate usefulness without establishing consumer acquisition. Confirm referral visits and activation independently.

SEO: indexing/crawl changes, impressions and early query appearance when GSC exists; ranking growth need not occur in 14 days. LinkedIn supports the pilot only: three approved posts, useful follow-ons and professional replies, not likes or impressions as success.

Do not select a winning channel from unequal exposure, tiny denominators or preparation volume. Compare actual sends/posts, confirmed placements and observed qualified/activated sessions by source. Record uncertainty and duration. If denominators or distribution are missing, decision E remains.
