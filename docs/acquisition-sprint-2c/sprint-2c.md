# LogiVisa Sprint 2C — organic growth (no email)

Date: 2026-10-18. Labels: **EXECUTED** (done, verified), **PREPARED** (copy/specs, nothing published or sent), **DATA NOT AVAILABLE**. Preparation is not a marketing result. No email, CRM, Reddit, Facebook, paid or submission activity took place.

## 1. Six-occupation SEO review — EXECUTED (live search 2026-10-18, standard mode)

Search result order is a single observation from one US-based search tool, not an Australian ranking and not volume. Most results were migration-agent or education-provider pages and mirrors of ANZSCO data (visaenvoy, widen, oneuedu); the primary sources that surfaced were TRA, VETASSESS and ACS documents.

| Occupation | Query families observed | What search surfaced |
|---|---|---|
| Chef 351311 | ANZSCO code; TRA skills assessment; chef vs cook; OSAP; Job Ready | Code-mirror pages, TRA chef verification report PDFs, agent guides on "chefs and cooks". Cook vs Chef is explicitly a recurring pairing. |
| Carpenter 331212 | ANZSCO code; TRA / OSAP; MSA vs OSAP | TRA skills progress report PDFs, VETASSESS fact sheet, agent pages. 331211 (Carpenter and Joiner) is often blurred with 331212. |
| Electrician General 341111 | skills assessment; licence vs assessment; OSAP | VETASSESS page, agent pages. Licence-versus-assessment is a distinct intent. |
| Software Engineer 261313 | ANZSCO; ACS assessment; vs developer programmer | Code mirrors, agent pages; ACS pathways differ by occupation. |
| Developer Programmer 261312 | ANZSCO; ACS; vs software engineer | Same set; adjacent 261311 / 261399 also surface. |
| Civil Engineer 233211 | Engineers Australia assessment; accredited vs CDR | Agent blogs on EA pathways; "CDR is not a qualification" recurs. |

Caveat: the search tool's summaries cite secondary sources. Every new statement shipped below was kept to what ANZSCO / assessor pages publish and links the originals. Fees, OSAP country lists and pathway rules were deliberately not added (they change).

## 2. Search-intent gaps — EXECUTED (compared with live pages, 2026-10-18)

Already present on the live pages: assessing authority, programs, source dates, TRA licensed-occupation note (trades), EA pathway list.

Genuine gaps found:
1. Chef vs Cook (ANZSCO 3513 vs 3514) — absent.
2. Developer Programmer vs Software Engineer — absent (only a same-unit-group link).
3. Accredited qualification vs CDR meaning — pathway names listed, distinction not explained.

Not gaps / not added: licence vs assessment for 341111 (already stated in the TRA block); OSAP/MSA/Job Ready rules and fees (time-sensitive, no stable source wording to paraphrase); Carpenter 331211 vs 331212 confusion (a plausible next candidate, needs the ANZSCO wording checked first).

## 3. Changes implemented — EXECUTED

- New `lib/occupations/distinctions.ts` + `components/occupations/occupation-distinction.tsx`: a source-linked "do not confuse" card on the occupation template, rendered only for 351311, 261312, 261313, 233211 (EN/TR/ZH). No eligibility language; it states which authority decides.
- Occupation page renders the card between the skills-assessment block and the details table.
- Assessment result continuation now includes State nomination data alongside points, skills assessment, ANZSCO finder and 189/190/491 comparison.
- `tsc --noEmit` clean; `scripts/test-seo-occupation.ts` ALL CHECKS PASSED.
- NOT deployed, NOT committed (awaiting your go-ahead). The live site does not show these changes yet.

## 4. Internal linking — EXECUTED

Existing funnel (occupation → skills assessment → calculator → comparison → visa pages → official sources) is already linked via `ResearchLinks`, the related-information nav and per-state official links. Added only links that answer a next question: Chef ↔ Cook page, Developer Programmer ↔ Software Engineer (reciprocal), plus ACS / ABS / Engineers Australia source links in the new card. No link lists added.

## 5. Assessment → research funnel — EXECUTED (code), unverified on production

The result page already ended in research links plus the professional-help block (not a dead end). Added the State nomination link. The result page deliberately carries no report-derived data (including occupation), so a personalised occupation link was not added; that would need a privacy decision and was left out. DATA NOT AVAILABLE for any assessment-to-research click rate.

## 6. Six LinkedIn posts — PREPARED, not published

Add UTM `utm_source=linkedin&utm_medium=social&utm_campaign=organic_s2c&utm_content=postN`. No user counts, no advice.

**Post 1 — Chef / TRA** → /occupations/351311-chef
Finding the ANZSCO code for a chef is the easy part.
The harder part is knowing which questions the code does not answer: who assesses the trade, which assessment program the published guidance points to, and where a kitchen role is described as a Cook instead.
ANZSCO lists Chef (351311) and Cook (351411) as separate occupations. Trades Recognition Australia publishes the assessment guidance for trade occupations. Read both descriptions before deciding which question to ask an assessor or an authorised migration professional.
I've put the code, TRA references and the Chef/Cook distinction on one source-linked page:
[link]

**Post 2 — Why a code is not enough** → /tools/anzsco-finder
An occupation code is a label, not an outcome.
It doesn't tell you which authority assesses the role, what that authority asks to see, or whether the list you read is current. Three people with the same job title can sit under different codes.
A better research order: the published occupation description, then the assessing authority's own guidance, then the dates on every source.
LogiVisa's ANZSCO finder starts that order and links the originals. It's information, not an assessment of anyone's situation.
[link]

**Post 3 — Critique invitation** → /resources/for-migration-professionals
I'm building a source-linked research tool for Australian occupations and skills assessments, and I want it checked by people who do this work.
If you're a registered migration agent or lawyer: where is a page wrong, out of date or misleading about what it can't tell a reader? One concrete correction is more useful than general feedback, and I'll credit it only if you say so.
The pages are information, not advice.
[link]

**Post 4 — Developer Programmer vs Software Engineer** → /occupations/261312-developer-programmer
Developer Programmer (261312) and Software Engineer (261313) are different ANZSCO occupations, both assessed by ACS.
ANZSCO describes the first mainly as building and maintaining code from specifications and designs, the second more broadly as designing, developing, testing and supporting software and systems. ACS publishes the originals.
Job titles don't map one-to-one onto either. Read both descriptions side by side, then check ACS's guidance.
Both pages on LogiVisa link to each other and to the ACS source:
[link]

**Post 5 — Skills assessment vs visa eligibility** → /tools/skills-assessment
A positive skills assessment is not a visa decision.
It's an authority's view of whether your skills match an occupation. A visa also has its own requirements: age, English, points, lists, invitation or nomination. A state list can also change independently of both.
Treating one step as the answer to the other is a common research mistake.
LogiVisa's skills assessment finder shows the assessing authority for an occupation and links the official guidance; the rest sits with the Department of Home Affairs.
[link]

**Post 6 — Points calculator limits** → /tools/points-calculator/australia
A points calculator does arithmetic. That's all.
It can add up the published points tables for the answers you give. It can't tell you whether your occupation is on a list, whether your qualification or experience will be accepted, whether you'll receive an invitation, or whether a state will nominate you.
Use it to understand how the tables work and which inputs matter, then verify each input with the official source.
Ours says so on the page and links the Home Affairs references:
[link]

## 7. Video concepts — PREPARED, not recorded

Record only screens and voice-over; no personal data on screen; no promises.

**Short 1 — "Chef 351311: code, assessor, next step" (45 s)** → /occupations/351311-chef
- Hook: "A chef's ANZSCO code is 351311. Here's what it doesn't tell you."
- Script: "Chef is 351311, and Cook is a different code, 351411. The page shows who assesses chefs – Trades Recognition Australia – and links its guidance. Check the dates on each source. Then use the skills assessment finder and the points calculator for the next questions. This is information, not advice."
- Screens: occupation page top → Chef/Cook card → TRA block (scroll to source date) → Continue your research links → official source click.
- CTA: "Page link in the description." Description: "Source-linked research on Chef (ANZSCO 351311). General information only, not migration advice."

**Short 2 — "Developer Programmer vs Software Engineer" (50 s)** → /occupations/261312-developer-programmer
- Hook: "Same industry, two ANZSCO codes. Which description fits your work?" (viewer-facing question, no answer given)
- Script: "ANZSCO describes Developer Programmer as building and maintaining code from specifications. Software Engineer is described more broadly – design, development, testing and support. ACS assesses both; read its originals. The page links them side by side. Only ACS or an authorised professional can say which applies."
- Screens: 261312 card → click compare link → 261313 card → ACS source link.
- CTA/description as above, with ACS link.

**Demo — "How to research an Australian occupation with LogiVisa" (4 min)** → /tools/anzsco-finder
- Hook: "Start with the official description, not the job title."
- Script outline: (1) ANZSCO finder search (0:20) (2) open an occupation page, read description and source dates (1:00) (3) assessing authority block and official link (1:00) (4) state table and its caveat about check dates (0:40) (5) points calculator and what it can't tell you (0:40) (6) visa comparison, then the professional-help register (0:20). Close: "These are research tools, not advice."
- CTA: finder link. Description: general-information disclaimer.

## 8. Organic distribution opportunities — PREPARED; mechanisms mostly NOT VERIFIED

Search found no ready "submit a resource" forms for this niche. I will not present unverified mechanisms as confirmed. Do not submit until each contact route is opened and checked.

| # | Site | Audience | Fit | Mechanism | Self-submit? / editorial? | Why |
|---|---|---|---|---|---|---|
| 1 | Migration Institute of Australia (mia.org.au) | Migration professionals | Critique/resource review | Homepage shows a "Become a Partner" / Corporate Partners route — likely paid; UNVERIFIED | Unknown / yes | Credible professional audience; do not pay for placement |
| 2 | ACS (acs.org.au) | ICT migrants | IT occupation pages | General enquiries on contact page; no resource form found | No form found / editorial | Assessing-authority audience; a link request is a long shot |
| 3 | Engineers Australia migrant engineer programs | Engineers | Civil Engineer + accreditation card | No submission page found | Unknown / editorial | Existing migrant-engineer reference group |
| 4 | Jobs and Skills Australia "Connect with us" | Labour-market users | Occupation data pages | Hub exists; no resource submission found | No / editorial | Only if framed as feedback, not a link request |
| 5 | Product Hunt | Tech/early adopters | Product launch | Public submission | Yes / community-moderated | Weak audience fit; low risk, low expected value |
| 6 | BetaList | Early adopters | Product listing | Form; free queue may be long (sources disagree; paid fast-track exists — do not pay) | Yes / yes | Same caveat |
| 7 | TAFE / university international-student careers pages | International students | Occupation + assessment research | Per-institution contact; none verified | Unknown / yes | Student audience; only via a named contact |
| 8 | Registered migration agent blogs/resource pages (individual) | Prospective migrants | Critique-led resource review | Public contact pages (outreach is a separate email workstream — excluded here) | Not applicable | Out of scope per brief |
| 9 | Trade/industry bodies (e.g. chef or building associations) | Trade workers | Chef/Carpenter/Electrician pages | Not researched | Unknown | Needs a dedicated search |
| 10 | Study Australia (government) | International students | Study-to-migration research | Not found in search | Unknown | Needs direct check |

Honest conclusion: only 5–6 have any evidence of a route, and none is confirmed self-serve. Treat this as a verification list, not an opportunity list.

## 9. Content opportunities (score 1–5 each; build effort 5 = easy; compliance 5 = low risk; judgments are editorial, not data)

| # | Topic | Intent | Product relevance | Sources | Competition | Conversion path | Compliance | Effort | Total /35 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Chef vs Cook | 5 | 5 | 4 | 3 | 4 | 5 | 5 | **31** |
| 2 | Developer Programmer vs Software Engineer | 5 | 5 | 4 | 3 | 4 | 5 | 5 | **31** |
| 3 | Accredited qualification vs CDR | 4 | 4 | 5 | 3 | 4 | 4 | 5 | **29** |
| 4 | Skills assessment vs visa eligibility | 4 | 4 | 4 | 2 | 4 | 3 | 4 | 25 |
| 5 | TRA MSA vs OSAP | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 23 |
| 6 | Skills assessment vs occupational licence | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 25 |
| 7 | State list vs nomination eligibility | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 23 |
| 8 | English requirement vs points level | 4 | 4 | 5 | 2 | 4 | 3 | 3 | 25 |
| 9 | ANZSCO version differences | 3 | 3 | 3 | 4 | 2 | 3 | 2 | 20 |
| 10 | Carpenter 331212 vs 331211 | 3 | 4 | 3 | 4 | 3 | 5 | 5 | 27 |

Top 3 by score: Chef vs Cook, Developer Programmer vs Software Engineer, Accredited vs CDR.

## 10. Top three implemented — EXECUTED (in code; not deployed)

All three shipped as additions to existing occupation pages (not new URLs), as the brief prefers. Locations: `lib/occupations/distinctions.ts`. Next in line: Carpenter 331212 vs 331211 (27).

## 11. Search Console — DATA NOT AVAILABLE

Indexed pages, impressions, clicks, CTR, positions, top queries: DATA NOT AVAILABLE. Public technical checks made: occupation URLs return 200 live; cook page 351411 returns 200. No ranking claims are made. Sitemap and canonical checks were not rerun this sprint.

## 12. Analytics event verification — EXECUTED (code inspection)

Every requested event has an emitting site and is on the allow-list in `lib/analytics/events.ts`: occupation_tool_click (occupation-tool-click-tracker), research_continuation_click, assessment_entry_click, calculator_start/complete (points-calculator-client), comparison_page_view (visa-comparison page), professional_help_click (two trackers), occupation_page_view. New card links use the existing `data-official-source` marker; Chef↔Cook and IT compare links carry no tool destination, so no new event was created. Events firing in production: not verified (GA reporting unavailable).

## 13. Weekly scorecard — PREPARED

| Block | Metric | Source | Status |
|---|---|---|---|
| SEO | Pages indexed, impressions, clicks, top queries | GSC | DATA NOT AVAILABLE |
| Activation | occupation → tool (occupation_tool_click ÷ occupation_page_view) | GA | DATA NOT AVAILABLE |
| Activation | calculator_complete → research_continuation_click | GA | DATA NOT AVAILABLE |
| Activation | assessment → research continuation (research_continuation_click with entry from result) | GA | DATA NOT AVAILABLE |
| Content | Clicks by utm_content (post1–6, video1–3), resource-page visits | GA | DATA NOT AVAILABLE |
| Outcomes | professional_help_click, assessment starts, completions | GA/DB | DATA NOT AVAILABLE |

Rule: pageviews alone are not success; read each ratio with its denominator and minimum volume (do not report a rate off a handful of sessions).

## 14. Next steps

1. Review and approve the diff; then commit/push and deploy (not done).
2. After deploy, verify the cards on the 4 pages across en/tr/zh and in production GA DebugView.
3. Verify each distribution route (table in §8) before any contact; drop anything without a real route.
4. Post LinkedIn posts yourself (one per week); record two shorts.
5. Connect Search Console and GA, then fill the scorecard.
6. Next content: Carpenter 331212 vs 331211 after checking ANZSCO wording.
