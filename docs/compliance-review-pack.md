# Compliance review pack — LogiVisa Readiness Report

**For:** Australian immigration counsel (and, for the Canadian branch, Canadian counsel).
**Prepared by:** the LogiVisa engineering team, from the codebase and from PDFs rendered with the production code, on 2026-10-05.
**Companion document:** `docs/readiness-report-audit.md` (technical audit; section numbers below, such as "audit 5", refer to it).

> **This is not legal advice and does not claim that any part of the product is, or is not, compliant.** Nothing here is a
> legal determination. Where a behaviour may need a legal opinion it is marked **Requires legal review**. Quoted output is
> reproduced exactly as the product generates it so that counsel can judge the behaviour of the whole product, not isolated phrases.
> No single phrase is presented as deciding the outcome.

---

## A. What LogiVisa is (as understood from the code)

A website and web application about Australian (and some Canadian) migration. Relevant to this review it offers:

- a free "quick pathway check" (points estimate and up to three visa names),
- **the Readiness Report** — an automated report generated from a questionnaire (on screen and as a PDF), the subject of this pack,
- an AI chat assistant, chat credits, calculators, guides and a points-calculator (**out of scope of this pack**, but counsel should
  see the public positioning separately: for example a guide call-to-action in the repository reads "Stop guessing your visa chances.
  Let LogiVisa AI analyze your profile…" — noted, not changed, not part of this review),
- a lead-capture and CRM portal through which some users are referred to **registered migration agents** (agent role), with referral
  links and commission records.

The code does not show whether the operator is a registered migration agent or a law practice (counsel should confirm). It does show that there is
no step in the report flow at which a human reviews a report.

**Commercial status today.** The report was sold through Stripe. As of this task the paid checkout is **switched off** by a server-side
feature flag and the report is labelled **"Free beta"** (audit 1.3). The payment code is intact and can be re-enabled by configuration.

## B. Exact current workflow

1. The visitor completes a three-step form (audit 2) and accepts Terms and data-processing consent. The visitor chooses either
   "migration goals" or one visa from a list, or leaves the visa blank ("All pathways / Not sure").
2. The server runs a deterministic engine on the answers, then (when a model key is configured) asks a large language model to write a
   "strategy" layer, and stores the whole result (`user_reports`).
3. The visitor is shown a **free preview**: estimated points and up to three "likely visa pathways" with a one-line reason.
4. The visitor asks to open the full report. (Previously: pay by card. Now: free beta; the secure link is emailed to the
   address on the report and the PDF is downloaded from the report page.)
5. The full report is an on-screen summary and a **19–23-page PDF** (4 pages for the partner visa). On every view the deterministic
   part is recomputed with the current engine; the stored LLM text is carried forward.
6. In parallel, the system grades the lead ("Hot" / "Warm" / "Cold", from the points result) for internal follow-up, may assign the lead to
   a registered migration agent (who can open the same PDF in an agent portal), and emails the visitor a "your report is ready" message.

## C. What information users provide

(Full table in audit 2.) Contact: name, email. Profile: passport and current country, **age**, **occupation (ANZSCO)**, **education level**,
**English level**, **self-reported skills-assessment status (yes/no)**, years of overseas and Australian skilled employment (optional),
Australian-study details (optional), **partner status** (one select), employer-sponsorship situation, state of residence, preferred state,
course details (500/485), application stage, budget range, timeline, free-text "biggest concern", and for the partner visa: relationship type,
cohabitation duration, sponsor status, prior sponsorship, application location, and ticked relationship-evidence items.

- **All of it is self-reported.** There is **no document upload and no verification** anywhere in the flow.
- Two answers are collected with defaults that cannot tell "no" from "not answered": the skills-assessment radio starts at "no"; blank
  partner status is scored as zero points.
- Special-category risk: relationship and (for some pathways) health context. Privacy handling is a separate review item (see K).

## D. What LogiVisa calculates

1. **Points** under the Australian points test (Schedule 6A), from the answers: a per-factor table and a total — transparent and reproducible (audit 6).
2. A **points-scenario simulator**: the mathematical effect of adding a factor (for example +5 for a Professional Year), with a stated
   "mathematical change only" line.
3. **Pathway scores**: for 189/190/491 the base score, the score "if nominated" (+5 / +15), and the gap to a stored "recent invitation benchmark".
4. **Friction** (LOW / MEDIUM / HIGH / EXTREME, by the size of that gap and the number of "open" states), **Confidence**, **Strength** labels.
5. A **"Match %"** per pathway (a constructed index: constants by confidence level plus a clamped gap term, **not** a measured probability) and a
   **ranking** of 189/190/491 with tags.
6. A **state score (%)** per state and a **top-2 recommended states** list.
7. **Gate results** per visa: "Eligible to pursue" / "Next step required" / "Not eligible now", from the answers against requirements taken from the
   Home Affairs pages with page citations.
8. An **"EOI STATUS"** verdict (READY / BLOCKED / INELIGIBLE).
9. Cost sums, a month-by-month timeline, a progression text, and (partner visa) a "relationship signal strength" and "sponsor eligibility signal".
10. A free-text **LLM "AI strategy"** (ranked pathways/states, next steps, timeline) constrained to the engine's ranking.

## E. What external information the system uses

(Detailed source register: audit 18.) Visa application charges and the points table (published figures; provenance file with document/page/quote);
sourced visa requirement ("gate") rows with Home Affairs page citations; assessing-authority fees (per-authority generators, last-verified dates);
state and territory nomination status, stream conditions and occupation lists (a static baseline, a scraper table and an **admin override** layer);
a stored dataset of "recent invitation points" and **"estimated wait"** per occupation (dated 2026-04-30, **no per-figure source**); a stored
living-cost table (2026-04-30, no source); hard-coded planning estimates for language tests, health checks, police checks, translation and agent
fees (no source or date shown in the report).

## F. How the report currently personalises information, ranks and compares

- **Personalisation:** the pathway list is not what the user chose; it is the user's selection **plus** every skilled visa the occupation is listed
  for **plus** keyword matches in free text (audit 3).
- **Ranking:** 189/190/491 are ordered "from strongest to weakest" by a fit label (blocked / potential / unclear / unlikely), then by gap size
  (audit 5 #16). The output tags: "Highly Recommended Pathway", "Alternative Option", "High Risk / Low Probability", "Preliminary Signal Only",
  with a "% Match".
- **The selected target visa does not change the ranking.** In rendered profiles, a user who selected 189 was shown 491 "76% Match — Highly
  Recommended Pathway" and 189 "41% Match — High Risk / Low Probability"; the percentages were the same for target 491, 189, 190 and 482.
  A user who selected 500 or 485 saw the skilled block first and their own visa below it as "Unlikely fit".
- **State treatment:** all 8 states/territories are scored for the user and sorted; the top two are printed as "Top 2 Recommended States"
  (TR "En Güçlü 2 Eyalet", zh "前 2 个推荐州"); "currently open for your occupation and location" lists are produced per pathway (audit 8).

## G. Costs, progression, agent lead PDF, emails

- **Costs:** official charges and assessing-authority fees are sourced; language test, health, police, translation, agent fees and living costs
  are hard-coded estimates; an "Estimated total" adds official and estimated items; the agent-fee row says engaging a registered migration agent
  "is strongly recommended" for some situations (audit 9).
- **Progression:** a generic table (491 → 191, 820 → 801, 500 → 485, 482 → 186) mixed with personal sentences ("securing the +15 point regional
  nomination via subclass 491 is a highly realistic and essential stepping stone to permanent residency") (audit 11).
- **Agent lead PDF:** the agent portal serves the **same PDF** the customer receives, under the heading "Assessment report", beside the contact
  details, workflow status and the Hot/Warm/Cold tier. No notice says "automated, self-reported, not reviewed by any agent" (audit 14.2).
- **Emails:** the "ready" email describes the product as having "assessed your profile across skilled migration pathways, points eligibility, and
  key risk factors" and lists up to three pathways; footers say the tool does not provide migration advice (audit 14.1).

## H. How the report differs from a general-information document

It is built from **this person's answers**, names **a pathway for this person** (tags, ranking, "Strength", "Friction"), states **whether they can
proceed** ("EOI STATUS: READY", "Eligible to pursue", "Not eligible now"), says **what to do next and when** (see I), and is framed on its cover as
a "Migration Strategy Prepared for <name>" and an "audit of your visa viability". General-information content (fee tables, points table, state
program summaries, evidence categories, common pitfalls) is interleaved with it. Disclaimers state that the report is general information and not
migration advice; whether that statement, in context, is accurate is a question for counsel (audit 5 #20, #22).

---

## I. Output examples (exact, EN as generated; TR and zh-Hans equivalents exist for each)

Rendered 2026-10-05 from synthetic profiles through the production PDF route (audit 0). "Class": A factual · B calculation · C profile-vs-published
comparison · D personalised recommendation · E personalised instruction · F outcome/probability implication.

| # | Output | Class | Where / when it appears |
|---|---|---|---|
| 1 | **"EOI STATUS: READY."** (green banner) — also "EOI STATUS: BLOCKED. Action Required: Skilled-employment points are not counted … A positive Skills Assessment is also required before a visa application can be lodged." / "INELIGIBLE. Age Limit Exceeded." TR "EOI DURUMU: HAZIR"; zh "EOI 状态：就绪" | C, F | page 2; all profiles with points ≥ 65, assessment "yes", English ≥ Competent |
| 2 | **"Highly Recommended Pathway"** / "Alternative Option" / **"High Risk / Low Probability"** with "491 Visa - **76% Match** HIGH POTENTIAL" / "190 Visa - 56% Match" / "189 Visa - 41% Match HIGH RISK". TR "Güçlü Önerilen Yol" / "Yüksek Risk / Düşük Olasılık" / "Uyum"; zh "强烈推荐路径" / "高风险 / 低概率" / "匹配" | D, F | "Visa Viability Ranking", page 7 |
| 3 | **"Top 2 Recommended States"** — "1. WA - Western Australia (Open (Onshore & Offshore)) … remains possible, but it looks conditional on profile gaps such as points, English, state ties, or work experience", with a **"WA 46% TAS 40% ACT 30%"** heatmap and a per-state "Match" column | D, F | pages 8–11 |
| 4 | **"Test Persona, your next step is submitting an EOI."** (+ "Recent invitation benchmarks -- 189: 95 (20 points short)…") TR "bir sonraki adımınız EOI vermektir"; zh "您的下一步是递交 EOI" | E | summary, "ready" profiles |
| 5 | **"Month 1: Submit your EOI now (skills assessment completed, English at least Competent, points at least 65)"**; "Month 2-4: Apply for nomination in the states open to you while your EOI waits for an invitation"; Gantt step "Submit your EOI now"; "Estimated timeline … Total: 12-24 months"; "Month 5-8: Wait for invitation (depends on your points)" | E, F | Personalized Application Guide; Strategic Gantt Chart |
| 6 | **"…will be conducted by Australian Computer Society (ACS) -- apply immediately."**; "Complete Skills Assessment" / "Reach Points Threshold (15 pts short)" / "**Consider** 485 Graduate Visa Pathway" / "Prepare Your Documents — Start gathering all documents now"; "Actions in priority order" | E, D | Application Guide, blocked profiles |
| 7 | **"your top priority is closing the 15-point gap. Fastest path: obtain state nomination."**; FAQ "**Can I quickly boost my points? Yes!** Fastest ways: 1) Get state nomination (+5/15 pts), 2) Gain more skilled work experience (+5 pts)." | D, E | Key Findings; FAQ |
| 8 | **"Seek regional nomination from WA"**, **"Submit your EOI for the 491 Visa"** (the examples cited by the product owner) | D, E | **Not found in static code**; consistent with the stored LLM "AI Strategy → Next Steps". Not reproduced; requires a read of stored production reports |
| 9 | **"Given your current points gap of 15 points, securing the +15 point regional nomination via subclass 491 is a highly realistic and essential stepping stone to permanent residency (subclass 191)."** / "state sponsorship is crucial" / "you must actively pursue single or combined points boosters" | D, F | "Bridge to PR / Typical Progression Pathways" |
| 10 | **"Subclass 491: Eligible to pursue."** / "Subclass 189: Eligible, but below recent invitation levels (your 75 vs recent 95, 20 points short)" / "Subclass 190: Next step required: Secure a Western Australian job offer: a full-time employment contract of at least six months" / "Not eligible now" | C | "Eligibility check by visa (mandatory requirements)", sourced to Home Affairs pages |
| 11 | **Friction Level: LOW / MEDIUM / HIGH**; "Strength: Limited signal"; "Confidence: Low"; "Reality Check: Points are not your barrier for 491; securing a nomination is." | C, F | Structured Pathway Comparison; Pathway Strength Comparison |
| 12 | **"Estimated Wait 3-7 months / 4-8 months / 6-9 months"** (reference data, per occupation) | F | Historical Invitation Trends |
| 13 | **"Professional help is recommended."** / **"Engaging a Registered Migration Agent … is strongly recommended for applications involving prior visa refusals, complex employment histories…"** | D | FAQ; Financial Roadmap |
| 14 | **"Calculate your visa chances and exact points for free in 60 seconds using LogiVisa AI."** | F | last page (also on the partner report) |
| 15 | **Partner visa report:** "Relationship Signal Strength **LOW** (Limited evidence/cohabitation)"; "Genuine Relationship Evidence Assessment … a rough indication of how immigration authorities may interpret your evidence richness"; "Sponsor Eligibility Signal … **ELIGIBLE**"; "Recommended Next Steps: Start collecting joint utilities, leases, and financial statements to establish relationship genuineness…; **Liaise with Australian citizen/PR friends or family to prepare statutory declarations (Form 888).**" | C, D, E, F | the 4-page 820/801 report |
| 16 | **Cover:** "LogiVisa **Premium Readiness Assessment** — AI-Powered **Migration Strategy** & Viability Report"; "**Migration Strategy Prepared for** <name>"; "This report is a compliance-driven audit of your visa viability against binding 1 July 2026 regulatory thresholds…"; badge "Pathway Blocked — Action Required" / "65-point minimum met" | – (framing) | page 1 |
| 17 | **Email:** "We've assessed your profile across skilled migration pathways, points eligibility, and key risk factors." | – (framing) | "report is ready" email |
| 18 | **Evidence:** "English evidence: **Provided** — English level was provided in the form."; "Skills Assessment: **Not Done**" (from a default "no"); TR/zh checklist "✅ Pasaport (geçerli) / ✅ Dil testi sonuçları / ✅ İş deneyimi mektupları" | C | Evidence Readiness Snapshot; Application Guide |
| 19 | **"Your current score assumes zero."** (employment not entered) — and the 50-point total, the gap, friction, ranking and state scores are computed on that assumption | B, C | Evidence Readiness Snapshot; points |
| 20 | **AI Strategy Summary → Top Recommended Pathways → Next Steps; Points Booster Roadmap; Timeline Estimate** (LLM text; "You are a senior Australian immigration strategist") | D, E, F | in production PDFs when the model call succeeds; not in the renders |

Not found as generated sentences in the renders: "best pathway", "recommended state", "you should", "you can lodge", "you are eligible", "probability"
(EN). **The equivalent behaviour exists under other wording** (rows 1–3, 10), which is why the product's behaviour, not its vocabulary, is the subject
of this review.

---

## J. Proposed alternative report behaviour (for review — nothing here is implemented)

**Principle.** Behaviour change, not vocabulary change. Remove the functions that *choose, rank, grade, predict or instruct*; keep the functions
that *assemble, calculate transparently and cite*. No disguised successor (no "signal", "friction", "fit", "score" or ordering by user data).

### J.1 Information model — five labelled kinds of statement

Every line of the report is exactly one of: **(1) Information you supplied** · **(2) Mathematical calculation** (inputs shown) ·
**(3) Published requirement / criterion** (with source and source date) · **(4) Published program or historical data** (with source and date) ·
**(5) Unknown** (labels: *Not provided* · *Cannot be determined from the information available* · *Not applicable*).
No global conclusion ("eligible", "ready", "best", "chance", "probability", "recommended") and no instruction to the reader.

### J.2 Target Visa field

A single **required** field "Target visa / pathway": 500, 485, 482, 186, 189, 190, 491, 820/801, **Not sure** (replacing the two competing controls).
It selects the report's primary subject; no inference from occupation or free text may add a pathway to the primary section.

### J.3 Report with a selected target (≈ 8–10 pages)

1. Cover + selected target visa + date + "information only" statement. 2. Executive Information Summary (target; what was supplied; the calculations; what is
unknown; which other pathways are covered; source dates) — **no recommendation**. 3. Target Visa Requirement Map (published requirement | supplied information |
calculation | source | date | status: Provided / Not provided / Cannot be determined / Not applicable). 4. Points position (separating base points,
pathway-specific nomination points, supplied factors, unknown factors; unknown employment = "Employment points not assessed") + Scenario Simulator
("This is a mathematical scenario only. It does not indicate eligibility or an outcome."). 5. State/territory published program information (if 190/491).
6. Evidence & Requirements Map. 7. Financial Cost Map (official charges vs fees vs estimates vs living costs, each with source and date).
8. Alternative-pathway comparison (neutral, fixed order, same columns as 3). 9. Typical progression patterns + observed invitation history. 10. Sources,
freshness, limitations, and the separate "request a registered migration agent" route.

### J.4 What happens when the user selects **"Not sure"** (exact specification)

This is expected to be the most common choice. The system must not choose, rank, score or recommend a pathway, a state or a next step.

**Page 1 — cover.** Title "Pathway Overview". Statement: *"You selected 'Not sure'. No target pathway was selected, so this report does not focus on one
pathway and does not compare them on your behalf."* Date and "information only" statement.

**Page 2 — what you told us.** A table of every supplied answer with its status (*Provided* / *Not provided*), a column marking which pathway families each
answer is relevant to, and a list "Not provided". **"Not provided" is never converted into a value** (no "0 years", no "No").

**Page 3 — Pathway Overview table.** One row per supported pathway family, in a **fixed order that depends on nothing about the user**: the order of the options in
the form's own select — **500, 485, 482, 189, 190, 491, 820/801** (and 186 where offered) — with 189, 190 and 491 as three separate rows (never merged
into a "skilled" winner). Columns, identical for every row, with **no colours, icons, percentages or ordering by fit**:

| Pathway | Published requirement context (one line, cited) | Information you supplied that is relevant | Calculation (where one exists) | Information not provided | Evidence categories | Published cost (official, dated) | Progression context (general) | Official source and date |

**Pages 4–5 — comparison of what is relevant (not a decision).** A short fixed-text list "Information that is relevant to comparing these pathways":
age relative to the published age limits · English test result · skills-assessment status and the assessing body · whether the occupation appears on the
relevant published list · employer-sponsorship situation · study history in Australia · partner status · location · preferred state. Each item states
only *where* it matters in the table; it does not say which pathway to pursue.

**Page 6 — points (once).** The mathematical points position for the points-tested family: base points; the +5 (190) and +15 (491) nomination points shown
as separate, pathway-specific lines; supplied vs unknown factors; the scenario simulator with its fixed disclaimer.

**Page 7 — state and territory program information.** All eight jurisdictions, fixed alphabetical order: published stream, published residence/location
requirement, published occupation requirement (result of looking up the supplied occupation on the published list, with *not confirmed* where no list exists),
published job-offer requirement, published invitation / ROI information, **status as published**, source, last-checked date. **No percentage, no "open to you",
no ordering, no "top" states.**

**Page 8 — evidence categories** by pathway family (a matrix), with a separate column "What you told us" (information supplied — never "provided/verified").

**Page 9 — costs** by pathway family: official charges (subclass, source, effective date), assessing-authority fees (authority, source, date), and a separate
block of *estimates* (language test, health, police, translation, optional professional services) each labelled as an estimate, plus living-cost estimates
labelled "not a visa requirement". No grand total mixing official and estimated lines.

**Page 10 — typical progression patterns and historical invitation data** (date, subclass, occupation context, points reference, source — observed rounds
only; **no waiting-time estimate**), then Sources / Freshness / Limitations and the separate agent route.

**Open design questions for counsel on "Not sure"** (Q14): whether showing a family-by-family overview with *the user's own supplied information next to each
published requirement* is itself immigration assistance; whether a fixed all-families table is safer than showing only families for which the user supplied
relevant information (the second is a user-input filter and would be flagged as such); and whether the sentence "Information that is relevant to comparing
pathways" crosses a line.

### J.5 What the existing sections become (summary; full KEEP/REDESIGN/MERGE/REMOVE in audit 17)

KEEP: points table calculation, points scenario simulator (de-imperative), visa requirement map (rewritten statuses), cost data (split by provenance),
common pitfalls (condensed), official resources, source register. REDESIGN: state tracker (published facts only), evidence section (information supplied,
not "provided"), progression (general patterns), invitation history (observed only), cover. REMOVE: Visa Viability Ranking, match %, tags, EOI STATUS,
Top-2 states, state %, Friction/Strength/Confidence, Signal Snapshot, "next step" and "apply immediately" text, dated plans and Gantt, FAQ advice lines,
"Calculate your visa chances", the partner relationship scoring and instructions, and (pending counsel) the LLM strategy layer. Target length ≈ 8–10 pages
against 19–23 today.

### J.6 Agent pathway

Keep the agent referral and the agent portal. Separate **LogiVisa's informational document** from **a registered migration agent's professional
service**: no wording that an agent is reviewing the report unless one has agreed to; the agent-facing PDF becomes "Information supplied by the
applicant — automated, unreviewed" without tier grades presented as an assessment; a clearly separate "Request a review by a registered migration agent"
action that never converts the report into an agent-endorsed assessment.

### J.7 Kill switch (planned, not built)

`READINESS_REPORT_MODE` = `REVIEW` (default; internal testing, the risky output blocks disabled, no paid sale) · `INFORMATION` (conservative report only) ·
`DISABLED`. The UI never claims legal compliance.

---

## K. Areas that require legal review (consolidated)

1. Whether the **current automated report as a whole** is immigration assistance, and which behaviours (I rows 1–11, 15, 20) create that concern.
2. The **selection and ranking of pathways** (rows 2, 10, 11) and **states** (row 3).
3. **Readiness-to-lodge / eligibility verdicts** built on self-reported inputs (rows 1, 10).
4. **Instructions and dated plans** (rows 4–7, 15), including the personalised "stepping stone" progression (row 9).
5. **Outcome and probability implications**: match %, High Risk / Low Probability, friction, estimated waits, "visa chances" (rows 2, 11, 12, 14).
6. **Scoring a relationship's genuineness** and instructing on a statutory declaration (row 15).
7. **LLM-generated strategy** shown to a user (row 20).
8. **Self-reported data presented as evidence** (row 18) and **unknown values scored as zero** (row 19).
9. **Agent referral and commission** around a personalised report; the agent portal's "Assessment report" label; lead grading from the points result.
10. **Consumer-law and advertising** aspects of the report, the emails and the public site (outside this pack's scope but relevant).
11. **Privacy / sensitive data** (relationship and health context; AI processing of answers; sharing with agents) — a separate review.
12. The **Canadian** branch (same engine and PDF for Express Entry / PNP): a separate regime and counsel.

---

## L. Questions for Australian immigration counsel (not answered here)

1. Does the current automated report constitute immigration assistance?
2. Which specific report behaviours create that concern? (We suggest rows 1–11, 15, 20 of section I as the starting list.)
3. Can LogiVisa provide a personalised points calculation?
4. Can LogiVisa compare user-provided information against published visa criteria?
5. Can LogiVisa identify missing information?
6. Can LogiVisa provide state/program information filtered by user inputs?
7. Can LogiVisa present multiple pathways without selecting one?
8. Can LogiVisa produce a paid personalised research/information report?
9. Which personalised conclusions must be removed?
10. Which outputs can remain?
11. Which functions should be performed only by a registered migration agent or legal practitioner?
12. Would a registered-migration-agent review / sign-off model permit additional functionality?
13. What wording should be avoided?
14. Does the proposed "Not sure" **Pathway Overview** (J.4) create immigration-assistance risk?
15. Does the existing agent lead PDF (and the portal label "Assessment report") create additional issues?
16. Are there consumer-law, advertising or other regulatory considerations arising from the report?
17. Does charging for the report change the legal analysis? (The product is currently a free beta; a paid version existed.)

Context for counsel that engineering can supply: the PDFs for the synthetic profiles (EN / TR / zh-Hans), the form screens, the data source register, and the
LLM prompt. Not available to engineering: stored production AI text (can be read read-only), the operator's registration status.

---

## M. What is waiting for legal approval (nothing below is built)

| Feature | Status |
|---|---|
| Any ranking, scoring, tagging or ordering of pathways or states by user data | **Removed in the proposal; not to be reintroduced without approval** |
| "Readiness" / "eligible" / "ready to lodge" verdicts (EOI STATUS, gate statuses) | **Waiting**; proposal shows requirement vs supplied information only |
| Match %, friction, strength, confidence, probability-like labels | **Waiting (proposed removed)** |
| Next-step / action / timeline text; dated plans; Gantt | **Waiting (proposed removed)** |
| State information filtered by user inputs | **Waiting** — the proposal lists all jurisdictions unfiltered |
| LLM strategy layer | **Waiting (proposed removed)** |
| Partner relationship scoring and instructions | **Waiting (proposed removed)** |
| Paid sale of the report | **Off** (feature flag); waiting on Q8, Q16, Q17 |
| Agent-facing document and "request review" action | **Waiting**; design in J.6 |
| Points calculator and scenario simulator, requirement map, cost map, source register | proposed to **remain**; still subject to Q3–Q5 |

---

## N. Statement of limits

This pack describes behaviour; it makes no claim of compliance with the *Migration Act 1958* (Cth), the *Migration Agents Regulations*, the Australian
Consumer Law, privacy law or any other law, and it should not be quoted as such. The final determination, and the product boundary, must come from
qualified Australian counsel.
