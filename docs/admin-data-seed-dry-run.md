# Seed dry run: state nomination admin data

Rows that would be inserted: 8 of 8. A state that already has a row is skipped, never overwritten.
Built from `lib/state-nomination/state-rules-config.ts`, `src/data/state-nomination-status.json` and the carried-over translations. Nothing has been written.

## Summary

| State | Status | Program year | Opening | Allocation 190 / 491 | Fee 190 excl. / incl. GST | Conditions | Residence rule | Translations carried over |
|---|---|---|---|---|---|---|---|---|
| NSW | Suspended / Closed | 2025-26 (2026-27 not yet published) | — | — / — | — / — | 9 | required (190 only) | 5 |
| VIC | Suspended / Closed | 2025-26 (2026-27 not yet published) | — | — / — | AUD 0 / AUD 0 | 8 | required (491 only) | 10 |
| WA | Check official page | 2025-26 (2026-27 not yet published) | — | — / — | — / — | 11 | not_required | 6 |
| SA | Suspended / Closed | 2025-26 (2026-27 not yet published) | — | — / — | — / — | 10 | required | 3 |
| QLD | Suspended / Closed | 2025-26 (2026-27 not yet published) | — | — / — | — / — | 8 | required | 2 |
| NT | Closed with exceptions | 2026-27 | — | — / — | — / — | 6 | not stated | 4 |
| TAS | Open (Onshore only) | 2026-27 | 2026-08-17 | 1250 / 800 | AUD 387 / AUD 425.70 | 19 | required | 11 |
| ACT | High Demand | 2026-27 | — | — / — | AUD 325 / AUD 357.50 | 14 | required | 4 |

## Where the seed differs from the rules file on purpose

- **NT**: Suspended / Closed -> Closed with exceptions (the status text the project owner confirmed on 13 October 2026; the exception is now a field)
- **TAS**: `Open (Onshore Only)` is stored as `Open (Onshore only)` (spelling only).
- **ACT** stays `High Demand`, **WA** stays `Check official page`: a legacy status is seeded unchanged so every report score stays exactly as it is today; change it in the admin page when you decide to.

Translations: every Turkish / Chinese text customers already see today is carried over and marked **reviewed (carried over from the code)** so no report changes language on the day of the switch. Untick one in the admin page to make customers see English until you have re-read it.

## Review changes in this version of the seed

**Scoring inputs follow the status.** Suspended / Closed and Closed with exceptions: onshore and offshore closed. Check official page and Not yet published: unknown / unknown (never counted as open). Open (Onshore only): onshore open, offshore closed. Saving a row whose scoring inputs contradict its status is refused (seed and admin save run the same check). A legacy status (ACT `High Demand`) keeps the inputs it is scored with today.

**Program year** is the year the stored content describes: NSW, VIC, WA, SA, QLD hold 2025-26 (latest published; shown as "2026-27 not yet published"); NT, TAS, ACT hold 2026-27.

**Quota pressure** is one value per state (the rules file's): TAS now medium (was low in the score dataset), VIC closed (was low). A closed status requires closed pressure; the two stored fields must be equal.

**Condition categories and residence tags** (only where the result differs from the first seed build; every other condition is unchanged):

- NSW `c02`: employment, tag - -> **process, tag -** — Both the Skilled Nominated (190) and Skilled Work Regional (491) pages state applications …
- NSW `c03`: other, tag - -> **process, tag -** — Applications already submitted continue to be assessed; NSW is reviewing program settings …
- VIC `c08`: english, tag - -> **other, tag -** — DHA baseline applies: under 45, at least Competent English, valid skills assessment, at le…
- WA `c03`: study, tag - -> **process, tag -** — Latest invitations shown (issued 20 May 2026, priority trade occupations): General stream …
- WA `c04`: study, tag - -> **other, tag -** — Covers subclass 190 (+5 DHA points) and subclass 491 (+15 DHA points) via a General stream…
- WA `c10`: study, tag - -> **process, tag -** — Invitations were anticipated monthly in 2025-26. 2025-26 program-to-date total: 8,162 invi…
- SA `c05`: employment, tag - -> **other, tag -** — Four streams: South Australian Graduates, Skilled Employment in South Australia, Outer Reg…
- SA `c06`: english, tag - -> **other, tag -** — Eligibility on the onshore streams (2025-26 settings): active SkillSelect EOI with SA as f…
- SA `c10`: employment, tag - -> **other, tag -** — Nomination is competitive; ranking factors include English proficiency, years of skilled e…
- QLD `c02`: other, tag - -> **process, tag -** — 2026-27 program settings, eligibility criteria and opening date have not yet been publishe…
- QLD `c03`: employment, tag - -> **fee, tag -** — 2026-27 application fees for subclass 190, subclass 491 and the 491 Small Business Owners …
- QLD `c04`: employment, tag - -> **other, tag -** — Covers subclass 190 (permanent) and subclass 491 (provisional, regional); the Small Busine…
- QLD `c05`: english, tag - -> **other, tag -** — Minimum requirements shown on the onshore page (2025-26 settings, may change for 2026-27):…
- NT `c03`: residence, tag - -> **other, tag -** — Exception: subclass 491 for onshore applicants meeting the NT Graduate or NT Resident crit…
- NT `c04`: points, tag - -> **other, tag -** — Visa deadline means: a substantive visa expiring on or before 30 September 2027 and not el…
- TAS `c10`: english, tag - -> **other, tag -** — DHA baseline for state nomination: under 45, skills-assessed occupation on the relevant li…
- TAS `c13`: residence, tag - -> **residence, tag required** — Tasmanian Skilled Graduate (TSG): all skills assessments eligible; requires a CRICOS-regis…
- TAS `c14`: residence, tag - -> **residence, tag required** — Tasmanian Established Resident (TER): requires 2-3 years living in Tasmania (max 50% of to…
- TAS `c16`: residence, tag required -> **process, tag -** — Mandatory documents across all pathways include: passport bio page, SkillSelect EOI, skill…
- ACT `c04`: residence, tag - -> **process, tag -** — Latest published round (11 June 2026): Critical Skill Occupations -- 66 invitations for su…
- ACT `c05`: employment, tag - -> **other, tag -** — Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nom…
- ACT `c06`: employment, tag - -> **other, tag -** — General pathway requires the nominated occupation to be on the ACT Nominated Migration Pro…
- ACT `c08`: residence, tag - -> **employment, tag -** — Overseas applicants: at least 3 years (subclass 190) or 1 year (subclass 491) of full-time…

23 conditions changed. Residence rule tags now: NSW c06=required; VIC c06=required; WA c07=not_required; SA c07=required; QLD c06=required; NT none; TAS c13=required, c14=required; ACT c07=required.

## New South Wales (NSW) 

- Status: **Suspended / Closed**; program year 2025-26 (**2026-27 not yet published**); opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190; also watched: https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491, https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists
- Sources (text): data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md; data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Work Regional visa (subclass 491) (fetched 2026-10-13).md; data/knowledge/State Immigrations/NSW/2026-27/NSW Skills Lists (fetched 2026-10-13).md
- Subclass 190: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: No nomination fee figure is published on the pages checked.
- Subclass 491: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: No nomination fee figure is published on the pages checked.
- Note (en): New South Wales' Skilled Nominated (190) and Skilled Work Regional (491) pages both carry a notice that applications are closed for the current program year because all available nomination places have been fully allocated (the notice does not name the program year). Already-submitted applications c…
- Note translations: tr yes, zh-Hans yes
- Conditions (9):
  - `c01` [other] Checked against the NSW Government pages on 13 October 2026.
  - `c02` [process] Both the Skilled Nominated (190) and Skilled Work Regional (491) pages state applications are closed for the current program year -- all available nomination pl…
  - `c03` [process] Applications already submitted continue to be assessed; NSW is reviewing program settings and eligibility criteria for the next program year and has not publish…
  - `c04` [process] Invitation-only: candidates cannot apply directly for NSW nomination. Invitation rounds have no announced dates; the date an EOI is submitted does not affect th…
  - `c05` [other] Occupation must fall within an ANZSCO unit group on the NSW Skills List (subclass 190) or the NSW Regional Skills List (subclass 491). (translated)
  - `c06` [residence, residence: required 190] Subclass 190 residency basis: working 20+ hrs/week in NSW in the nominated occupation, OR 6+ months continuous NSW residence, OR 6+ months continuous offshore r… (translated)
  - `c07` [residence] Subclass 491 has three pathways: Pathway 1 (6+ months' current regional-NSW employment paid at least the TSMIT/CSIT rate), Pathway 2 (Investment NSW invitation,…
  - `c08` [process] Invitations, once issued, must be responded to within 14 days (not extended); nomination assessment typically takes about six weeks.
  - `c09` [fee] No nomination fee figure is published on these pages.
- Scoring inputs: onshore closed, offshore closed, min points 85, min English proficient, quota pressure closed (rule: closed), preferred 190

## Victoria (VIC) 

- Status: **Suspended / Closed**; program year 2025-26 (**2026-27 not yet published**); opening —; closing —; last verified 2026-10-11 (by seed)
- Official page: https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas
- Sources (text): Confirmed directly against liveinmelbourne.vic.gov.au (2026-10-11)
- Subclass 190: availability inherit; allocation —; fee AUD 0 excl. / AUD 0 incl. GST (no_gst); note: Registration of interest and nomination are free of charge when the program is open (2025-26 documents).
- Subclass 491: availability inherit; allocation —; fee AUD 0 excl. / AUD 0 incl. GST (no_gst); note: Registration of interest and nomination are free of charge when the program is open (2025-26 documents).
- Note (en): Victoria's 2025-26 skilled visa nomination program (subclasses 190 and 491) is closed -- Live in Melbourne states all places have been filled. Information about the 2026-27 program has not yet been published.
- Note translations: tr yes, zh-Hans yes
- Conditions (8):
  - `c01` [other] These settings come from the 2025-26 program documents. Check the official Victoria page for current settings. (translated)
  - `c02` [other] The 2025-26 Victorian skilled visa nomination program (subclasses 190 and 491) is closed -- all places have been filled (confirmed on liveinmelbourne.vic.gov.au… (translated)
  - `c03` [other] Information about the 2026-27 program has not yet been published. (translated)
  - `c04` [fee] When open: Registration of Interest (ROI) and nomination are free of charge -- only the Department of Home Affairs visa fee applies. (translated)
  - `c05` [employment] When open: subclass 190 has no minimum work experience or hours-of-work requirement. (translated)
  - `c06` [residence, residence: required 491] When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria. (translated)
  - `c07` [other] Occupation must be on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain a separate state list (unlike NSW/SA/WA). (translated)
  - `c08` [other] DHA baseline applies: under 45, at least Competent English, valid skills assessment, at least 65 points. (translated)
- Scoring inputs: onshore closed, offshore closed, min points 80, min English proficient, quota pressure closed (rule: closed), preferred 190

## Western Australia (WA) 

- Status: **Check official page**; program year 2025-26 (**2026-27 not yet published**); opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://migration.wa.gov.au/our-services-support/state-nominated-migration-program; also watched: https://migration.wa.gov.au/news
- Sources (text): data/knowledge/State Immigrations/Western Australia/2026-27/WA State Nominated Migration Program (fetched 2026-10-13).md; data/knowledge/State Immigrations/Western Australia/2026-27/WA News list (fetched 2026-10-13).md; data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf; data/knowledge/State Immigrations/Western Austr…
- Subclass 190: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: AUD 200, non-refundable (2025-26 page); the GST treatment is not stated.
- Subclass 491: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: AUD 200, non-refundable (2025-26 page); the GST treatment is not stated.
- Note (en): Western Australia's State Nominated Migration Program page still shows only the 2025-26 program and no 2026-27 settings or intake have been published; its latest program news is dated 8 December 2025. The last invitations shown were issued on 20 May 2026 for priority trade occupations: 167 General s…
- Note translations: tr yes, zh-Hans yes
- Conditions (11):
  - `c01` [other] Checked against the Migration WA State Nominated Migration Program page and news list (migration.wa.gov.au) on 13 October 2026.
  - `c02` [process] The page still shows only the 2025-26 program; no 2026-27 settings, allocation, fees or opening have been published, and the latest SNMP news item is dated 8 De…
  - `c03` [process] Latest invitations shown (issued 20 May 2026, priority trade occupations): General stream WASMOL Schedule 1: 0; WASMOL Schedule 2: 167; Graduate stream higher e…
  - `c04` [other] Covers subclass 190 (+5 DHA points) and subclass 491 (+15 DHA points) via a General stream (WASMOL Schedule 1/2 occupation lists) and a Graduate stream (Graduat…
  - `c05` [employment] Contract of employment (General stream, 2025-26 page): a contract of employment in the nominated (or a closely related) occupation for full-time employment in W… (translated)
  - `c06` [study] Graduate stream study requirement (2025-26 page): at least one qualification gained in WA, studied at an accredited WA educational institution, full-time, in a … (translated)
  - `c07` [residence, residence: not_required] 2025-26 rules: both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible; ranking prioritises WA residents, then priority-industry o…
  - `c08` [employment] 2025-26 rules: at least 1 year of Australian OR overseas work experience in the nominated (or closely related) occupation within the last 10 years.
  - `c09` [fee] Nomination application fee (2025-26 page): AUD 200, non-refundable; applicants have 28 calendar days to lodge the application once invited.
  - `c10` [process] Invitations were anticipated monthly in 2025-26. 2025-26 program-to-date total: 8,162 invitations issued across General and Graduate streams (per the saved 'Inv…
  - `c11` [points] If an EOI seeks nomination for both subclass 190 and 491, WA generally invites for subclass 491 first (typically a higher EOI points score). (translated)
- Scoring inputs: onshore unknown, offshore unknown, min points 70, min English competent, quota pressure medium (rule: medium), preferred 190/491

## South Australia (SA) 

- Status: **Suspended / Closed**; program year 2025-26 (**2026-27 not yet published**); opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://migration.sa.gov.au/before-applying/visa-options-and-pathways/skilled-migrants; also watched: https://migration.sa.gov.au/news
- Sources (text): data/knowledge/State Immigrations/SA/2026-27/SA News - ROIs closing 2 June 2026 (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Skilled Migration (nomination streams and fees) (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Skilled Employment in South Australia stream (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA South Au…
- Subclass 190: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: AUD 394 is listed for this subclass (registration of interest: nil); the page states neither the program year nor the GST treatment.
- Subclass 491: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: AUD 394 is listed for this subclass (registration of interest: nil); the page states neither the program year nor the GST treatment.
- Note (en): South Australia's Skilled & Business Migration closed Registrations of Interest (ROIs) at 9am on 2 June 2026 for the 2025-26 program year and says it will resume accepting ROIs from all eligible candidates when the 2026-27 program commences. No 2026-27 program information had been published on 13 Oc…
- Note translations: tr yes, zh-Hans yes
- Conditions (10):
  - `c01` [other] Checked against the Move to South Australia pages (migration.sa.gov.au) on 13 October 2026.
  - `c02` [process] News notice 29 May 2026: ROIs for the 2025-26 program year closed 9am Tuesday 2 June 2026; last formal invitation round 21 May 2026; SBM will resume accepting R…
  - `c03` [process] No 2026-27 program settings, allocation or opening date had been published on 13 October 2026; the stream pages still describe 2025-26 (invitations 'throughout …
  - `c04` [fee] Nomination fee (Skilled Migration page): AUD 394 for subclass 190 and AUD 394 for subclass 491; Registration of Interest: nil. The page does not state the progr…
  - `c05` [other] Four streams: South Australian Graduates, Skilled Employment in South Australia, Outer Regional Skilled Employment (onshore, ROI required) and Offshore (selecte…
  - `c06` [other] Eligibility on the onshore streams (2025-26 settings): active SkillSelect EOI with SA as first preference, under 45, positive skills assessment, at least Compet…
  - `c07` [residence, residence: required] Residence and work (2025-26 settings): Graduates 6 months' SA residence and 6 months' full-time (30+ hrs/week) work, with 75% of the qualification completed in …
  - `c08` [employment] Offshore stream (2025-26 settings): at least 3 years' skilled work experience in the last 5 years (listed construction/trades occupations: 1 year in the last 3)…
  - `c09` [other] 2025-26 priority sectors for subclass 190: Building & construction, Defence, Education, Engineering, Health, Manufacturing -- other sectors are generally direct…
  - `c10` [other] Nomination is competitive; ranking factors include English proficiency, years of skilled experience, qualification level, salary and employer assessment.
- Scoring inputs: onshore closed, offshore closed, min points 75, min English proficient, quota pressure closed (rule: closed), preferred 190/491

## Queensland (QLD) 

- Status: **Suspended / Closed**; program year 2025-26 (**2026-27 not yet published**); opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://www.migration.qld.gov.au/visa-options/skilled-visas/skilled-workers-living-in-queensland; also watched: https://www.migration.qld.gov.au/nomination-process/application-process/application-fees
- Sources (text): data/knowledge/State Immigrations/Queensland/2026-27/QLD Skilled workers living in Queensland (onshore) (fetched 2026-10-13).md; data/knowledge/State Immigrations/Queensland/2026-27/QLD Application fees (fetched 2026-10-13).md
- Subclass 190: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: Listed as 'To be advised' on the Migration Queensland application fees page (13 October 2026).
- Subclass 491: availability inherit; allocation —; fee — excl. / — incl. GST (not_stated); note: Listed as 'To be advised' on the Migration Queensland application fees page (13 October 2026).
- Note (en): Queensland's Registrations of Interest (ROIs) for the 2025-26 State Nominated Migration Program (SNMP) are closed. The 2026-27 eligibility requirements and opening date had not been published on the Migration Queensland website on 13 October 2026, and the 2026-27 application fees for subclass 190 an…
- Note translations: tr yes, zh-Hans yes
- Conditions (8):
  - `c01` [other] Checked against the Migration Queensland pages on 13 October 2026; the 2025-26 SNMP ROIs are closed.
  - `c02` [process] 2026-27 program settings, eligibility criteria and opening date have not yet been published.
  - `c03` [fee] 2026-27 application fees for subclass 190, subclass 491 and the 491 Small Business Owners pathway are listed as 'To be advised'.
  - `c04` [other] Covers subclass 190 (permanent) and subclass 491 (provisional, regional); the Small Business Owners pathway nominates for subclass 491 only and is only availabl…
  - `c05` [other] Minimum requirements shown on the onshore page (2025-26 settings, may change for 2026-27): occupation on the Queensland Onshore Skills List, at least 65 points,…
  - `c06` [residence, residence: required] Residency/employment test shown on the onshore page: 6 months living and working in regional Queensland (491) or 9 months in Queensland (190), at 20+ hrs/week, …
  - `c07` [residence] Commitment shown on the onshore page: live and work in regional Queensland for 3 years after a 491 grant, or in Queensland for 2 years after a 190 grant.
  - `c08` [other] Holders or applicants of a subclass 491 or 489 visa cannot be nominated for subclass 190.
- Scoring inputs: onshore closed, offshore closed, min points 80, min English proficient, quota pressure closed (rule: closed), preferred 190

## Northern Territory (NT) 

- Status: **Closed with exceptions**; program year 2026-27; opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination
- Sources (text): data/knowledge/State Immigrations/NT/2026-27/NT user-confirmed status (checked 2026-10-13).md
- Exceptions (491, onshore, deadline 2027-09-30): Exception: onshore subclass 491 for NT Graduate or NT Resident applicants with a visa deadline before 30 September 2027 (substantive visa expiring on or before 30 Sep 2027 and not eligible for subclass 485; turning 45 on or before 30 Sep 2027; or 491 points below 65 because of a birthday on or before 30 Sep 2027)
- Subclass 190: availability closed; allocation —; fee — excl. / — incl. GST (not_stated); note: 2026-27 NT fees have not been re-confirmed.
- Subclass 491: availability exception; allocation —; fee — excl. / — incl. GST (not_stated); note: 2026-27 NT fees have not been re-confirmed.
- Note (en): Closed to new applications (2026-27), with a narrow onshore 491 exception. The NT's 2026-27 program is closed to new applications ("sufficient applications received") for subclass 190 and all offshore streams. The exception is subclass 491 for onshore applicants who meet the NT Graduate or NT Reside…
- Note translations: tr yes, zh-Hans yes
- Conditions (6):
  - `c01` [other] Status (2026-27): Closed to new applications, with a narrow onshore 491 exception -- confirmed on the official Northern Territory page on 13 October 2026.
  - `c02` [other] Closed to new applications ("sufficient applications received") for subclass 190 and all offshore streams.
  - `c03` [other] Exception: subclass 491 for onshore applicants meeting the NT Graduate or NT Resident criteria with a visa deadline before 30 September 2027.
  - `c04` [other] Visa deadline means: a substantive visa expiring on or before 30 September 2027 and not eligible for subclass 485; turning 45 on or before 30 September 2027; or…
  - `c05` [other] The Northern Territory is not counted as open in the nomination-availability count.
  - `c06` [other] 2026-27 NT fees and stream conditions have not been re-confirmed; check the official Northern Territory page before relying on any earlier NT figure.
- Scoring inputs: onshore closed, offshore closed, min points 65, min English competent, quota pressure closed (rule: closed), preferred 491/190

## Tasmania (TAS) 

- Status: **Open (Onshore only)**; program year 2026-27; opening 2026-08-17; closing —; last verified 2026-10-13 (by seed)
- Official page: https://www.migration.tas.gov.au/skilled_migration
- Sources (text): data/knowledge/State Immigrations/TAS/2026-27/TAS user-confirmed program settings (checked 2026-10-13).md
- Subclass 190: availability inherit; allocation 1250; fee AUD 387 excl. / AUD 425.70 incl. GST (stated_by_state); note: Nomination service fee AUD 387 (AUD 425.70 incl. GST); no ROI fee. Confirmed by the project owner on 13 October 2026.
- Subclass 491: availability inherit; allocation 800; fee AUD 387 excl. / AUD 425.70 incl. GST (stated_by_state); note: Nomination service fee AUD 387 (AUD 425.70 incl. GST); no ROI fee. Confirmed by the project owner on 13 October 2026.
- Note (en): Migration Tasmania's 2026-27 program opened to new Registrations of Interest (ROI) on 17 August 2026 with 2,050 allocations (1,250 for subclass 190 and 800 for subclass 491) and weekly invitations from 20 August 2026. ROIs are ranked into a Gold/Green/Orange-Plus/Orange/Red pass system across four o…
- Note translations: tr yes, zh-Hans yes
- Conditions (19):
  - `c01` [other] Confirmed by the project owner on the official Migration Tasmania pages on 13 October 2026 (the site could not be fetched automatically); pathway details below …
  - `c02` [process] 2026-27 program opened to new ROIs on 17 August 2026; weekly invitations from 20 August 2026.
  - `c03` [other] 2026-27 allocations: 2,050 in total -- 1,250 for subclass 190 and 800 for subclass 491.
  - `c04` [fee] Nomination service fee AUD 387 (AUD 425.70 incl. GST); there is no ROI fee.
  - `c05` [process] Subclass 491 Overseas Skilled Occupation Profiles pathway: no invitations planned for 2026-27.
  - `c06` [employment] Overseas Applicant -- Health or Education Sector Job Offer pathway remains available for subclass 190.
  - `c07` [employment] Tasmanian Skilled Employment (TSE) Gold attribute now requires at least 30 hours per week in at least one job.
  - `c08` [employment] Priority income level (needed for Gold/Green/Orange-Plus tiers) unchanged: AUD 57,000/year or AUD 28.85/hour.
  - `c09` [process] Application Gateway: https://apply.migration.tas.gov.au
  - `c10` [other] DHA baseline for state nomination: under 45, skills-assessed occupation on the relevant list, valid positive skills assessment, at least Competent English, at l… (translated)
  - `c11` [process] Five pass tiers ranked by priority attributes: Gold (1000 pts, immediate nomination), Green (500/300/250 pts, invited within ~6 months), Orange-Plus (30-100 pts… (translated)
  - `c12` [employment] Tasmanian Skilled Employment (TSE): requires 6-15 months (subclass 190) or 9-12 months (subclass 491) working in Tasmania at 20+ hrs/week, generally in a role m… (translated)
  - `c13` [residence, residence: required] Tasmanian Skilled Graduate (TSG): all skills assessments eligible; requires a CRICOS-registered Tasmanian course (92 weeks min for 190, 40 weeks for 491), full-… (translated)
  - `c14` [residence, residence: required] Tasmanian Established Resident (TER): requires 2-3 years living in Tasmania (max 50% of total Australian residence elsewhere) plus qualifying employment, remote… (translated)
  - `c15` [employment] Tasmanian Business Operator (TBO, 491 only): 12+ months operating a Tasmanian business, in profit after paying yourself at least 85% of the Temporary Skilled Mi…
  - `c16` [process] Mandatory documents across all pathways include: passport bio page, SkillSelect EOI, skills assessment (<=3 years old), English test (<=3 years old), 10-year CV…
  - `c17` [employment] Overseas Applicant (Health/Education job-offer) pathway: automatic Gold Pass for skills-assessed teachers, health/allied-health/medical/nursing professionals (A… (translated)
  - `c18` [process] Once invited, applicants have 28 days to apply for nomination and, once nominated, 60 days to apply for the visa.
  - `c19` [residence] 2-year commitment to live and work in Tasmania after nomination approval is mandatory across all pathways; subclass 491 nominees can never later be renominated … (translated)
- Scoring inputs: onshore open, offshore closed, min points 70, min English competent, quota pressure medium (rule: medium), preferred 491/190

## Australian Capital Territory (ACT) 

- Status: **High Demand**; program year 2026-27; opening —; closing —; last verified 2026-10-13 (by seed)
- Official page: https://www.act.gov.au/migration/home; also watched: https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round, https://www.act.gov.au/migration/resources/act-migration-application-fees, https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria, https://www.act.gov.au/migration/skilled-migrants/491-nomination-criteria
- Sources (text): data/knowledge/State Immigrations/ACT/2026-27/ACT Home - updates (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT Canberra Matrix invitation rounds (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT Migration application fees (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT 190 Canberra resident eligibility (fetched 2026-1…
- Subclass 190: availability inherit; allocation —; fee AUD 325 excl. / AUD 357.50 incl. GST (stated_by_state); note: Fee page (updated 27 July 2026): AUD 325 excl. GST, AUD 357.50 incl. GST. The 2026-27 allocation is not yet confirmed by the Australian Government (2025-26: 800 places for each subclass).
- Subclass 491: availability inherit; allocation —; fee AUD 325 excl. / AUD 357.50 incl. GST (stated_by_state); note: Fee page (updated 27 July 2026): AUD 325 excl. GST, AUD 357.50 incl. GST. The 2026-27 allocation is not yet confirmed by the Australian Government (2025-26: 800 places for each subclass).
- Note (en): ACT nomination runs through the merit-ranked Canberra Matrix, not a simple points cutoff -- the ACT's 2026-27 allocation has not yet been confirmed by the Australian Government (2025-26 was 800 places for subclass 190 and 800 for subclass 491, all used), the first 2026-27 invitation round is schedul…
- Note translations: tr yes, zh-Hans yes
- Conditions (14):
  - `c01` [other] Checked against the ACT Migration pages (www.act.gov.au/migration) on 13 October 2026.
  - `c02` [other] 2026-27 allocation: not yet confirmed by the Australian Government. 2025-26 allocation was 800 places for subclass 190 and 800 for subclass 491; total allocatio…
  - `c03` [process] 2026-27 invitation rounds (tentative, may change without notice): week starting 12 October 2026 (subclass 190 only), 25 January 2027, 22 March 2027, 24 May 2027…
  - `c04` [process] Latest published round (11 June 2026): Critical Skill Occupations -- 66 invitations for subclass 190 to Canberra residents, none to overseas applicants; Doctora…
  - `c05` [other] Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nominated (subclass 190, permanent). (translated)
  - `c06` [other] General pathway requires the nominated occupation to be on the ACT Nominated Migration Program Occupation List (last updated 10 October 2025); Doctorate Streaml…
  - `c07` [residence, residence: required] Canberra residents: 190 needs 6 months' Canberra residence and 26 weeks' employment (30+ hrs/week in at least 26 of the 30 weeks before submission); 491 needs 3…
  - `c08` [employment] Overseas applicants: at least 3 years (subclass 190) or 1 year (subclass 491) of full-time post-graduate work experience in the nominated occupation in the last…
  - `c09` [english] English requirement: Competent for subclass 491 (unless the assessing authority requires higher); Proficient or Superior for subclass 190, unless the occupation…
  - `c10` [residence] Mandatory two-year commitment to live and work in Canberra after visa grant (overseas applicants: from arrival), for both subclasses.
  - `c11` [fee] Canberra Matrix fee must be paid within 7 days of submission or it lapses; a Matrix lapses after 6 months without an invitation (extended by 6 months on update,…
  - `c12` [fee] Application fees (incl. GST, page updated 27 July 2026): Canberra Matrix submission AUD 27.50; subclass 190 nomination AUD 357.50; subclass 491 nomination AUD 3…
  - `c13` [process] Once invited, applicants have 14 days to submit the nomination application; once nominated they have 60 days to apply for the visa before the nomination offer e…
  - `c14` [other] National Innovation Visa (subclass 858): the ACT nomination process is not yet open.
- Scoring inputs: onshore open, offshore limited, min points 65, min English proficient, quota pressure high (rule: high), preferred 190/491

## Existing admin rows (`state_nomination_configs`)

Could not be read here (run `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts` to list them). Run the script yourself to see them; they are listed for information only and are never merged.

## What `--execute` does

- Inserts the missing states and their subclass rows, and one audit entry per field (action `seed`), in one transaction; refuses to run unless `--expect-rows N` equals the number of rows listed above.
- Never updates or deletes an existing row; running it twice inserts nothing the second time.
- Needs the tables from `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` first.
