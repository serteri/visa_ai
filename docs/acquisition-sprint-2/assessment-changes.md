# Assessment visibility and product audit

Date: 17 October 2026. This addendum extends Sprint 2. Acquisition reporting remains **DATA NOT AVAILABLE**, and the channel decision remains **E — Not enough evidence yet**.

## Evidence and actual prior behaviour

**EXECUTED — production inspection and code tracing.** Inspected `/`, `/full-check` and the no-ID result redirect at desktop 1440px and mobile 390px. Read the actual intake action, report service, result access checks, PDF route, checkout gate, email calls and analytics. Screenshots and raw DOM inventory are retained locally in `scratch/assessment-addendum/before/`. No customer record was inspected.

The research-first homepage had no meaningful assessment section. The live desktop and mobile navbar already had Start Assessment. The intake had three sections but no page h1; its detailed explanation followed the form on mobile. The live report price was **A$39.99 including GST**. The result HTML is an access/header page; the complete report is a PDF, not a full HTML report.

Submission stores a report, establishes access and invokes customer/internal lead emails. A locked report is opened by the configured paid Stripe flow, free-beta mode when the server flag explicitly disables checkout, or an authorised admin unlock. PDF access checks remain in place. The server defaults to paid checkout. Unlock can trigger report-ready email. Actual payment, delivery and report creation were therefore **NOT EXECUTED** in production; they would send messages or transact. Stubbed fixtures establish code behaviour, not live deliverability or a completed customer purchase.

## Homepage and entry changes

**IMPLEMENTED.** A substantial LogiVisa Assessment section follows the existing research/tools section and precedes the FAQ. It explains three sections, supplied information, the PDF/access outcome, possible payment and the information/advice boundary. The research-first hero remains. Its CTA opens `/full-check`; existing desktop/mobile navbar entries remain. Navigation now explicitly calls the authority lookup **Skills Assessment Finder**, distinct from the broader assessment/report.

English, Turkish and Simplified Chinese use the existing design and locale routes. No new acquisition channel or page factory was introduced.

## Intake and question decisions

**IMPLEMENTED.** A concise introduction now precedes the first question at both widths: process, output, information to have ready, name/email purpose, sensitive-document warning and boundary. It accurately states that the PDF holds the full content, discloses that refresh/leaving can lose unsaved entries, and makes no completion-time claim.

This matrix covers the current Australian question inventory and conditional branches. “Keep” means the existing engine/output still consumes the field; it does not assert that a general-information report needs every such field. Blank/unknown values must not become verified facts. No identity, financial or relationship document upload is required.

| Field / question | Purpose and output use | Decision, usability and sensitivity |
|---|---|---|
| Full name | Report identification and email salutation | Keep; explain use. Personal data, excluded from GA. |
| Email | Access/delivery contact | Keep; email-format validation, correct error association. Personal data, excluded from GA. |
| Destination | Country-specific content and schema | Keep; Australia is the active public scope; Canada remains server-flag controlled. |
| Visa interest / topic | Sets requested topic and report order | Relabel Visa topic to research; explain Not sure and no recommendation. |
| Current country | Supplied circumstance and source context | Keep; required country selection; no address collected. |
| Passport country | Nationality-related published information context | Keep; country only, no passport number; not an eligibility verdict. |
| Age | Supplied snapshot and existing points inputs | Keep; whole-number format 0–120 is a data-format check, not an eligible age range. |
| Residence state | Current AU state context | Keep conditional for AU residents in the non-Partner branch. |
| Employer sponsorship status | Existing sponsored-topic context | Keep existing non-Partner AU question; it remains more prominent than ideal for skilled-independent research. Further narrowing requires reviewing engine dependencies. |
| Preferred state | Orders state research context | Keep optional for 190/491/Not sure; preference is not nomination likelihood. |
| 186 nomination stream | Existing stream information context | Keep conditional with Not sure. Existing explanatory rule shorthand is not independently revalidated by this sprint. |
| Labour agreement / DAMA employer | Existing 186 stream input | Keep conditional; self-reported checkbox is unverified. |
| Years in sponsored position | Existing sponsored work context | Keep conditional; not a decision that a period qualifies. |
| Course name | User-provided course context | Keep optional on course topics; free text excluded from GA. |
| CRICOS code | Course reference context | Keep optional; no claim of provider/course verification. |
| Course completion status | Existing study context | Keep optional, explicit non-disclosure option. |
| Course completion date | Existing study context | Keep conditional month input; not a visa deadline determination. |
| Occupation / ANZSCO | Occupation research context | Keep required non-Partner; step validation prevents advancing with an empty occupation. Code entry is supported, but duties matching still needs professional verification. |
| Skills assessment completed | Explicit self-reported assessment status | Keep Yes/No radio. It alone controls the foreign-degree recognition follow-up. |
| Relationship type | Partner snapshot | Keep Partner-only; sensitive self-report, not a relationship determination. |
| Time living together | Partner snapshot | Keep Partner-only; required category; does not establish a legal relationship. |
| Sponsor status | Partner snapshot | Keep Partner-only; self-reported nationality/residence category, not verified status. |
| Previous sponsorship | Partner snapshot and published-rule context | Keep Partner-only; prevent an unanswered field becoming a clean sponsorship signal. |
| Relationship evidence types | Lists entered/not-entered document categories | Keep optional checkboxes; no files reviewed, no evidence-sufficiency decision. |
| English level | Existing published requirement/points context | Keep non-Partner; long selected labels wrap on mobile. No test score evidence is verified. |
| Qualification level | Existing education context | Keep non-Partner; required selection; published points are not an individual award. |
| Qualification awarded in Australia | Existing education context | Keep conditional; unknown remains possible. |
| Regional Australian study | Existing education context | Keep conditional and optional; unverified self-report. |
| Foreign qualification recognition | Existing education context | Keep only after explicit positive skills-assessment answer; removed conflicting duplicate trigger. |
| Specialist STEM research degree | Existing education context | Keep conditional checkbox for relevant AU research qualifications; no credential review. |
| Annual salary | Sponsored-topic information | **Simplify:** optional, shown only for 482/186/494/Not sure; no longer required for all non-Partner AU users. Blank passes as unknown. Financial disclosure excluded from GA. |
| Offshore experience years | Existing experience/points context | Keep optional; distinguish blank from zero; shared numeric parsing. |
| Onshore experience years | Existing experience/points context | Keep optional; distinguish blank from zero; shared numeric parsing. |
| Relationship category for partner points | Existing points-input context | Keep non-Partner; clarify label and wrap long values. User selection is not a points verification. |
| Graduate visa pathway intent | Existing graduate research context | Keep optional; not a strategy recommendation. |
| Occupation confirmed | Duplicated skills-assessment implication | **Remove** visible duplicate and state; it could reveal degree-recognition follow-ups despite Skills assessment = No. |
| Budget range | Primarily internal lead segmentation | **Remove** visible question; unnecessary financial disclosure for the report. |
| Timeline | Primarily internal lead segmentation | **Remove** visible question; no unsupported timing promise replaces it. |
| Biggest concern | Free-form lead/context capture | **Remove** visible question; reduces free-text sensitive-data exposure. |
| Terms and separate marketing consent | Processing acknowledgement / optional contact preference | Keep distinct existing controls; not used as an eligibility input. No test accepted terms and submitted a live report. |

Hidden compatibility/source fields are not additional visible questions. Removed fields remain accepted by older server/API contracts for compatibility; this sprint does not erase previously stored data. Canada-only migration-goal, NOC/TEER and inland/outland controls were inspected in code and left behind their existing flag; a Canadian production intake was not exercised.

## Flow and result changes

**IMPLEMENTED.** Three labelled progress steps, validation before Next and again at final submission, an alert summary and focus to the first invalid control. Back retains mounted input values. Existing server errors remain surfaced. Loading now says the report is being prepared; fabricated analysis/progress messaging was removed. Long select values and the final button wrap at mobile width. No account prerequisite, autosave or resume promise was added.

The result now distinguishes supplied/unverified entries, general published information, source dates/references, and questions requiring professional verification. It offers relevant research tools, official references and professional-help continuation. It does not promise that an access email was delivered. Report content/access gating remains intact.

The Partner path exposed an existing `820_801` country-schema rejection; the guard now accepts that existing Australian key. Its contents sidebar now promises its actual four content groups rather than ten skilled-report sections. The Partner PDF retains its own renderer, uses the neutral information-report cover/footer, labels supplied entries, leaves missing entries as Not provided, removes the unsupported clean sponsorship-bar signal, and provides an official Home Affairs reference and professional-verification boundary. No engine scoring or visa rule arithmetic was rewritten.

## Analytics and privacy

**IMPLEMENTED; reporting access unavailable.** One delegated `assessment_entry_click` per actual link click with fixed `entry_source`: homepage, navbar, occupation, visa_page, tool or other. Existing `full_check_submit` / `full_check_complete` names are preserved; `full_check_start` records the first input change once. Existing checkout/unlock/PDF event names remain. Event payloads are allowlisted; assessment-related code no longer sends report IDs, answers, names, email or free text.

GA is not initialised on private result documents or recognised prefilled assessment query documents. The GA disable flag also blocks custom events there; private-document client continuations remain disabled. Result metadata uses noindex/nofollow and no-referrer. This is a documented route boundary, not a claim that arbitrary future URL parameters or account-wide enhanced measurement settings were audited. Authenticated GA/GSC reports remain **DATA NOT AVAILABLE**, as authorised by the user; test events are not acquisition results.

## Verification and limits

**EXECUTED — local automated checks.** Typecheck, build, scoped UI/analytics lint, intake validation/privacy/localised intro tests; six synthetic Partner PDFs through the real token-gated PDF route with a stub database; existing access, paid/free-beta, input-status, result/PDF parity, product naming, marketing readiness, banned-phrase and no-verdict-route suites. Optional production-database parity was skipped because `PROD_DATABASE_URL` was unavailable. The English Partner sample's three rendered pages were visually inspected for clipping, overlap and footer readability.

Browser checks use desktop 1440px and mobile 390px, abort GA requests and every POST, and fail if any POST is attempted. They cover the research-first hierarchy, homepage/navbar entry events once, real CTA navigation, intro and actual price disclosure, validation, Back retention, removed questions, long labels, one safe start event, Partner conditional content and mobile button fit, localised mobile pages, and prefilled-query GA suppression. Final production evidence is recorded separately after deployment; local checks alone are not production evidence.

**DEFERRED / NOT EXECUTED.** Real email receipt, Stripe checkout/payment, creating a customer report, and opening a real private customer result. Sending/transaction authorisation is required for those actions; synthetic route/access fixtures do not prove live delivery. Further engine simplification, saved progress, comprehensive legal/source refresh of every legacy topic, historic-data deletion and authenticated analytics configuration/reporting are outside this improvement. The current enquiry still collects personal/context fields; the audit does not label them anonymous. No outreach, post or partner distribution was sent.
