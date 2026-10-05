# Readiness Report — technical and product audit (Phase 0)

Status: **audit only. No report behaviour was changed.** The only code change made in this task is the paid-checkout
flag and the "Free beta" labelling (section 1.3). Nothing here is a legal conclusion; where a behaviour may need legal
review it is marked **LEGAL REVIEW** and carried into `docs/compliance-review-pack.md`.

Audit date: 2026-10-05. Repository state: `main` at `14a3e8d` (paid-checkout gate `85d2c97`, free-beta email fix `14a3e8d`).

---

## 0. Scope, method and limits

**In scope:** the Full Readiness Report form, the engine output the report uses, the result page, the generated PDF, the
report emails, the agent lead PDF, the tests that cover them, and the EN / TR / zh-Hans report text.
**Out of scope (not read for conclusions, not modified):** the AI chat, chat credits, site marketing copy.

**How the evidence was gathered**

1. Read the code: `app/[locale]/(main)/full-check/*` (form steps, `actions.ts`, result page), `lib/readiness/*` (engine,
   points, ranking, scores, state nomination, PDF generator and `pdf-content/*`), `src/lib/readiness/report-generator.ts`,
   `lib/ai/generate-premium-strategy.ts`, `lib/services/report-service.ts`, `app/api/agent/lead/[id]/pdf/route.ts`, the
   data files in `src/data/*`.
2. **Rendered real PDFs.** Ten synthetic profiles × EN / TR / zh-Hans (30 PDFs) were generated through the production PDF
   route (`scripts/render-persona-pdfs.ts`, stubbed database, current engine) and their text was scanned. The profiles:
   `t491-ready`, `t189-ready`, `t190-ready` (skilled profile, 6 years' overseas experience, skills assessment "yes",
   Proficient English, 75 base points, target 491 / 189 / 190), `t500`, `t485`, `t482`, `t820` (partner),
   `notsure` (no target selected), `missing-emp-partner-noEng` (no employment entered, PhD, partner without Functional
   English, no skills assessment), `no-partner-phd` (single, PhD). Plus the repository's own reference persona
   (`reference-se-au`). Output is in the gitignored `temp_tests/personas/audit*/`.
3. Searched the source and the rendered text for the compliance-relevant phrases listed in the brief.

**Limits (stated so they are not mistaken for findings)**

- **No production data was read.** `PROD_DATABASE_URL` is not available in this environment. Stored reports, stored AI
  strategies and live state-status rows were not inspected. Wording that exists only in stored LLM output (for example
  "Seek regional nomination from WA") could not be reproduced; see 13.
- **The AI strategy layer did not run** (no model key in the render environment); it is audited from code (section 13).
  Real production PDFs contain that layer in addition to everything below.
- The Canadian (CA) branch of the product (Express Entry / PNP) exists in the same form, engine and PDF. It is noted where
  it shares code, but this audit and the compliance pack are written for the Australian product; CA needs its own counsel
  (RCIC / Canadian regime) — see the compliance pack.
- Page counts and phrase counts come from the synthetic profiles above; a real report differs by profile.

---

## 1. Architecture and data flow

### 1.1 End-to-end flow

```
Form (3 steps)            app/[locale]/(main)/full-check/step-1-personal.tsx, step-2-career.tsx, step-3-language.tsx
  └─ submitFullCheckWaitlist (actions.ts:684)           parses FormData -> ReadinessInput
       ├─ runReadinessEngine(input)                      lib/readiness/engine.ts  (deterministic, ~7,900 lines)
       ├─ generatePremiumStrategy(report, RAG, locale)   lib/ai/generate-premium-strategy.ts  (LLM, optional; actions.ts:1187)
       ├─ createUserReport(...)  -> user_reports         report_json + input_json + preview_data (stored)
       ├─ CRM lead + internal lead-tier email            computeInternalLeadTier, sendInternalLeadTierEmail
       └─ returns a free "Quick Pathway Check" preview   estimated points + up to 3 pathways
Unlock                    unlockPremiumReport (actions.ts:1450) -> Stripe checkout (flag ON) or free beta (flag OFF)
Result page               full-check/result/page.tsx -> result-view.tsx (refreshStoredReport recomputes the engine part)
PDF                       app/api/reports/[reportId]/pdf -> report-service.ts -> lib/readiness/generate-pdf.ts (jsPDF, ~5,400 lines)
Emails                    report-service.ts (report ready), full-check/actions.ts (lead tier, quick-preview "ready"), full-check-admin.ts
Agent portal              app/[locale]/(portal)/agent/lead/[id]  + app/api/agent/lead/[id]/pdf  (same PDF, regenerated)
```

`refreshStoredReport` (lib/reports/refresh-report.ts) **recomputes the deterministic sections with the current engine on every
view/download** and carries the stored `aiStrategy` forward. So the report a user sees can change after it was "generated";
only the LLM text and the input are frozen. (Relevant for counsel: the report is a live computation, not a record.)

### 1.2 Shared modules the report depends on

`lib/readiness/*` (engine, `pathway-scores`, `pathway-ranking`, `ranked-pathways`, `confidence`, `eligibility-badge`, `visa-gates`,
`points-actions`, `points-booster`, `state-nomination`, `document-inventory`, `financial-roadmap-totals`, `pdf-content/*`),
`lib/points/calculate-australia-points.ts` (the Schedule 6A points table), `lib/state-nomination/*` (rules, occupation lists,
notes), `lib/skills-assessment/*` (assessing-authority registry and fees), `lib/intake/fields.ts` (field vocab shared with the chat
quick-profile card), `src/lib/readiness-engine.ts` (wrapper), `src/data/*` (see 18). The chat's quick-profile card reuses the
same engine and field vocabulary (out of scope here, but a change to shared modules affects it).

### 1.3 The only change made in this task (paid checkout)

- `lib/readiness/paid-checkout.ts`: `READINESS_REPORT_PAID_CHECKOUT_ENABLED === "true"`; anything else is OFF.
- `app/api/checkout/route.ts`: product `premium` returns 403 `paid_checkout_disabled` when OFF (before any report lookup or
  Stripe call). The ebooks and the chat credit checkout are untouched.
- `unlockPremiumReport`: with the flag OFF a non-admin visitor never reaches `/api/checkout`; the report is opened for the
  visitor whose typed email matches the report's own and **nothing is returned to the browser** (typed email is not a
  credential): the secure result link is emailed to the report's own address (the PDF is downloaded from the report page). The "report ready" email says
  "free beta", never "payment confirmed" (`14a3e8d`).
- UI: "Free beta" on the form page header, preview gate, unlock modal and result view (EN / TR / zh-Hans); no price, no
  checkout analytics event. No pricing claims.
- **Side effects to know about (not defects of the gate, but consequences of free-beta mode):** (a) `sendFullCheckAdminEmail`
  ("PAID Assessment Completed") fires only from the Stripe webhook, so free-beta unlocks produce **no admin notification**;
  (b) commission/`Transaction` rows for referring agents are also webhook-only, so free-beta unlocks create none; (c) the report is
  no longer shown on screen straight after unlocking — the visitor opens it from the emailed link; (d) the legacy
  free-promo banner state (`getFreePromoStatus`) still exists and is unrelated to the flag.

---

## 2. The form: what is collected, and what each value is

Legend — **UP** user-provided · **DER** derived from user input · **OFF** official/public source · **DEF** a default the
system supplies when the user said nothing · **UNK** unknown. "Req" = required by the form's server validation.

| Field (FormData name → `ReadinessInput`) | Req | Class | Notes (verified in code) |
|---|---|---|---|
| email, fullName | yes | UP | |
| passportCountry, currentCountry | yes | UP | free text / country list |
| age | yes | UP | stored as typed; parsed to a points band |
| targetCountry | – | UP/DEF | AU default |
| **migrationGoals** (multi-select: direct PR, employer sponsorship, regional, …) and `mainGoal` text | one goal **or** a visa | UP | goal ids map to a visa list (`getVisaSubclassesForGoals`) |
| **visaInterest** (select: "All pathways / Not sure", 500, 485, 482, 189, 190, 491, 820_801, 186) | – | UP | shown **only when no goal is selected**; blank = "Not sure"; a goal selection overwrites it with the mapped list |
| preferredState | – | UP | only asked for direct-PR / regional goals |
| occupation (+ ANZSCO / NOC pick) | yes (not partner) | UP | canonicalised by `canonicalizeOccupationInput` |
| qualificationLevel | yes (not partner) | UP | |
| englishLevel | yes (not partner) | UP | validated against a fixed list |
| **skillsAssessment** (yes/no radio, shown only when the occupation is on a skilled list) | – | **DEF** | UI state starts at `"no"` and a hidden input also posts `"no"` (`full-check-waitlist-form.tsx:241`, `step-2-career.tsx:127-129`). **"Not answered" is stored as "No".** Then bridged into `occupationConfirmed` (`actions.ts` ~728-735). |
| isQualificationRecognized | – | UP | only after "yes" to assessment and overseas degree |
| qualificationAwardedInAustralia / qualificationRegionalAustralia / specialistEducationStemResponse | – | UP (blank allowed) | tri-state with "prefer not to say" |
| offshoreExperienceYears, onshoreExperienceYears | – | UP (blank = absent) | blank becomes `undefined`; see 7 for what the engine does with it |
| sponsorOrFamily (select) | – | UP | 4 AU options; **conflates three meanings** (see 7.3) |
| employerSponsorship, yearsWithCurrentSponsor, yearsInSponsoredPosition, nominationStream, annualSalaryAud | – | UP | |
| residenceState (only if currentCountry = AU), applicationStage | – | UP / DEF | stage defaults to `"planning"` when blank |
| courseName, courseCricosCode, courseCompletionStatus, courseCompletionDate, hasGraduateVisaPathwayIntent | – | UP | 500 / 485 context |
| estimatedBudgetRange, timeline | – | UP | `timeline` sets the Gantt band; budget is stored, not shown |
| biggestConcern | – | UP | free text; also keyword-scanned for pathway detection |
| partner flow: relationshipType, cohabitationDuration, sponsorStatus, previousSponsorship, applicationLocationPreference, relationshipEvidence[] | yes (partner) | UP | feeds the partner report |
| source, analysisProgressId | – | system | |

**There is no document upload anywhere in the report flow** (searched `type="file"`, upload handlers). Every
"evidence" statement in the report therefore reflects **a form answer**, never a supplied or verified document
(see 12).

---

## 3. The Target Visa / Pathway field — does it exist, and does it drive the report?

**It exists in two competing forms** (see 2): the goal cards (`migrationGoals`) and the "specific visa pathway" select
(`visaInterest`, default "All pathways / Not sure"). Both end up in `ReadinessInput.preferredPathway` (a comma list or a
single code) and `mainGoal`. Supported select values: 500, 485, 482, 189, 190, 491, 820_801, 186 and blank. (A 186 option
exists that the brief's list does not name.) There is no single, required "Target visa" field.

**It does not control the report's structure.**

- `detectSubclasses` (engine.ts:646) builds the pathway list from **the explicit selection, plus every skilled subclass the
  occupation is on a list for, plus keyword matches** in `mainGoal`, `preferredPathway`, `sponsorOrFamily`, `biggestConcern`
  and `occupation` ("study" → 500, "work" → 482, "regional" → 491, "sponsor" → 482, "graduate" → 485). Only 820/801 is
  handled separately (a different, 4-page partner report, `buildPartnerReadinessReport`).
- **The ranking ignores the selection.** In the rendered profiles, the "Visa Viability Ranking" was identical for target 491,
  189, 190 and 482: **491 "76% Match — Highly Recommended Pathway", 190 "56% Match — Alternative Option", 189 "41% Match —
  High Risk / Low Probability".** A user who selected **189** is told 491 is the highly recommended pathway and 189 is
  high risk / low probability. A user who selected **500** or **485** (blocked skilled profile) still gets the 189/190/491
  block first ("Preliminary signal only") and their own selected visa is listed *after* it as "Gate/eligibility-based
  pathway — Unlikely fit".
- "Not sure" (blank) produces the same skilled ranking, with whatever the occupation list implies (see section 6 of the
  compliance pack for the proposed alternative). In practice "Not sure" = "the system chooses for you".

---

## 4. The report as it exists — section inventory

The real EN PDF for a skilled profile is **19–23 pages** (zh-Hans 19–21; partner report 4). Reference persona (22 pages):

| p. | Section | Page-level content |
|---|---|---|
| 1 | Cover | "LogiVisa Premium Readiness Assessment — AI-Powered Migration Strategy & Viability Report", "Migration Strategy Prepared for <name>", points gauge "50 / 65 points threshold", badge "Pathway Blocked — Action Required" / "65-point minimum met" |
| 1–2 | Executive summary + **EOI STATUS banner** + "Eligibility check by visa" + Two-Tier Status | |
| 2–3 | Readiness Report Summary + Key Findings | "your top priority is closing the 15-point gap. Fastest path: obtain state nomination." |
| 3–4 | Points breakdown + Points Improvement Tips + Skills Assessment | |
| 4–6 | **Personalized Application Guide** | status, "Actions in priority order", detailed timeline, checklist, costs |
| 5–6 | Questions Relevant to You (FAQ) | 10 Q&As incl. costs, timeline, "Can I quickly boost my points? Yes!" |
| 6–7 | Glossary — How to Read This Report | |
| 7 | **Visa Viability Ranking** | match %, tags |
| 8–11 | State Signal Radar, **Top 2 Recommended States**, State Nomination Tracker (8 states × status/match %/note) | |
| 11 | Lodgement-Ready Checklist | |
| 12 | Signal Snapshot, What May Change Your Position, Structured Pathway Comparison, Reality Checks | |
| 13–14 | Pathway Strength Comparison, Confidence Explanation, **Evidence Readiness Snapshot** | |
| 14–15 | Points Booster Simulator | |
| 16–17 | Financial Roadmap | |
| 17 | Bridge to PR / Typical Progression Pathways | |
| 18 | Pathway Friction / Reality Check; **Historical Invitation Trends**; Living Cost Projection | |
| 19 | Strategic Gantt Chart; Risk Alerts | |
| 19–20 | Audit-Ready Proof Checklist; Gap Analysis & Considerations | |
| 21 | Common Pitfalls | |
| 22 | Official Resources; "Calculate your visa chances…"; disclaimer | |
| (after Overview) | **AI Strategy Summary** — Top Recommended Pathways / Next Steps / Points Booster Roadmap / Timeline Estimate | present only when the LLM call succeeded (not in the renders) |

The result page (`result-view.tsx`) shows a reduced version: points, "Pathway comparison" (visa + reason), the state table with a
**"Match %" column**, the Points Booster table, a Download button. The free preview (shown before unlock) shows
"Base points" and "Likely visa pathways" with a reason for each of up to 3 pathways.

---

## 5. Compliance-relevant behaviour (for counsel) — occurrences and what they actually do

Classification: **A** factual information · **B** mathematical calculation · **C** derived profile comparison ·
**D** personalised recommendation · **E** personalised instruction · **F** outcome / probability implication.
**Type**: **BEHAVIOUR** = the system makes the selection/ranking/judgement; **TERM** = wording only on top of a neutral
computation. A terminology change alone is not treated as a fix anywhere in this audit.

| # | Output (EN as rendered; TR / zh-Hans equivalents exist for each) | Where it comes from | Class | Type | Notes |
|---|---|---|---|---|---|
| 1 | **"EOI STATUS: READY."** (green banner) / "EOI STATUS: BLOCKED. Action Required: …" / "INELIGIBLE. Age Limit Exceeded." — TR "EOI DURUMU: HAZIR", zh "EOI 状态：就绪" | `pdf-personalized-content.ts:104-266`, driven by `pointsEstimate.isEoiEligible` (age < 45 ∧ skills assessment "yes" ∧ English ≥ Competent ∧ points ≥ 65) | C, F | BEHAVIOUR | A readiness-to-lodge verdict. Its inputs are **self-reported** (skills assessment, English). Appears in 5 of 10 rendered profiles (ready ones), ×3 locales. |
| 2 | **"Highly Recommended Pathway"** (tag) — TR "Güçlü Önerilen Yol", zh "强烈推荐路径" | `ranked-pathways.ts:454-523`: first `recommendable` entry of `pathway-ranking.ts` | D | BEHAVIOUR | Selection of one pathway for the user; ignores the selected target (3). |
| 3 | **"High Risk / Low Probability"** — TR "Yüksek Risk / Düşük Olasılık", zh "高风险 / 低概率" | `ranked-pathways.ts:510`, default tag for every non-recommended unblocked pathway | F | BEHAVIOUR | A probability-style label on a visa the user may have chosen (189). |
| 4 | **"76% Match" / "56% Match" / "41% Match"** (and HIGH POTENTIAL / CONDITIONAL / HIGH RISK badges) | `ranked-pathways.ts:468-471`: `confidenceToBaseScore` (high 74 / medium 61 / low 47, fallback 55) + a clamped gap-to-benchmark delta, then re-spaced so figures never tie | C, F | BEHAVIOUR | **Not a measured probability**: hand-set constants. Identical 76/56/41 across target 491, 189, 190 and 482 profiles. Looks like a likelihood; is a constructed index. |
| 5 | **State "Match %"** (WA 46%, TAS 40%, …) and **"Top 2 Recommended States"** | `state-nomination.ts:516-553` (base 55; set values 74/82/60/72/18/6/12; ± fixed adjustments for experience, regional willingness, points, English, residence), `:734` filter → `topRecommendedStates` | D, F | BEHAVIOUR | A ranked state recommendation. Heuristic constants. The tracker also shows a % for every state. |
| 6 | **"your next step is submitting an EOI"** (+ benchmark clause) | `pdf-content/personalized-overview.ts:343-346` (TR "bir sonraki adımınız EOI vermektir", zh "您的下一步是递交 EOI") | E | BEHAVIOUR (shown for "ready" profiles) | Direct instruction to lodge an EOI. 5 of 10 profiles. |
| 7 | **"Month 1: Submit your EOI now (skills assessment completed, English at least Competent, points at least 65)"**; "Month 2-4: Apply for nomination in the states open to you…" | `pdf-content/personalized-guide.ts:249-290` (`readyToLodge`); also the Gantt step "Submit your EOI now" `src/lib/readiness/report-generator.ts:425` | E, F | BEHAVIOUR | A personalised dated application plan. |
| 8 | **"apply immediately"** ("…will be conducted by Australian Computer Society (ACS) -- apply immediately") ; "Complete Skills Assessment", "Reach Points Threshold", "Consider 485 Graduate Visa Pathway", "Prepare Your Documents", "Actions in priority order" | `personalized-guide.ts:146-151, 163-214` | E, D | BEHAVIOUR | Personalised action list with priorities. TR "hemen başvurun", zh "请立即申请". |
| 9 | **"Fastest path: obtain state nomination."**, "your top priority is closing the 15-point gap", "Consider: obtain state nomination", "Fastest ways: 1) Get state nomination (+5/15 pts)" (also in the FAQ answer "Can I quickly boost my points? **Yes!**") | `personalized-overview.ts`, `points-action-text.ts` (`fastestWaysPhrase`), `personalized-faq.ts` | D, E | BEHAVIOUR | Recommends a course of action to raise points. |
| 10 | **"Seek regional nomination from WA"**, "Submit your EOI for the 491 Visa" (user-cited examples) | **Not found in static code.** Most likely stored LLM output (`aiStrategy.topRecommendedPathways[].nextSteps`) | D, E | BEHAVIOUR | Origin unverified (see 13). The LLM is instructed to produce "concrete next steps, ranked state/pathway recommendations". |
| 11 | **"a highly realistic and essential stepping stone to permanent residency"** (491 → 191); "state sponsorship is crucial"; "you must actively pursue single or combined points boosters" | `engine.ts` `buildProgressionPathways` (:5575) | D, F | BEHAVIOUR/TERM | Personalised progression endorsement. |
| 12 | **"Professional help is recommended."** (refusal FAQ); **"Engaging a Registered Migration Agent … is strongly recommended for…"** | `personalized-faq.ts`, financial roadmap RMA row | D | BEHAVIOUR | Recommends a service. Appears in all rendered profiles. |
| 13 | **"Calculate your visa chances and exact points for free in 60 seconds using LogiVisa AI."** | `generate-pdf.ts:96` (last page) | F | TERM | Promotional; "visa chances" implies outcome. 10 of 10 profiles. |
| 14 | **"Estimated Wait 3-7 months / 4-8 / 6-9"** | `src/data/visa-trends.json` per-occupation `estimated_wait` → "Historical Invitation Trends" | F | BEHAVIOUR (data) | A future-time estimate with no stated source. Plus the generic "Total: 12-24 months" and the Month 1–24 timeline (hard-coded). |
| 15 | **Friction Level LOW/MEDIUM/HIGH/EXTREME**; "Pathway friction / Reality Check"; "Strength: Limited/Moderate/Strong signal"; "Confidence: Low" | `pathway-scores.ts:233-262` (gap to benchmark in 0 / 1–15 / 16–25 / > 25 bands, raised by the count of "open states"), `confidence.ts`, `buildPathwayStrengthComparison` (engine.ts:4482) | C, F | BEHAVIOUR | Ordinal outcome-difficulty ratings with fixed thresholds. |
| 16 | **Visa Viability Ranking** "orders every possible visa pathway from strongest to weakest" ; "Signal Snapshot — Ranking: Would be evaluated first once unblocked: 491, 190, 189" | `pathway-ranking.ts` (fit → gap → fixed order), `engine.ts:6083` | D | BEHAVIOUR | A ranked list of visas for the user. |
| 17 | **"Eligibility check by visa (mandatory requirements)"**: "Subclass 491: Eligible to pursue" / "Next step required: Complete a positive skills assessment with ACS" / "Not eligible now" | `lib/readiness/visa-gates.ts` (sourced gates with Home Affairs page citations) | C | mostly BEHAVIOUR (comparison), well-sourced | Statuses are per-visa verdicts built from user answers vs. published criteria. Wording "Eligible to pursue" / "Not eligible now" are eligibility statements. |
| 18 | **Two-Tier Status** "Tier 1 BLOCKED … Tier 2 POTENTIAL SCORE: 70" | `engine.ts:7131` | B, C | BEHAVIOUR | Counterfactual score if a skills assessment were positive. |
| 19 | **Partner report: "Relationship Signal Strength LOW"**, "Sponsor Eligibility: ELIGIBLE", "Genuine Relationship Evidence Assessment … how immigration authorities may interpret your evidence", "Recommended Next Steps: Start collecting joint utilities…; Liaise with … friends or family to prepare statutory declarations (Form 888)" | `partner-sponsorship.ts:55-80`, partner report builder | C, D, E, F | BEHAVIOUR | **Highest-sensitivity item**: scores the genuineness of a relationship and gives preparation instructions for a statutory declaration. Counted evidence items are checkboxes the user ticked. |
| 20 | "State nomination settings change frequently. Treat this as a directional eligibility heatmap, not a formal invitation guarantee." | state tracker footer | – | TERM | A disclaimer sitting under a percentage heatmap. |
| 21 | Cover: "**Premium** Readiness **Assessment**", "AI-Powered Migration **Strategy** & Viability Report", "Migration Strategy Prepared for <name>", "compliance-driven **audit of your visa viability**" | `generate-pdf.ts:616-619, 1933` | – | TERM (framing) | Product description reads as a bespoke assessment/strategy. |
| 22 | Email (quick preview): "We've **assessed** your profile across skilled migration pathways, **points eligibility**, and key risk factors." | `actions.ts` `sendReportReadyEmail` | – | TERM | Describes the product as an assessment. Footer: "automated analysis tool… does not provide migration advice". |
| 23 | `Skills Assessment: Not Done`, `Skills assessment evidence: Missing`, "Evidence status: Provided / Missing" | `skills-assessment-status.ts`, `buildEvidenceReadiness` (engine.ts:4558) | C | BEHAVIOUR | A "Not Done" produced from a **default "no"** (2). "Provided" means a form field was filled (12). |
| 24 | "**Your current score assumes zero**" (employment not entered) | `buildEvidenceReadiness` | – | behaviour is correct to disclose, but the **score itself** treats it as zero (7) | |
| 25 | Document checklist "✅ Valid passport / ✅ Language test results / ✅ Employment reference letters / ✅ Educational documents" (TR / zh builds) | `personalized-guide.ts:~330-375` | C | BEHAVIOUR | Check marks imply possession/verification; they are hard-coded for most items. EN renders bullets only. Emoji glyph support in the PDF font not verified. |

Phrases searched and **not** found as shown text: "visa chances" was found only as #13; "best pathway", "recommended state",
"you should", "you can lodge", "you are eligible", "probability" (EN) were **not found** as generated sentences in the
profiles rendered. (Equivalent *behaviour* exists under other wording: #2, #5, #16, #17.) Occurrence counts per phrase and locale
are in 20.

---

## 6. Points audit

Engine: `lib/readiness/engine.ts` (`buildPointsEstimate` :3654; `buildBaselineAuCalcInput` :3608) over
`lib/points/calculate-australia-points.ts` (Schedule 6A tables). Deterministic and reproducible — **this is the strongest part of
the product** (transparent inputs → table → total).

| Factor | Supplied / derived / assumed / unknown |
|---|---|
| Age | supplied (required). Band derived. **Fallback to `18_24` (25 pts) exists in code when age is missing/unparseable** (`ageOption ?? "18_24"`); unreachable via the form (age required), reachable via the chat quick profile / old rows |
| English | supplied (required). **Fallback to `competent` when unparseable** (`englishOption ?? "competent"`) |
| Overseas employment | supplied *if entered*; **absent → `"lt3"` band = 0 points** (`yearsToOverseasEmploymentOption(undefined)`, engine.ts:3313) |
| Australian employment | same; absent → `"lt1"` = 0 points (:3321) |
| Education | supplied level; `qualificationToEducationOption`; overseas degrees are **0 until a skills assessment is "yes"** and recognised |
| Australian study / regional study / specialist (STEM) | supplied tri-state; "not sure"/blank ⇒ not claimed, flagged "INFORMATION MISSING" |
| Partner | one select; see 7.3 |
| Professional Year, NAATI CCL | **never asked** → always "not claimed"; shown only as scenarios |
| Nomination (+5 / +15) | not held by definition; added only in the per-pathway comparison and scenarios (`pathway-scores.ts`) |
| Skills assessment | default "no" (2) → employment/education points "REQUIRES SKILLS ASSESSMENT 0/…"; `potentialPoints` = the score "as if" positive |

**Findings**

1. **Unknown → value (the brief's explicit concern).** Missing employment is *calculated as zero* and only *disclosed*
   afterwards ("Employment experience not provided … your current score assumes zero", "Work experience not provided"). The total
   (e.g. 50) and everything downstream (gap, friction, ranking, state scores) include that assumption. The report never offers
   "Employment points not assessed". The same pattern applies to an unanswered skills-assessment question (stored "no") and to
   the partner field (blank ⇒ "Partner status not provided" but still scored as 0, same bucket as "no functional English").
2. Points breakdown rows are mostly clear about *why* (REQUIRES SKILLS ASSESSMENT, EXPERIENCE NOT CLAIMED, INFORMATION MISSING).
3. `occupationConfirmed` ("Skills assessment") is **self-reported** and drives EOI STATUS, Hot/Warm lead tier, pathway blocks and
   ranking. Nothing is verified.
4. The Points Booster Simulator (`points-booster.ts`, `points-actions.ts`, engine.ts:4684) computes real table differences, labels
   conditional factors, never sums mutually exclusive factors (nomination / partner groups) and carries the sentence "This
   scenario reflects a mathematical change only and does not represent eligibility or outcome." That is the right framing.
   Weaknesses: scenario rows are phrased as actions ("Obtain a NAATI credentialled community language certification",
   "Complete an Australian Professional Year program"), the list is ordered by gain (an implicit "do this first" ranking), and
   the "Points Improvement Tips" / "Key Findings" / "Fastest path" text repeats the same list as advice (#9).
5. **Keep:** table-based calculation, per-factor breakdown, conditional flags, exclusive-group handling, scenario maths.

---

## 7. Data provenance (what is user-given, derived, official, hard-coded, unknown)

### 7.1 Per output family

| Output | Origin | Source date shown? |
|---|---|---|
| Points table values | OFF (Schedule 6A, `calculate-australia-points.ts`) | not dated in the PDF |
| Visa gates ("Eligibility check by visa") | OFF — Home Affairs pages, with page citations (`visa-gates.ts`, `src/data/visa-gates.json`) | citation shown; page dates not |
| Invitation benchmarks ("recent 491 benchmark of 75 (2026-04-30)") | **hard-coded dataset** `src/data/visa-trends.json`, `generated_on` 2026-04-30, **no per-figure source** | date shown (dataset date) |
| Estimated wait windows | same file, `estimated_wait` | "as of 2026-04-30" shown; no source/method |
| Visa application charges, VAC additional applicants, second instalment | OFF — `src/data/visa-fees.json` + `lib/readiness/constants.ts`; provenance in `src/data/fee-provenance.json` | "post-1 July 2026 schedule" stated; **`visa-fees.json` `source_note` still says "July 2025 increase baseline"** (inconsistent) |
| Assessing authority fee (ACS "AUD 1,647.80 … incl. GST (report's rule)") | OFF + a **report rule** (GST × 1.10 for applicants in Australia, "the rule is the report's, not ACS's") | "last verified 2026-10-03" shown |
| Language test, health, police, translation, RMA fee ranges | **hard-coded planning estimates** (third-party / typical), `visa-fees.json` `mandatory_estimates` / `optional_estimates` and engine text | no source or date shown |
| Living cost (Sydney Couple 3400/1000/360/4760) | **hard-coded** `src/data/living-costs.json` (2026-04-30), default city "Sydney (example city -- no city selected)" | dataset date |
| State nomination status | JSON baseline `state-nomination-status.json` < `state-rules-config.ts` < **StateIntelligence DB (scraper)** < **admin override (`StateNominationConfig`)** | "as of 22 August 2026" appears inside notes; `lastVerifiedAt` exists per state but is not printed as a column |
| State occupation lists | OFF (state pages; `lib/state-nomination/occupation-match.ts`) with explicit "not confirmed" states | page cites in notes |
| Timeline Month 1–24, "12-24 months" | **hard-coded** (`personalized-guide.ts`) | none |
| Match %, ranking, friction, confidence, strength | **hard-coded heuristics** (constants above) | none |

### 7.2 Hard-coded assumptions (selected)

CSIT AUD 79,423 (`constants.ts`, effective 2026-07-01); `POINTS_THRESHOLD` 65; benchmark gap bands 0/15/25; match base
74/61/47; state score constants (55; 74/82/60/72/18/6/12; −6/−8/−10/−12/−14/−16/−18; +6; ×clamp 95); occupation-list factor +10/−10;
"Sydney example city"; one partner and no children when no head-count (`assumedCounts`); timeline constants.

### 7.3 Semantics problems in the form data

- **Partner field conflation.** One select (`sponsorOrFamily`): "Single (+10)", "Partner with Competent English AND positive Skills
  Assessment (+10)", "Partner with Competent English only (+5)", "Partner with NO functional English / Not eligible (0 pts)". The
  engine maps "no functional English", "not provided" **and** older "with functional English" to the same `none_or_unsure` (0)
  bucket (engine.ts:3543-3606), and the second-instalment charge logic reads the same value as "dependants without Functional
  English". "No functional English" is not distinguished from "unknown".
  *Correct labelling today:* "Partner/dependants: user reported no Functional English" is accurate only for the one option text; a
  blank field is reported as "Partner status not provided" in the points reason but still scored 0.
- **English / skills assessment** are single self-reported answers; the PDF's "English evidence: Provided" and "Skills assessment:
  Done" must read "information supplied".
- **Occupation** drives which pathways exist; "occupation confirmed" is the skills-assessment answer under another name.

---

## 8. State nomination audit

Source files: `src/data/state-nomination-status.json` (8 states: status, `offshoreAvailability`, `onshoreAvailability`,
`minimumPoints`, `minimumEnglish`, `minimumExperienceYears`, `offshoreQuotaPressure`, `programWindow`, `specialConditions`),
`lib/state-nomination/state-rules-config.ts` (residence/stream rules, e.g. WA 190 employment contract p.5/9, graduate stream p.13),
`lib/state-intelligence.ts` (scraper rows: status, `officialNote`, `sourceUrl`, `lastVerifiedAt`), admin overrides, occupation lists.

| Question | Finding |
|---|---|
| Source and date per state | Present in data (`sourceUrl`, `lastVerifiedAt`, note "as of 22 August 2026") but **not shown as a column**; citations appear inside free-text notes (e.g. "WA State Nominated Migration Program 2025-26, p. 5, 9") |
| Is "Open" treated as "available to this user"? | **Partly yes.** `isOpen` combines program status with the user's on/offshore position; occupation-list presence adds `listedFor`; stream conditions (WA 190 job offer) set `unavailableFor`. The output then says "Currently open for your occupation and location: WA, TAS, ACT" — an availability finding **personalised to the user's inputs** |
| Does list presence imply nomination chances? | The score formula uses list status as a ±10 factor and a **0** when "not listed"; the table prints the resulting **%** |
| Top Recommended States | `topRecommendedStates` = states with matchLevel ≠ low, open, listed (`state-nomination.ts:734`) → PDF "Top 2 Recommended States" (TR "En Güçlü 2 Eyalet", zh "前 2 个推荐州") |
| User-specific filtering | **Yes** (location, occupation, English, experience, points, preferred state/regional willingness). **LEGAL REVIEW:** filtering published program information by user inputs |
| Information sensible to keep | Published status, stream conditions, residence rules, occupation list result, ROI/invitation facts, source + last-checked date — **without** %, ordering by score, or "recommended" |
| Admin override layer | An admin can change a state's status/note live (`StateNominationConfig`); report text then follows. Provenance of an overridden status is "admin", not "official" — not distinguishable in the PDF |

---

## 9. Financial data audit

| Line | Class | Mandatory? | Source/date in PDF? | Provenance note |
|---|---|---|---|---|
| VAC main applicant (189 6,135; 190/491 6,140; 482 4,015) | official | yes | "post-1 July 2026 schedule" | `fee-provenance.json` |
| VAC partner 18+ / child; second instalment (4,885 / 4,890) | official | partner/child: yes; instalment: conditional | partly | `visa-fees.json`; instalment depends on the partner field semantics (7.3) |
| Assessing-authority fee | official (+ report GST rule) | yes (skilled) | yes ("last verified 2026-10-03") | `src/data/skills-assessment/*-fees.json`, per-authority generators |
| English test (385–590) | third-party estimate | yes | no | hard-coded |
| Health (300–500+) | planning estimate | yes | no | hard-coded; `visa-fees.json` has 350 elsewhere |
| Police (42–200+) | AFP 42 official; others estimate | yes | no | hard-coded |
| NAATI translation (80–200 / page) | third-party estimate | conditional | no | hard-coded |
| RMA / lawyer 3,000–10,000+ | third-party estimate | **optional** | no | hard-coded; adjacent text "strongly recommended" |
| Living cost | planning estimate | n/a | dataset date | **must not be presented as a visa requirement** (it sits under "Premium Sections") |
| "Estimated total … AUD 8,509.80–9,072.80" | derived (sum of the above incl. estimates) | – | no | computed in `financial-roadmap-totals.ts`; mixes official and estimated items |

Gaps: planning estimates carry no source/date; official and estimated lines are summed into one "Estimated total"; the
`visa-fees.json` `source_note` is stale (July 2025).

---

## 10. Historical invitation data

- `visa-trends.json`: per occupation `estimated_points`, `last_invited_point` and `estimated_wait`, `generated_on` 2026-04-30, methodology:
  "Estimated invitation points and wait windows derived from 2025-2026 trend patterns. For planning context only." — **no list of rounds,
  no dates per figure, no source URL.**
- The engine also has `eoi-rounds` / `express-entry-draws` tables (`src/data/eoi-rounds.json`) used elsewhere on the site; the report uses `visa-trends.json`.
- Mixes **observed** (the "recent benchmark" points) with **unsupported prediction** (`estimated_wait`) in one table titled
  "Historical Invitation Trends"; adds a **LogiVisa analysis** layer ("Friction", "gap to benchmark").
  *Flag:* the wait windows are future-oriented estimates without disclosed methodology; the "benchmark" is treated as a bar the user is
  measured against.

---

## 11. Progression / "Bridge to PR"

`engine.ts:5575` `buildProgressionPathways`. Generic patterns exist (491 → 191, 190 → PR, 189 → PR; 500 → 485; 482 → 186; 820 → 801
in the partner report). **But the text is personalised:** "Given your current points gap of 15 points, securing the +15 point
regional nomination via subclass 491 is a highly realistic and essential stepping stone to permanent residency", "state sponsorship is
crucial", "Next step required (Conditional on these steps): Complete a positive skills assessment with ACS." The section header —
"Bridge to PR / Typical Progression Pathways … from your profile's current state to Permanent Residency" — mixes general information with
a personal route. **LEGAL REVIEW.** *Keep* the general pattern information (it is useful and factual); *redesign* the personalisation.

---

## 12. Evidence section — information vs document vs verification

`buildEvidenceReadiness` (engine.ts:4558) and `getEvidenceStatusItems` (:4320). Status values `provided | missing | unclear |
typically_required`. Examples (rendered): "English evidence: **Provided** — English level was provided in the form."; "Identity and
passport: **Provided** — Passport country was provided"; "Occupation and skills evidence: **Unclear**"; "Skills assessment: **Missing**".

- There is **no upload and no verification**. A "Provided" status means *the visitor filled a form field*.
- Three states are collapsed into one label: *information supplied* (what actually happened) · *document supplied* (never
  happens) · *document verified* (never happens). "Evidence Readiness Snapshot" and "Evidence status: Provided" therefore overstate.
- The per-pathway "Evidence status" lists in Pathway Strength Comparison repeat the same idea. The "Audit-Ready Proof Checklist" is a hard-coded
  category list; the Application Guide's TR / zh-Hans checklist strings carry ✅ / ❌ / ⬜ marks (#25).
- Value: the **category map** (which evidence categories typically matter per visa, including health/character/translation) is useful.
  The **status** column is not evidence of anything.

---

## 13. The LLM "Premium AI Strategy" layer (not exercised in the renders)

`lib/ai/generate-premium-strategy.ts`, `lib/ai/strategy-schema.ts`, rendered by `generate-pdf.ts:2283-2470`.

- System prompt: "You are a senior Australian immigration strategist." / "produce candidate-specific strategy: **concrete next steps,
  ranked state/pathway recommendations**, and a points-booster roadmap." Output schema: `topRecommendedPathways[{state, subclass,
  reason, nextSteps[]}]`, `pointsBoosterStrategy[]`, `timelineEstimate`, `executiveSummary`.
- It runs **at submission, before payment**, with RAG over the knowledge base, and is stored in `report_json.aiStrategy`.
- Guardrails exist (engine facts are "ABSOLUTE MATHEMATICAL FACT"; blocked pathways may not be recommended; state-availability and
  points-action rules; a validator `findRecommendationViolations` re-checks the text, with a one-shot rewrite and a deterministic
  fallback `deterministicRecommendations`). They constrain the model **to the engine's own ranking** — i.e. the LLM layer is a
  *narrative amplifier of the same recommendation behaviour* (#2, #5, #16), not an independent one.
- PDF headings: "AI Strategy Summary", "Top Recommended Pathways", "Next Steps", "Points Booster Roadmap", "Timeline Estimate".
- **Origin of the user-cited examples.** "Seek regional nomination from WA" / "Submit your EOI for the 491 Visa" are consistent with
  this layer's `nextSteps` and could not be reproduced statically. *Verification needs a read-only look at stored `aiStrategy` in
  production (`render-persona-pdfs.ts --report <id>` supports it); not done here.*
- LLM output is non-deterministic and unreviewed per user: **LEGAL REVIEW** whether the layer can exist at all in the information-only model.
- `refreshStoredReport` carries this text forward unchanged while the deterministic sections are recomputed, so the two can drift.

---

## 14. Emails, admin notifications, agent lead PDF

### 14.1 Emails (report-related only)

| Email | When | Content | Notes |
|---|---|---|---|
| "Your LogiVisa AI Readiness Report is Ready" (`sendReportReadyEmail`, actions.ts:408, called at :1387) | at submission | "…analysis is complete. **We've assessed your profile across skilled migration pathways, points eligibility, and key risk factors.**" + "Your Quick Results": estimated points and **up to 3 pathway names** + link. Footer: "automated analysis tool … does not provide migration advice… consult a registered MARA agent" | describes the product as an assessment; lists pathways ordered by the engine (a preview of the ranking) |
| "Your Premium Report is Ready" / free-beta variant (`report-service.ts`) | on unlock | "Your payment has been confirmed and your full visa readiness report is now unlocked" (paid) / "available as part of the free beta" | footer: "general information only and not migration advice" |
| Internal lead-tier email (`sendInternalLeadTierEmail`) | at submission, Hot/Warm | "Self-reported potential match — not verified"; tier from `internal-lead-tier.ts` (points ≥ 65 ∧ occupation eligible = Hot) | **internal**; subject "🔥 Hot lead … (self-reported, unverified)" — good on provenance; a points-based lead grade is a form of case assessment used for sales |
| "PAID Assessment Completed" (`full-check-admin.ts`) | Stripe webhook only | all form fields in clear | internal; absent in free beta |
| "Lead assigned" (`agent-notifications.ts`, React email) | claim/assign | lead name, status, link | no recommendation text |

### 14.2 Agent lead PDF

`app/api/agent/lead/[id]/pdf/route.ts` regenerates **the same customer PDF** (`generateReadinessPDF`) from the stored row (after the
same `refreshStoredReport`) for an AGENT (own leads only) or ADMIN. The agent portal labels it **"Assessment report"** (`agent/lead/[id]/page.tsx`)
beside contact details, workflow status, notes, and a **points tier badge** (Hot/Warm/Cold).

Answers to the brief's questions:

| Question | Finding |
|---|---|
| What goes to an agent? | name, email, phone, source, tier, workflow status, notes, and the **whole report PDF** (all form answers in the PDF's User Information block, points, state tracker, AI strategy if any) |
| Personalised recommendations in it? | **Yes — identical to the customer's PDF** (#1–#19), plus the internal tier badge |
| Does it say LogiVisa assessed eligibility? | The PDF cover and "Eligibility check by visa" present exactly that; the portal calls it "Assessment report" |
| Does it identify the source / user-supplied nature? | Partly: the PDF says "based on the information you provided"; the portal does not state "self-reported / automated / not reviewed by any agent" next to it |
| Could it imply an RMA reviewed it? | There is no such wording in the PDF, but **an agent downloading "Assessment report" from a portal named for agents/CRM invites that reading**; no "automated, unreviewed" banner is added for the agent view |
| Admin view | `admin/crm/lead/[id]` uses the same route |

Referral/commission code (`resolveReferralAgent`, `lib/stripe/commission.ts`, `agentId` on the report and in Stripe metadata) ties a
paying report to a referring agent and records commission. **LEGAL REVIEW** whether lead sale / commission around a personalised
report changes the analysis (also: free-beta now creates no commission rows, see 1.3).

---

## 15. Localization (EN / TR / zh-Hans)

- Report text is **not in translation files**. It lives inline in code as `T(locale, en, tr, zh)` ternaries and per-locale dictionaries
  (`generate-pdf.ts:159` `getLocalizedText` with three blocks; `pdf-content/*`; `engine.ts` builders; `pathway-scores.ts`;
  `src/lib/readiness/localization.ts` maps a few English strings). Consequences: every wording change must be made three times; the
  banned-phrase tests scan code and rendered PDFs but only for the phrases they list.
- **Dangerous wording is present in all three locales and is not a pure translation**: "Highly Recommended Pathway" ⇒ TR "Güçlü Önerilen
  Yol", zh "强烈推荐路径" ("strongly recommended"); "High Risk / Low Probability" ⇒ "Yüksek Risk / Düşük Olasılık", "高风险 / 低概率";
  "Match" ⇒ "Uyum", "匹配"; "visa chances" ⇒ "vize şansı", "签证机会"; "Top 2 Recommended States" ⇒ "En Güçlü 2 Eyalet" (*strongest*, a
  different, arguably stronger, word), "前 2 个推荐州". "EOI STATUS: READY" ⇒ "EOI DURUMU: HAZIR", "EOI 状态：就绪". "Submit your EOI now" ⇒ "EOI'nizi şimdi
  gönderin", "立即提交 EOI".
- zh-Hans PDFs run 19–21 pages against 20–23 for EN/TR (extracted text is about half the characters, which is consistent with CJK density). **Section-by-section parity between the three locales was not diffed in this audit** (open item); a banned-phrase scan must in any case be run **per locale on rendered output**, not by translating the EN list.
- The PDF uses an embedded CJK font fallback (`pdf-font-sc.ts`, runtime font load); if the font cannot be loaded it falls back to EN
  labels with raw CJK body text.
- Emails and the form carry their own inline strings (the form: `txt(tr, en, zh)` helpers).

---

## 16. Report length and duplication

Measured on the reference persona (EN, 22 pages, 844 lines of extracted text):

| Repeated concept | Times it appears |
|---|---|
| The "Score now 50; potential … 70; with the nomination … benchmark … (2026-04-30)" sentence per pathway | Two-Tier Status, Visa Viability Ranking, Structured Comparison reality checks, Historical Invitation Trends — 4 places × 3 pathways = 12 occurrences of "Score now 50"; the friction-band paragraphs are also printed twice (Structured Comparison and Pathway Strength Comparison) |
| Total costs ("Estimated total (primary applicant)") | Application Guide, FAQ, Financial Roadmap (3×); ACS fee 3×; second instalment (AUD 4,885) 6× |
| Skills assessment | ~56 mentions of "skills assessment" (43 + 13 capitalised) across the report |
| "general information only / not migration advice" | 3× |
| "State nomination settings change frequently…" | 2× |
| Points boosters | Key Findings, Points Improvement Tips, Application Guide, FAQ, Booster Simulator, AI roadmap |
| State information | Radar (percentages) + Top 2 + full Tracker table + per-pathway availability sentences |
| Strategic Gantt Chart | **rendered twice in the partner (820/801) report**; once in the skilled report |
| Pathway comparison | Visa Viability Ranking, Signal Snapshot, Structured Comparison, Pathway Strength Comparison, Friction/Reality Check |

A defensible information-first version fits ~8–10 pages (section 17 of this audit and the compliance pack, section J).

---

## 17. Section-by-section decision

| Section | Real value? | Recommendation | Why / flag |
|---|---|---|---|
| Cover ("Premium Readiness Assessment / Migration Strategy Prepared for…") | framing only | **REDESIGN** | name the selected target visa; drop "assessment/strategy/audit of your visa viability" framing — *behaviour of the document, not just words* |
| Executive summary + EOI STATUS banner | the facts (points, gates) are useful | **REDESIGN** | replace the verdict with "information supplied / calculation / published requirement / not provided"; remove READY/BLOCKED. **LEGAL REVIEW** |
| "Eligibility check by visa" (visa gates, Home Affairs citations) | **High** — saves research, sourced, reproducible | **KEEP (as Target Visa Requirement Map), REDESIGN statuses** | statuses ("Eligible to pursue", "Not eligible now") are eligibility verdicts; show requirement + user-reported value + "cannot be determined" instead. **LEGAL REVIEW** whether comparison against published criteria is itself assistance |
| Two-Tier Status | medium (counterfactual maths) | **MERGE** into the points section as a mathematical scenario | |
| Readiness Summary / Key Findings / "top priority…Fastest path" | low | **REMOVE** | advice (#9) duplicating the points data |
| Points Breakdown | **High** | **KEEP**, add "not assessed" for unknowns | fix 6.1 |
| Points Improvement Tips | medium (same as simulator) | **MERGE** into Points Scenario Simulator, drop imperative phrasing and gain-ordering as priority | |
| Skills Assessment status | medium | **MERGE** into Evidence & Requirements Map | "Not Done" from default → "not provided" |
| Personalized Application Guide (actions, timeline, checklist, costs) | cost map useful; actions/timeline are advice | **REMOVE** actions + timeline; **MERGE** costs into Financial Cost Map | #7, #8 |
| FAQ ("Questions Relevant to You") | partly general facts (bridging visa, refusal rights) | **MERGE/REMOVE** | "Can I quickly boost my points? Yes!" and "Professional help is recommended" are advice; the rest duplicates other sections |
| Glossary | needed only because the report invented terms (Strength, Friction, Confidence, Hard Gate) | **REMOVE** with those terms | |
| Visa Viability Ranking, match % | none that cannot be got neutrally | **REMOVE** | pure recommendation/ranking/probability-like (#2–4, #16). Not fixable by renaming |
| State Signal Radar + Top 2 Recommended States | low | **REMOVE** | #5 |
| State Nomination Tracker | **High** if neutral | **REDESIGN** | published-program table (status, stream, residence, occupation list result, job-offer requirement, ROI, source, last-checked); no %, no ordering by user fit. **LEGAL REVIEW** for user-input filtering |
| Lodgement-Ready Checklist | low | **REMOVE** or **MERGE** into requirements map | "ready" semantics |
| Signal Snapshot / What May Change Your Position | low | **REMOVE** | outcome-signal framing |
| Structured Pathway Comparison (Confidence / Friction) | medium (the underlying gap-to-benchmark facts) | **REDESIGN** to a neutral comparison table | friction/confidence/strength are ordinal outcome ratings (#15) |
| Pathway Strength Comparison | low | **REMOVE** | |
| Evidence Readiness Snapshot | category map yes, "Provided/Missing" no | **REDESIGN** → Evidence & Requirements Map | section 12 |
| Points Booster Simulator | **High (best premium feature)** | **KEEP**, de-imperative the labels | maintain "mathematical scenario only" line |
| Financial Roadmap | **High** | **KEEP → Financial Cost Map**, split official vs estimate, add source/date to every line, drop RMA "strongly recommended", don't total estimates with fees | section 9 |
| Bridge to PR / Progression | medium | **REDESIGN** | general patterns only; no "your gap/stepping stone" |
| Pathway Friction / Reality Check | low | **REMOVE** | duplicates the comparison |
| Historical Invitation Trends | medium | **REDESIGN** | observed rounds only (date, subclass, occupation context, points, source); **remove `estimated_wait`** |
| Living Cost Projection | low–medium | **REDESIGN** as clearly-labelled "living-cost estimate (not a visa requirement)" or drop | |
| Strategic Gantt Chart | low | **REMOVE** | a personal plan (#7); duplicated in places |
| Risk Alerts | medium (e.g. second-instalment) | **MERGE** into Cost / Requirements map as facts | |
| Audit-Ready Proof Checklist | medium (category list) | **MERGE** into Evidence & Requirements Map; drop ✅ marks | |
| Gap Analysis & Considerations | low | **REMOVE** | |
| Common Pitfalls | medium, general | **KEEP (condensed)** as general information | |
| Official Resources | medium | **KEEP**, plus the Source Register | |
| "Calculate your visa chances…" | marketing | **REMOVE** from the report | #13 |
| AI Strategy Summary | – | **REMOVE** pending legal view | section 13 |
| Partner report: relationship strength / sponsor eligibility / next steps | – | **REMOVE the scoring and instructions**; keep a published-requirements and evidence-category map | #19 |

---

## 18. Source register (data actually used by the report)

| Data | File | Date / version in repo | Source recorded? |
|---|---|---|---|
| Visa fees | `src/data/visa-fees.json` (+ `lib/readiness/constants.ts`) | `generated_on` 2026-04-30; source note says July 2025 baseline | yes in `fee-provenance.json`; stale note in the data file |
| Fee provenance | `src/data/fee-provenance.json` | per fact `last_verified` (e.g. 2026-09-22/24) | yes (document + page + quote) |
| Visa gates | `src/data/visa-gates.json` (generated by `scripts/generate-visa-gates.ts`) | per gate citation | yes (Home Affairs page) |
| Invitation benchmarks / waits | `src/data/visa-trends.json` | 2026-04-30 | **no** |
| Living costs | `src/data/living-costs.json` | 2026-04-30 | **no** |
| State status baseline | `src/data/state-nomination-status.json`, `state-rules-config.ts` | undated rows | partial (notes) |
| State live status | DB `StateIntelligence` / `StateNominationConfig` | `lastVerifiedAt` per row | `sourceUrl` per row |
| State occupation lists | `src/data/state-occupation-lists/*` (+ generator) | per list | yes |
| Assessing authority fees | `src/data/skills-assessment/*-fees.json` (ACS, Engineers Australia, AIMS, …) | `last_verified` | yes (document + page) |
| Occupation ↔ authority map | `lib/skills-assessment/occupation-authority-map.ts`, `src/data/assessing-bodies.json` | – | partial |
| Points table | `lib/points/calculate-australia-points.ts` | – | cites Schedule 6A in text |
| ANZSCO / OSCA / skilled lists | `src/data/anzsco-list.json`, occupations | provenance in `occupation-list-provenance.json` | yes |

---

## 19. Premium value audit (is it worth a paid product, honestly)

| Feature | Saves research time | Combines scattered info | Personalised via transparent inputs | Reproducible | Provenance | Avoids misleading | Verdict |
|---|---|---|---|---|---|---|---|
| Target visa requirement map (gates + citations) | high | high | yes | yes | yes (page cites) | needs status rewording | **keeps** |
| Points calculation | high | medium | yes | yes | table cited | needs "not assessed" | **keeps** |
| Points scenario simulator | high | medium | yes | yes | table | needs non-imperative labels | **keeps (best)** |
| State/territory program information | high | **high** (8 jurisdictions, rules, lists) | filtered by inputs (LEGAL) | partly (live admin layer) | partial | no % / no "recommended" | **keeps if neutral** |
| Evidence & requirements map | medium | medium | no status without upload | yes | partial | rename needed | **keeps as category map** |
| Financial cost map | high | high | partner count, location | yes | official yes / estimates no | split official vs estimate | **keeps** |
| Typical progression | medium | medium | no | yes | partial | de-personalise | **keeps general** |
| Historical invitations | medium | medium | no | yes | **weak** (no per-figure source) | no waits | **keeps if sourced** |
| Source register + freshness | medium | – | – | yes | yes | – | **keeps** |
| Match %, ranking, tags, friction, strength, confidence, EOI status, timeline, AI strategy, state %, "top states" | claims to | – | – | partly (constants) | none | **no** | **not a value case; behaviour risk** |

The value is real but sits in the *assembly and calculation* layers. The judgement layers (ranking, % , verdicts, plans) add
the legal exposure without adding information a user could not read off the tables.

---

## 20. Existing tests and gaps

Relevant tests (all `scripts/test-*.ts`, run by `npm run test:reports`, CI "Report checks"):
`test-report-consistency` (FAQ/Guide/Roadmap agreement, banned strings, 3 locales), `test-report-banned-phrases` (internal
phrases + factual claims + persona consistency, rendered PDFs, 3 locales), `test-reference-report`, `test-two-tier-and-gates`,
`test-visa-gates`, `test-points-booster-subclass`, `test-state-status-precedence`, `test-state-conditions`,
`test-nomination-availability`, `test-occupation-match`, `test-wa-occupations`, `test-fee-provenance`, `test-*-fees`
(authority fee generators), `test-pdf-route`, `test-pdf-generation`, `test-pdf-i18n`, `test-result-page-pdf-parity`, `test-refresh-report`,
`test-content-dates`, `test-report-access`, `test-email-suppression`, `test-webhook-payment-status`, `test-intake-situation`,
`test-personas`, **`test-paid-checkout-flag` (new)**.

Gaps relevant to this audit:

- **No test asserts any target-visa behaviour** (there is none to assert; the ranking ignores the target).
- **No test scans for the compliance phrase set** (READY / Highly Recommended / Match / probability / "Submit your EOI" / "your next
  step" / "Top Recommended" / "visa chances") in EN, TR, zh-Hans. Existing banned-phrase tests target factual errors (e.g. "potential
  score meets the threshold") and some "proceed to the application" wording.
- **No test for "not provided ≠ 0"**; the unknown→zero behaviour is the intended, tested behaviour (the reference-report test asserts the
  "experience not provided" line).
- No email-wording tests for the quick-preview "ready" email.
- No test for the agent portal wording.

### Phrase occurrence matrix (rendered output; 10 profiles × 3 locales)

| Phrase (EN; TR; zh) | Profiles containing it (EN) | Notes |
|---|---|---|
| "EOI STATUS: READY" (HAZIR / 就绪) | 5 / 10 (all "ready" profiles incl. target 482) | identical in TR and zh |
| "EOI STATUS: BLOCKED" | 4 / 10 | |
| "Highly Recommended Pathway" (Güçlü Önerilen Yol; 强烈推荐路径) | 5 / 10 | |
| "High Risk / Low Probability" | 4 / 10 (incl. target 189 and 190) | tagged on the user's own selected visa |
| "Top 2 Recommended States" | 9 / 9 skilled profiles | not in the 4-page partner report |
| "Submit your EOI" / "your next step is" | 5 / 10 | ready profiles only |
| "apply immediately" | 4 / 10 | blocked profiles |
| "Calculate your visa chances" | 10 / 10 | last page |
| "Relationship Signal Strength" | partner only | |
| "NN% Match" | 5 / 10 (76/56/41, identical for every ready profile) | |

---

## 21. Findings summary (priority order, for counsel and for the approval of the plan)

1. **Ranking and tags select and judge pathways for the user** (#2–#4, #16) and **ignore the selected target visa** (3). Behaviour, not wording.
2. **EOI STATUS: READY/BLOCKED, "your next step is submitting an EOI", dated plans, "apply immediately"** (#1, #6–#8): readiness verdicts
   and instructions built on self-reported inputs.
3. **State "Match %" and "Top 2 Recommended States"** (#5): heuristic constants presented as fit scores; ranked state recommendation.
4. **LLM "AI Strategy"** generates recommendations/next steps before payment, unreviewed; origin of "Seek regional nomination from WA".
5. **Unknown → value:** missing employment scored as 0; unanswered skills assessment stored as "No"; partner "no functional English" ≡
   "unknown"; "Provided" for a filled field (6, 7.3, 12).
6. **Partner report scores relationship genuineness and instructs on statutory declarations** (#19).
7. **Wait-time estimates and "12–24 months" timelines without sources** (#14).
8. **Evidence section implies document status where none exists** (12).
9. **Agent portal calls the customer PDF an "Assessment report" with no "automated / unreviewed" notice** (14.2).
10. **Length/duplication:** 19–23 pages; one benchmark sentence repeated ~12×; Gantt rendered twice in places (16).
11. **Provenance gaps:** `visa-trends.json`, `living-costs.json` and planning estimates have no per-figure source; one stale `source_note` (9, 10, 18).
12. **Locale parity:** the three locales are not mechanical translations; TR "En Güçlü 2 Eyalet" and zh "强烈推荐路径" are stronger than the EN.
13. **Live recompute:** `refreshStoredReport` changes the deterministic content after generation; the stored AI text does not change (1.1).

**Unresolved by this audit:** production stored AI text; the live admin overrides of state status; whether emoji marks render in the PDF font;
Canadian-regime questions.
