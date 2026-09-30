/**
 * Regenerates src/data/visa-gates.json -- the sourced hard-gate matrix per visa -- from the Home Affairs visa
 * documents in data/knowledge (read by exact filename):
 *
 *   189 / 190 / 491  the three 23 September 2026 visa pages
 *   186              "Subclass 186-Employer Nomination Scheme visa.pdf": Direct Entry (pp.1-28), Labour Agreement
 *                    (pp.29-46, not evaluated by the report) and Temporary Residence Transition (pp.47-68)
 *   482              Core Skills stream (01 July 2026) + "English proficiency (subclass 482)"; there is NO Specialist
 *                    Skills stream document in data/knowledge -- only its income threshold (SSIT) is stated, in the
 *                    482 and 186 documents; everything else about that stream is recorded as missing
 *   485 / 500 / 820  the 23 September 2026 pages (820: temporary partner visa; 801 shares its relationship gates)
 *
 * Each gate is a mandatory requirement ("You must ...") with the page and a verbatim quote, found by searching the
 * PDF text -- the generator FAILS if a quote is not in its document window, so nothing is invented. Numeric
 * thresholds (age limits, years of experience, points, CSIT / SSIT with their effective dates) are recorded with the
 * gate. What the documents do not state is listed under `missing`. The evaluation of each gate against the intake
 * lives in lib/readiness/visa-gates.ts (keyed by gate id); `intakeFields` here documents the mapping.
 *
 * Usage:
 *   npx tsx scripts/generate-visa-gates.ts           writes the JSON
 *   npx tsx scripts/generate-visa-gates.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PDFParse } from "pdf-parse";

import { NEEDS_HUMAN_VERIFICATION, gateFailureKind } from "../lib/readiness/visa-gate-kinds";

export const VISA_GATES_OUT_FILE = "src/data/visa-gates.json";
// Pinned so a regenerate on another day is not drift; bump when a source document is replaced.
const EXTRACTED_DATE = "2026-09-30";

const D = "data/knowledge";
export const VISA_GATE_DOCUMENTS: Record<string, string> = {
  "189": `${D}/Skilled Independent visa (subclass 189) Points-tested stream/Skilled Independent visa (subclass 189) Points-tested stream_23_09_2026.pdf`,
  "190": `${D}/Subclass 190 Skilled Nominated visa/Subclass 190 Skilled Nominated visa_23September2026.pdf`,
  "491": `${D}/Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant/Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant_23September2026.pdf`,
  "186": `${D}/Subclass 186-Employer Nomination Scheme visa/Subclass 186-Employer Nomination Scheme visa.pdf`,
  "482": `${D}/Visa (subclass 482) Core Skills stream/Skills in Demand Visa (subclass 482) Core Skills stream_01July2026.pdf`,
  "482-english": `${D}/Visa (subclass 482) Core Skills stream/English proficiency (subclass 482)_25April2026.pdf`,
  "485": `${D}/Temporary Graduate visa (subclass 485) Post-Higher Education Work stream/Temporary Graduate visa (subclass 485) Post-Higher Education Work stream _23September2026.pdf`,
  "500": `${D}/Visa_500/Student visa_class_500_23September2026.pdf`,
  "820": `${D}/(Subclasses 820 and 801) Partner visas (apply in Australia)/Subclass 820 Partner visa (temporary)/Subclass 820 Partner visa (temporary)_23September2026.pdf`,
};

type Numeric = { name: string; value: number; unit: string; effectiveFrom?: string; previous?: number; note?: string };
type GateSpec = {
  id: string;
  visa: string;
  stream: string | null;
  /** Short English requirement (customer-facing wording lives in lib/readiness/visa-gates.ts, en/tr/zh-Hans). */
  requirement: string;
  doc: string;
  /** Inclusive page window inside the document (streams share one PDF). */
  pages?: [number, number];
  /** Verbatim text (whitespace-insensitive) that must appear in the window. */
  quote: string;
  numeric?: Numeric;
  /** Intake fields the gate is evaluated from ([] = nothing in the intake: always "unknown"). */
  intakeFields: string[];
  kind: "gate" | "future_step";
};

const CSIT = { name: "Core Skills Income Threshold (CSIT)", value: 79423, unit: "AUD per year", effectiveFrom: "2026-07-01", previous: 76515 };

const S = (
  id: string,
  visa: string,
  stream: string | null,
  requirement: string,
  doc: string,
  quote: string,
  intakeFields: string[],
  extra: Partial<GateSpec> = {}
): GateSpec => ({ id, visa, stream, requirement, doc, quote, intakeFields, kind: "gate", ...extra });

const skilledCommon = (v: "189" | "190" | "491"): GateSpec[] => [
  S(`${v}.skills_assessment`, v, null, "A suitable skills assessment", v, v === "189" ? "you must declare that you have a suitable skills assessment at the time of invitation" : "You must have a suitable skills assessment at the time we invite you to apply", ["occupationConfirmed"]),
  S(`${v}.occupation_list`, v, null, "Occupation on the relevant skilled occupation list", v, v === "491" ? "Your occupation must be on the combined list of eligible skilled occupations for a" : "Your occupation must be on the relevant list of eligible skilled occupations for", ["occupation"]),
  S(`${v}.age`, v, null, "Under 45 when invited", v, v === "491" ? "You must be aged under 45 to be invited to apply for the visa" : "You must be aged under 45 when we invite you to apply for the visa", ["age"], { numeric: { name: "age limit (must be under)", value: 45, unit: "years" } }),
  S(`${v}.english`, v, null, "At least Competent English at invitation", v, v === "189" || v === "190" ? "At the time of invitation, you must have at least competent English." : "you must have at least competent English", ["englishLevel"]),
  S(`${v}.points`, v, null, "At least 65 points", v, "If you do not obtain a score of 65 points you will not be invited to apply for", ["age", "englishLevel", "qualificationLevel", "offshoreExperienceYears", "onshoreExperienceYears", "sponsorOrFamily", "occupationConfirmed"], { numeric: { name: "minimum points", value: 65, unit: "points" } }),
  S(`${v}.invitation`, v, null, "An invitation to apply (after an EOI)", v, "You can only apply for this visa if we invite you to", [], { kind: "future_step" }),
];

export const GATE_SPECS: GateSpec[] = [
  ...skilledCommon("189"),
  ...skilledCommon("190"),
  S("190.nomination", "190", null, "Nomination by a state or territory", "190", "You must have been nominated for this visa by an Australian state or territory", [], { kind: "future_step" }),
  ...skilledCommon("491"),
  S("491.nomination", "491", null, "Nomination by a state or territory, or sponsorship by an eligible relative", "491", "You must be either nominated by an Australian state or territory government agency", [], { kind: "future_step" }),

  // ── 186 Direct Entry (pp.1-28) ─────────────────────────────────────────────────────────────────────────────────
  S("186DE.age", "186", "Direct Entry", "Under 45 on the date of application, unless exempt", "186", "Usually, you must be under 45 years of age when you apply.", ["age"], { pages: [1, 28], numeric: { name: "age limit (must be under)", value: 45, unit: "years" } }),
  S("186DE.occupation_csol", "186", "Direct Entry", "Nominated occupation on the Core Skills Occupation List (CSOL)", "186", "Your occupation must be on the Core Skills Occupation List (CSOL).", ["occupation"], { pages: [1, 28] }),
  S("186DE.experience", "186", "Direct Entry", "At least 3 years relevant work experience, unless exempt", "186", "Unless exempt, most applicants need to have at least 3 years relevant work experience in their occupation.", ["offshoreExperienceYears", "onshoreExperienceYears"], { pages: [1, 28], numeric: { name: "minimum relevant work experience", value: 3, unit: "years" } }),
  S("186DE.skills_assessment", "186", "Direct Entry", "A positive skills assessment before lodging, unless exempt", "186", "Most applicants need to have a skills assessment that shows they have the skills", ["occupationConfirmed"], { pages: [1, 28] }),
  S("186DE.english", "186", "Direct Entry", "At least Competent English", "186", "You must have at least competent English to be granted this stream of the visa.", ["englishLevel"], { pages: [1, 28] }),
  S("186DE.salary", "186", "Direct Entry", "Nominated salary at or above the Core Skills Income Threshold (CSIT)", "186", "The Core Skills Income Threshold (CSIT) will increase from AUD76,515 to", ["annualSalaryAud"], { pages: [1, 60], numeric: { ...CSIT, note: "The 186 document (p.28) says the CSIT applies to nomination applications for the Employer Nomination Scheme (subclass 186); it does not say which stream, so it is applied to Direct Entry." } }),
  S("186DE.employer_nomination", "186", "Direct Entry", "Nominated by an approved Australian employer", "186", "You must be nominated by an Australian employer whose business is actively", [], { pages: [1, 28] }),

  // ── 186 Temporary Residence Transition (pp.47-68) ──────────────────────────────────────────────────────────────
  S("186TRT.hold_visa", "186", "Temporary Residence Transition", "Hold a subclass 457 / 482 (or eligible bridging) visa", "186", "hold a subclass 457, 482 or eligible bridging visa", [], { pages: [47, 68] }),
  S("186TRT.sponsored_employment", "186", "Temporary Residence Transition", "2 years full-time eligible sponsored employment in the 3 years before applying", "186", "You must have been employed in eligible sponsored employment for a total of 2 years in", ["yearsInSponsoredPosition", "onshoreExperienceYears"], { pages: [47, 68], numeric: { name: "sponsored employment", value: 2, unit: "years (within the last 3)" } }),
  S("186TRT.age", "186", "Temporary Residence Transition", "Under 45 when applying, unless exempt", "186", "Usually, you must be under 45 years of age when you apply.", ["age"], { pages: [47, 68], numeric: { name: "age limit (must be under)", value: 45, unit: "years" } }),
  S("186TRT.english", "186", "Temporary Residence Transition", "At least Competent English", "186", "You must have at least Competent English.", ["englishLevel"], { pages: [47, 68] }),
  S("186TRT.employer_nomination", "186", "Temporary Residence Transition", "Nominated by the employer who sponsored the temporary visa", "186", "You must be nominated by an Australian employer whose business is actively and lawfully operating in Australia.", [], { pages: [47, 68] }),

  // ── 482 Core Skills ────────────────────────────────────────────────────────────────────────────────────────────
  S("482CS.occupation_csol", "482", "Core Skills", "Nominated occupation on the Core Skills Occupation List (CSOL)", "482", "be nominated to work in an occupation on the Core Skills Occupation List", ["occupation"]),
  S("482CS.salary", "482", "Core Skills", "Paid the market salary and no less than the Core Skills Income Threshold (CSIT)", "482", "no less than the Core Skills Income Threshold (CSIT)", ["annualSalaryAud"], { numeric: CSIT }),
  S("482CS.experience", "482", "Core Skills", "At least 1 year relevant work experience", "482", "You must have at least 1 year relevant work experience in the nominated occupation", ["offshoreExperienceYears", "onshoreExperienceYears"], { numeric: { name: "minimum relevant work experience", value: 1, unit: "years" } }),
  S("482CS.skills_assessment", "482", "Core Skills", "A skills assessment where it is mandatory for the occupation", "482", "Some primary SID visa applicants must undergo a mandatory skills assessment", [], {}),
  S("482CS.english", "482", "Core Skills", "Minimum English test result (IELTS 5.0 overall and each component), unless exempt", "482-english", "you must take an English language test before you apply for the subclass 482 visa in the Core Skills or Specialist Skills stream", ["englishLevel"], { numeric: { name: "IELTS minimum (tests taken on or after 13 September 2025)", value: 5.0, unit: "overall and in each component" } }),
  S("482CS.sponsor", "482", "Core Skills", "Nominated by an approved employer sponsor", "482", "Before you can apply for a SID visa, your proposed employer will need to submit a nomination", [], {}),

  // ── 482 Specialist Skills (only the income threshold is in data/knowledge) ─────────────────────────────────────
  S("482SS.salary", "482", "Specialist Skills", "Salary at or above the Specialist Skills Income Threshold (SSIT)", "482", "The Specialist Skills Income Threshold (SSIT) will increase from AUD141,210 to", ["annualSalaryAud"], { numeric: { name: "Specialist Skills Income Threshold (SSIT)", value: 146576, unit: "AUD per year", effectiveFrom: "2026-07-01", previous: 141210 } }),

  // ── 485 Post-Higher Education Work ─────────────────────────────────────────────────────────────────────────────
  S("485.age", "485", null, "35 or under when applying (under 50 with a Masters (research) / PhD, or a Hong Kong / BNO passport)", "485", "You must be 35 years of age or under when you apply.", ["age", "qualificationLevel"], { numeric: { name: "age limit (or under)", value: 35, unit: "years", note: "Under 50 if the study requirement is met with a Masters (research) or Doctoral degree (PhD), or a Hong Kong / BNO passport holder." } }),
  S("485.in_australia", "485", null, "In Australia (not in immigration clearance) when applying", "485", "You must be in Australia (but not in immigration clearance) when you apply for this", ["currentCountry"]),
  S("485.eligible_degree", "485", null, "An eligible degree (Bachelor or above) awarded in the 6 months before applying", "485", "You must have been awarded an eligible degree, regardless of your field of study, in", ["qualificationLevel"]),
  S("485.australian_provider", "485", null, "Studied with a CRICOS-registered Australian provider", "485", "Your course must have been with an Australian education provider who is registered", ["qualificationAwardedInAustralia"]),
  S("485.english", "485", null, "English test result from the 12 months before applying (or an eligible passport)", "485", "In the 12 months immediately before the day you apply for your visa, you must have", [], {}),

  // ── 500 Student ────────────────────────────────────────────────────────────────────────────────────────────────
  S("500.enrolment", "500", null, "Enrolled in a course with a valid Confirmation of Enrolment (CoE)", "500", "be enrolled in a course of study in Australia and hold a valid Confirmation of", [], {}),
  S("500.oshc", "500", null, "Overseas Student Health Cover (OSHC), unless exempt", "500", "hold Overseas Student Health Cover (OSHC), or fall in one of the exemption", [], {}),
  S("500.age", "500", null, "6 years or older", "500", "be 6 years or older", ["age"], { numeric: { name: "minimum age", value: 6, unit: "years" } }),

  // ── 820 / 801 Partner (temporary, then permanent) ──────────────────────────────────────────────────────────────
  S("820.relationship", "820", null, "In a genuine relationship with an Australian citizen / permanent resident / eligible NZ citizen partner", "820", "be in a genuine relationship with your spouse or de facto partner", [], {}),
  S("820.sponsor", "820", null, "Sponsored by that partner", "820", "have your spouse or de facto partner sponsor you", [], {}),
  S("820.in_australia", "820", null, "In Australia when applying", "820", "be in Australia when you apply for this visa", ["currentCountry"]),
];

/** Requirements the report needs but data/knowledge does not state -- never invented, flagged for a human. */
export const MISSING_THRESHOLDS = [
  "482 Specialist Skills stream: no stream document in data/knowledge -- only the SSIT (AUD146,576 from 1 July 2026) is stated (in the 482 and 186 documents). Its eligible occupations, experience and other requirements are missing.",
  "482 mandatory skills assessment: which occupations require one is set by IMMI 18/039 (named in the 482 document, p.13), which is not in data/knowledge; the gate is evaluated as unknown.",
  "482 / 186 exemptions (English, skills assessment, work experience, age): only some are described in the documents and none is captured by the intake; a not-met result names the gate as 'unless exempt' where the document allows one.",
  "186 Temporary Residence Transition income threshold: the documents name CSIT for 186 nominations without a stream; no separate TRT threshold is stated, so none is applied.",
  "186 Labour Agreement stream: not evaluated (agreement-specific requirements; the report does not offer this stream as a recommendation).",
  "485: the study requirement details (duration, on-campus) and the exact English scores for each test are in the document but are not evaluated -- the intake collects neither the course completion date nor a test score.",
  "820 / 801: the sponsor's status and relationship evidence are not collected by the intake.",
  "189 / 190 / 491: the skills-assessment validity period (3 years before the invitation), the occupation's specific assessing body, and the state-specific nomination criteria are not gates the intake can evaluate.",
];

async function pdfPages(file: string): Promise<Array<{ num: number; text: string }>> {
  const r = await new PDFParse({ data: readFileSync(file) }).getText();
  return r.pages.map((p: { num: number; text: string }) => ({ num: p.num, text: p.text }));
}

const squash = (s: string) => s.replace(/[\s●○■·]+/g, "").replace(/[’‘]/g, "'").toLowerCase();

function locate(pages: Array<{ num: number; text: string }>, spec: GateSpec): number {
  const [from, to] = spec.pages ?? [1, Number.MAX_SAFE_INTEGER];
  const needle = squash(spec.quote);
  const hit = pages.find((p) => p.num >= from && p.num <= to && squash(p.text).includes(needle));
  if (!hit) throw new Error(`${spec.id}: quote not found in ${spec.doc} pages ${from}-${to}: "${spec.quote}"`);
  return hit.num;
}

export async function buildVisaGates() {
  const docs = new Map<string, Array<{ num: number; text: string }>>();
  for (const [key, file] of Object.entries(VISA_GATE_DOCUMENTS)) {
    if (!existsSync(file)) throw new Error(`source document missing: ${file}`);
    docs.set(key, await pdfPages(file));
  }
  const gates = GATE_SPECS.map((spec) => {
    const pages = docs.get(spec.doc)!;
    const page = locate(pages, spec);
    return {
      id: spec.id,
      visa: spec.visa,
      stream: spec.stream,
      kind: spec.kind,
      failureKind: gateFailureKind(spec.id),
      requirement: spec.requirement,
      source: VISA_GATE_DOCUMENTS[spec.doc].replace(`${D}/`, ""),
      page,
      quote: spec.quote,
      ...(spec.numeric ? { numeric: spec.numeric } : {}),
      intakeFields: spec.intakeFields,
      evaluatedFromIntake: spec.intakeFields.length > 0,
    };
  });
  return {
    _provenance: {
      generatedBy: "scripts/generate-visa-gates.ts",
      extractedOn: EXTRACTED_DATE,
      last_verified: EXTRACTED_DATE,
      documents: Object.fromEntries(Object.entries(VISA_GATE_DOCUMENTS).map(([k, f]) => [k, f.replace(`${D}/`, "")])),
      note: "Each gate's quote was found verbatim (whitespace-insensitive) on its page in the named document. Thresholds not stated in data/knowledge are listed under 'missing'; none is invented.",
      gateCount: gates.length,
    },
    thresholds: {
      CSIT: { ...CSIT, appliesTo: "482 Core Skills nominations; 186 nominations (Direct Entry applied)", page: gates.find((g) => g.id === "482CS.salary")!.page, source: "482 document p.1, 186 document p.28" },
      SSIT: { value: 146576, unit: "AUD per year", effectiveFrom: "2026-07-01", previous: 141210, appliesTo: "482 Specialist Skills nominations" },
      TSMIT: { value: 79423, unit: "AUD per year", effectiveFrom: "2026-07-01", previous: 76515, appliesTo: "494 and 187 nominations (not evaluated by the report)" },
      ageLimits: { "189": 45, "190": 45, "491": 45, "186": 45, "485": 35 },
      minimumPoints: 65,
      minimumExperienceYears: { "186DE": 3, "482CS": 1, "186TRT (sponsored employment)": 2 },
    },
    missing: MISSING_THRESHOLDS,
    needsHumanVerification: NEEDS_HUMAN_VERIFICATION,
    gates,
  };
}

export function serialize(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

async function main() {
  const fresh = serialize(await buildVisaGates());
  if (process.argv.includes("--check")) {
    const committed = readFileSync(VISA_GATES_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed !== fresh) {
      console.error(`${VISA_GATES_OUT_FILE} drifted from the source documents -- run: npx tsx scripts/generate-visa-gates.ts`);
      process.exit(1);
    }
    console.log(`${VISA_GATES_OUT_FILE} matches the source documents`);
    return;
  }
  writeFileSync(VISA_GATES_OUT_FILE, fresh);
  console.log(`wrote ${VISA_GATES_OUT_FILE}`);
}

if (/generate-visa-gates\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
