# Canada report renderer audit

Written for the `restore-destination-selector` branch. Canada report generation stays OFF in production (`CANADA_REPORT_ENABLED` is not set); this branch only makes the Canada report correct.

## Finding

A Canada Assessment did not use the Visa Information Report at all. `generateReadinessPDF` excluded Canada from the restructured report
(`useRestructuredReport = … && report.country !== "CA"`) and drew a 30-page legacy advisory report instead. That legacy report was built from the
Australia-shaped engine fields and the old advisory wording. The Canada engine output itself also carries Australian-shaped fields
(`assessmentState.pathwayPoints` 189 / 190 / 491, `referenceBenchmarks` 65, `isEoiEligible`, AU-only `suppliedFacts`).

## Audit table (before → after)

| Section | Behaviour before (legacy Canada PDF) | Canada replacement |
|---|---|---|
| Cover / identity | "Confidential Readiness Assessment", "234 / 65 points threshold", "65-point minimum met" (Australian threshold) | Information cover from the Canada model: "LogiVisa Canada Immigration Information Report", program line, Canadian disclaimer |
| Applicant summary | "Executive Summary", "EOI STATUS: READY" (SkillSelect term), "fastest executable route" | Canada Professional Summary: destination, program, countries, age, CLB, education, NOC/TEER; not-entered list; areas covered; items to verify |
| Program overview | Pathway ranking from AU-shaped fields | Program information: CEC, FSW, FSTP, PNP non-Express Entry, AIP, Family Sponsorship from `src/data/countries/ca/*.json` and `visa-details.json`; selected programs first |
| Points / scoring | CRS total with a 65-point "minimum", "virtually guarantees invitation" | CRS section: only the factors the engine calculates (age, language), labelled partial; published maximums; no threshold; "Not applicable" for programs without CRS |
| Provincial programs | Empty tracker ("No target province") | "Provincial and territorial programs": Ontario, BC, Alberta streams (`pnp-provinces.ts`), Quebec federal stage, statement that other provinces are not held |
| Costs | Stale fees (CAD 1,365 / 1,525 + 515 in different places) from the engine | Verified fees (CAD 1,590 main applicant and spouse, 270 child, effective 30 April 2026), settlement-funds table, provincial fees recorded, third-party costs named but not priced |
| Processing information | Invented timelines (profile → ITA 1–12 months) | Only published figures: PNP "about 13 months", AIP "about 26 months", Express Entry "varies by program" |
| Typical process | Generic month-by-month Gantt | Published Express Entry and PNP steps, with the date checked |
| Documents | Generic checklist incl. "English evidence" | Express Entry documents, language tests, ECA bodies, police certificates, PNP IMM forms |
| Source table | Mixed | IRCC pages, provincial government pages, each with the date checked, plus official resources |
| Disclaimers | Engine's `report.disclaimer`; Australian "migration agent" wording on the information cover | Canadian disclaimer naming RCIC and lawyers (cover, footer, source section) |
| Report links | — | Official URLs only |
| Assessment sidebar ("What the report contains") | Australian sections shown even with Canada selected | Country-aware list, notes and disclaimer |
| Goal → program mapping | Canada goals mapped to subclasses 189 / 190 / 491 | Canadian slugs (`lib/countries.ts`) |

## Architecture

`country → content model → shared renderer`: `buildReportView` dispatches to `lib/reports/canada/build-canada-view.ts` for CA. The Australian builder no longer has Canada branches.
Shared: block types, layout, tag and status vocabulary, renderer. Not shared: any immigration content. The Canada model imports none of the Australian content builders and reads none of the engine's Australia-shaped fields (asserted by `scripts/test-canada-report.ts`).

## Known limits (recorded, not hidden)

- Program text from the source data (stream notes, IRCC process steps) is English; labels are localised en / tr / zh-Hans.
- Family Sponsorship and AIP records carry no `officialUrl`, so the IRCC home page is cited.
- Only the CRS factors the engine calculates (age, language) are scored; work experience, education, spouse and French results are not collected by the form, so the report says "not calculated".
- Provinces and territories other than ON, BC, AB (and the Quebec federal stage) are not in the data.
