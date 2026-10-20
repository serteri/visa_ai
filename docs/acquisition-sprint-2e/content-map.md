# Sprint 2E, Wave 1: content map

Google organic only. English only. Six guides at `/guides/<slug>`, rendered by `components/guides/research-guide-view.tsx` from `lib/guides/research-guides.ts`
(routed through the existing `app/[locale]/(main)/guides/[slug]/page.tsx`; no `/blog/`). Sources last checked **2026-10-20**.

No search volume, difficulty, traffic, ranking or CTR figures are recorded: none were available (Search Console: DATA NOT AVAILABLE to this sprint).

## Content map

| Guide | Primary query | Secondary intent | Existing LogiVisa page | Official sources used | Gap worth filling |
|---|---|---|---|---|---|
| `/guides/chef-vs-cook-australia` | Chef 351311 vs Cook 351411 | Which code for a cook; Chef skill level; TRA assessment for cooks | `/occupations/351311-chef` and `/351411-cook` (351311 carried a short "do not confuse" note; 351411 none) | ABS ANZSCO 2022 unit groups 3513 and 3514; TRA | Results are agent pages that disagree on list placement and assessing authority. No result put both ABS entries (description, skill level, tasks, exclusions) in one table without a verdict. |
| `/guides/tra-msa-vs-osap` | TRA MSA vs OSAP | Offshore skills assessment; licensed trades | Skills Assessment Finder (TRA data only inside tool results) | TRA Migration Skills Assessment Program Guidelines (July 2026, captured 2026-10-11); TRA site | Results are TRA node pages and agent news items about single rule changes. No neutral dated side-by-side with the licensed-occupation rule and the assessment-versus-licence distinction. |
| `/guides/developer-programmer-vs-software-engineer` | 261312 vs 261313 | ACS assessment for each code; which suits | `/occupations/261312-...`, `/261313-...` (short "compare with" note) | ABS ANZSCO 2022 unit group 2613; ACS IT occupations page | Results are code-listing pages and agent pages. ACS itself does not say which code suits which profile; a table of the two ABS entries plus ACS's own wording fills that. |
| `/guides/skills-assessment-vs-visa-eligibility` | skills assessment vs visa eligibility Australia | Does a positive assessment guarantee an invitation; assessment vs points | Skills Assessment Finder, Points Calculator, Visa comparison, State nomination (each one step) | Home Affairs 189, 190, 491 and SkillSelect pages; ACT 190 criteria | Results are agent blogs and news items about single points. No page separates all seven decisions with the decision-maker for each. |
| `/guides/engineers-australia-accredited-vs-cdr` | Engineers Australia accredited qualification vs CDR | Washington Accord; does my degree need a CDR | `/occupations/233211-civil-engineer` (short note) | Engineers Australia migration skills assessment page (updated 2026-02-27); International Engineering Alliance | Results are consultancies selling CDR writing. A source-led table with the verification destinations and the 2024 change dated. |
| `/guides/state-occupation-list-vs-nomination` | state occupation list vs nomination 190 491 | Is a listed occupation guaranteed; ACT / SA examples | State nomination research tool (lists, no explanation of the gap) | ACT Government nomination, 190 criteria and Canberra Matrix round pages (captured 2026-10-13); Home Affairs 190 and 491 | Results are state-specific agent pages and a 2021 blog. A worked, dated primary-source example showing list, Matrix, residence, allocation and rounds as separate steps. |

## SERP research summary (run 2026-10-20, one standard web search per topic; result types only, no volumes)

| Topic | Result types seen | Official sources in results | Commercial competitors in results | Gaps |
|---|---|---|---|---|
| Chef vs Cook | Law-firm and agent guides; one video page; two aggregator pages | None (no ABS or TRA page in the top set) | noborderslawgroup, widen, migratio, australianmigrationlawyers | Sources disagreed on list placement and on whether the assessing authority is TRA; no ABS wording quoted side by side. |
| TRA MSA vs OSAP | TRA node pages; agent news posts | TRA site (several nodes) | caqa, ahclawyers, migrationalliance | No single neutral comparison; rule changes reported one at a time. |
| 261312 vs 261313 | ACS description PDF; agent code pages; assessment-writing services | ACS | visaenvoy, widen, cdraustraliawriter | ACS text is a PDF of descriptions; no comparison. |
| Assessment vs eligibility | Agent blogs; one SBS news article | None | pathwaytoaus, matthewmarks, vemvisa | News item on a rule change; no structure separating the steps. |
| EA accredited vs CDR | Engineers Australia migration page; consultancies | Engineers Australia | thinkhigher, widen, visaenvoy | Consultancies sell CDR writing; official page is not a comparison. |
| List vs nomination | State-specific agent pages; a 2021 blog | None | australianmigrationlawyers, pathwaytoaus | Generic warnings; no dated primary-source example. |

The Home Affairs visa pages returned HTTP 403 to the fetch tool used for this research, so the national requirement statements in guides 4 and 6 are kept at the level the repository already holds (visa pages, ACT captures) and link to the Home Affairs pages for the reader to confirm.

## SERP differentiation gate (answered per guide)

Each guide passes: it provides something the current results and the existing LogiVisa page do not (column "Gap worth filling" above). No guide was stopped.

## Source notes and limits

- ABS ANZSCO pages fetched are the 2022 release, which the ABS marks "not the latest". Each guide says to confirm the version the assessing authority and Home Affairs use.
- The TRA table follows the July 2026 guidelines as captured in this repository on 2026-10-11 (`lib/skills-assessment/tra-osap.ts`); TRA's live pages timed out when fetched on 2026-10-20.
- The word "eligibility" is part of the target query for guide 4. It is used in that guide only in negation, and the repository's banned-phrase list is applied in full to every other guide (see `scripts/test-research-guides.ts`).

## Wave 2 candidates (prepared, not implemented)

Scored 1 (weak) to 3 (strong). Total is the plain sum; compliance safety and duplication risk are scored so that 3 is safest.

| # | Candidate | Intent clarity | Official sources | LogiVisa relevance | Compliance safety | Low duplication | Link value | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | Carpenter 331212 vs Carpenter and Joiner 331211 | 3 | 3 (ABS, TRA) | 3 | 3 | 3 | 3 | 18 |
| 2 | ACS occupation code vs job title | 3 | 3 (ACS) | 3 | 3 | 2 | 3 | 17 |
| 3 | Invitation round vs visa application | 3 | 2 (Home Affairs) | 3 | 3 | 2 | 3 | 16 |
| 4 | Skills assessment validity (who sets it, where to check) | 3 | 2 | 3 | 3 | 2 | 3 | 16 |
| 5 | Electrician skills assessment vs occupational licensing | 3 | 2 (TRA, state regulators) | 3 | 3 | 2 | 2 | 15 |
| 6 | English test for the visa vs English for points | 3 | 2 (Home Affairs) | 3 | 3 | 1 (English points tool exists) | 3 | 15 |
| 7 | ANZSCO version differences (2013 v1.3 vs 2022) | 2 | 3 (ABS) | 2 | 3 | 3 | 2 | 15 |
| 8 | Accountant 221111 vs Management Accountant 221112 (CPA/CAANZ/IPA) | 3 | 3 | 2 | 3 | 2 | 2 | 15 |
| 9 | Registered nurse assessment (ANMAC) vs registration (AHPRA) | 3 | 3 | 2 | 3 | 2 | 2 | 15 |
| 10 | Electrical vs Electronics Engineer (EA occupations) | 2 | 3 | 2 | 3 | 3 | 2 | 15 |
