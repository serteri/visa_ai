/**
 * Regenerates src/data/health-registration/anmac-fees.json from the nursing/midwifery source document
 * ("Anmac.pdf", 41 pages) in data/knowledge/Skill Assessments/Anmac/ -- Ahpra / Nursing and Midwifery Board of
 * Australia (NMBA) pages on internationally qualified nurses and midwives (IQNM), plus Anmac's own skilled-migration
 * assessment pages.
 *
 * The document states exactly four dollar figures (the generator fails if that changes):
 *   - Anmac Full skills assessment        $595  (p.26)  -- the migration skills assessment for nurses/midwives
 *   - Anmac Direct care skills assessment $545  (p.33)  -- ANZSCO 423312 / 423313 only
 *   - Anmac Modified skills assessment    $395  (p.37)  -- currently registered in Australia or New Zealand
 *   - Ahpra/NMBA IQNM assessment fee      $410  (p.20-21) -- registration, not the migration skills assessment
 * Each Anmac assessment states "Current wait time for assessment to start: 6–8 weeks". The NMBA "Fees for
 * international applications" (application fee, registration fee; p.19) are named with NO amount: recorded under
 * notStated as "needs human verification", same pattern as the AMC deferred fees (scripts/generate-amc-fees.ts).
 *
 * Eligibility text is kept verbatim (whitespace-normalised) so the report can quote it, not paraphrase it.
 *
 * Usage:
 *   npx tsx scripts/generate-anmac-fees.ts           writes the JSON
 *   npx tsx scripts/generate-anmac-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const ANMAC_SOURCE_DOCUMENT = "data/knowledge/Skill Assessments/Anmac/Anmac.pdf";
export const ANMAC_OUT_FILE = "src/data/health-registration/anmac-fees.json";
// Pinned so a regenerate on another day is not drift; bump when the source document is replaced.
const EXTRACTED_DATE = "2026-09-24";

type Page = { num: number; text: string };
type Doc = { text: string; pageStarts: Array<{ num: number; at: number }> };

/** All pages as one whitespace-normalised string, remembering where each page starts. */
function joinPages(pages: Page[]): Doc {
  let text = "";
  const pageStarts: Doc["pageStarts"] = [];
  for (const p of pages) {
    if (text) text += " ";
    pageStarts.push({ num: p.num, at: text.length });
    text += p.text.replace(/\s+/g, " ").trim();
  }
  return { text, pageStarts };
}

const pageAt = (doc: Doc, index: number) => [...doc.pageStarts].reverse().find((s) => s.at <= index)!.num;

/** Finds a passage; returns the match, its first and last page, and the exact text as the quote. */
function find(doc: Doc, re: RegExp, what: string) {
  const match = doc.text.match(re);
  if (!match || match.index === undefined) throw new Error(`Anmac document: ${what} not found (${re})`);
  const page = pageAt(doc, match.index);
  const lastPage = pageAt(doc, match.index + match[0].length - 1);
  return { match, page, pages: lastPage === page ? [page] : [page, lastPage], quote: match[0].trim() };
}

/** "● a ● b ● c." -> ["a", "b", "c"] */
const bullets = (s: string) =>
  s
    .split("●")
    .map((x) => x.trim().replace(/[.;]$/, ""))
    .filter(Boolean);

const aud = (s: string) => Number(s.replace(/[$,]/g, ""));

export async function buildAnmacFees(sourcePath = ANMAC_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));
  const doc = joinPages(pages);

  // Guard: every dollar figure in the document must be one of the four handled below.
  const figures = [...doc.text.matchAll(/\$\s?([\d,]+)/g)].map((m) => aud(m[1]));
  const expected = [410, 595, 545, 395];
  if (JSON.stringify([...new Set(figures)].sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`Anmac document states dollar figures ${JSON.stringify(figures)}; expected exactly ${expected.join(", ")} -- extend this generator`);
  }

  const wait = (m: RegExpMatchArray, i: number) => ({ minWeeks: Number(m[i]), maxWeeks: Number(m[i + 1]) });

  // ── Full skills assessment (p.26-27) ──
  const full = find(
    doc,
    /Full skills assessment Apply for this assessment if (you are registered as a nurse or midwife in an approved overseas country and meet the eligibility requirements below)\. ● Fee: \$(\d+) AUD ● Time to apply: [^●]+● Current wait time for assessment to start: (\d+)–(\d+) weeks/,
    "Full skills assessment header",
  );
  const fullNursing = find(
    doc,
    /For nursing applicants To qualify for a Full skills assessment, you must: ● hold a relevant nursing qualification ● be current or previously registered as a nurse in one of the following countries: (● [^●]+(?:● [^●]+)*?\.) If your qualification is not a Bachelor of Nursing from ([^,]+(?:, [^,]+)*?), you must also: (● .+? in that same country\.)/,
    "Full skills assessment nursing eligibility",
  );
  const fullCountries = bullets(fullNursing.match[1]);
  const expectedCountries = ["Canada", "Hong Kong", "Ireland", "Singapore", "Spain", "United Kingdom", "United States"];
  if (JSON.stringify(fullCountries) !== JSON.stringify(expectedCountries)) throw new Error(`Full skills assessment countries changed: ${fullCountries.join(", ")}`);
  const fullMidwifery = find(
    doc,
    /For midwifery applicants To qualify for a Full skills assessment, you must: (● .+? same country as your qualification\.)/,
    "Full skills assessment midwifery eligibility",
  );
  const fullLater = find(doc, /If you apply for a Full skills assessment and later become registered in Australia or New Zealand, the Full skills assessment process and fees will still apply\./, "Full skills assessment later-registration sentence");

  // ── Direct care skills assessment (p.33-34) ──
  const direct = find(
    doc,
    /This assessment is for the following occupations only: (● .+?\)) Fee: \$(\d+) AUD Time to apply: .+? Current wait time for assessment to start: (\d+)–(\d+) weeks/,
    "Direct care skills assessment header",
  );
  const directOccupations = bullets(direct.match[1]).map((b) => {
    const m = b.match(/^(.+?) \(ANZSCO (\d{6})\)$/);
    if (!m) throw new Error(`Direct care occupation not parsed: ${b}`);
    return { title: m[1], anzscoCode: m[2] };
  });
  const directEligibility = find(
    doc,
    /To qualify for a Direct care skills assessment, you must meet all requirements of at least one of the following pathways: .+?was in a relevant area, including nursing, direct care or aged care\./,
    "Direct care eligibility",
  );
  const directRelevant = find(doc, /‘Relevant’ means a course or work where direct care roles and responsibilities are the focus\. This does not include midwifery, disability or child care\./, "Direct care 'relevant' definition");

  // ── Modified skills assessment (p.37-40) ──
  const modified = find(
    doc,
    /Modified skills assessment Apply for this assessment if (you are currently registered as a nurse or midwife in Australia or New Zealand)\. ● Fee: \$(\d+) AUD ● Time to apply: [^●]+● Current wait time for assessment to start: (\d+)–(\d+) weeks/,
    "Modified skills assessment header",
  );
  const modifiedEligibility = find(
    doc,
    /To qualify for a Modified skills assessment, you need current registration from one of the following: (● .+?\(MCNZ\))\./,
    "Modified skills assessment eligibility",
  );
  const modifiedGeneralCodes = find(
    doc,
    /If you do not have work experience, choose one of these general codes that apply to you: (● .+?Enrolled Nurse)\./,
    "Modified skills assessment general ANZSCO codes",
  );

  // ── Ahpra/NMBA IQNM assessment fee (p.20-21) ──
  const iqnm = find(
    doc,
    /If you are assigned to Stream A or B, or your qualification has not yet been assessed against the criteria, you will need to pay a non-refundable IQNM assessment fee \(assessment and orientation\) of \$(\d+) and complete Orientation Part 1\./,
    "IQNM assessment fee sentence",
  );

  // ── Named without an amount (p.19) ──
  const intl = find(doc, /● Fees for international applications: ● Application fee ● Registration fee Note: the application fee is non-refundable\./, "international application fees");
  const exams = find(doc, /Multiple-choice question exam \(MCQ\) The multiple-choice question \(MCQ\) exam assesses the candidate’s professional knowledge\./, "MCQ exam description");
  const osce = find(doc, /The Objective Structured Clinical Exam \(OSCE\) is a clinical exam/, "OSCE description");

  const waitNote = "Wait time for the assessment to START, as stated; the document gives no time to complete the assessment.";

  return {
    sourceDocument: ANMAC_SOURCE_DOCUMENT,
    sourceTitle: "Ahpra / Nursing and Midwifery Board of Australia -- internationally qualified nurses and midwives; Anmac skilled migration skills assessments",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-anmac-fees.ts",
    effectiveDate: null as string | null,
    effectiveDateNote: "The document states no effective date for any of these fees.",
    fees: [
      {
        id: "anmac_full_skills_assessment",
        body: "Anmac",
        item: "Full skills assessment",
        amountAud: aud(full.match[2]),
        page: full.page,
        quote: full.quote,
        appliesTo: `Apply for this assessment if ${full.match[1]}.`,
        eligibility: {
          nursing: {
            pages: fullNursing.pages,
            quote: fullNursing.quote,
            registeredIn: fullCountries,
            additionalIfNotBachelorOfNursingFrom: fullNursing.match[2],
            additionalRequirements: bullets(fullNursing.match[3]),
          },
          midwifery: { pages: fullMidwifery.pages, quote: fullMidwifery.quote, requirements: bullets(fullMidwifery.match[1]) },
          laterAustralianOrNzRegistration: { page: fullLater.page, quote: fullLater.quote },
        },
        waitTimeToStart: { ...wait(full.match, 3), page: full.page, note: waitNote },
      },
      {
        id: "anmac_direct_care_skills_assessment",
        body: "Anmac",
        item: "Direct care skills assessment",
        amountAud: aud(direct.match[2]),
        page: direct.page,
        quote: direct.quote,
        appliesTo: "This assessment is for the following occupations only:",
        occupations: directOccupations,
        eligibility: {
          pages: directEligibility.pages,
          quote: directEligibility.quote,
          relevantDefinition: { page: directRelevant.page, quote: directRelevant.quote },
        },
        waitTimeToStart: { ...wait(direct.match, 3), page: direct.page, note: waitNote },
      },
      {
        id: "anmac_modified_skills_assessment",
        body: "Anmac",
        item: "Modified skills assessment",
        amountAud: aud(modified.match[2]),
        page: modified.page,
        quote: modified.quote,
        appliesTo: `Apply for this assessment if ${modified.match[1]}.`,
        eligibility: {
          page: modifiedEligibility.page,
          quote: modifiedEligibility.quote,
          currentRegistrationWith: bullets(modifiedEligibility.match[1]),
          generalCodesWithoutWorkExperience: { page: modifiedGeneralCodes.page, quote: modifiedGeneralCodes.quote, codes: bullets(modifiedGeneralCodes.match[1]) },
        },
        waitTimeToStart: { ...wait(modified.match, 3), page: modified.page, note: waitNote },
      },
      {
        id: "nmba_iqnm_assessment_fee",
        body: "Ahpra / Nursing and Midwifery Board of Australia",
        item: "IQNM assessment fee (assessment and orientation) -- registration pathway, not the Anmac migration skills assessment",
        amountAud: aud(iqnm.match[1]),
        page: iqnm.page,
        pages: iqnm.pages,
        quote: iqnm.quote,
        appliesTo: "After the Self-check: IQNMs assigned to Stream A or B, or whose qualification has not yet been assessed against the criteria.",
        refundable: false,
      },
    ],
    notStated: [
      { id: "nmba_international_application_fee", item: "NMBA/Ahpra application fee for international applications (non-refundable)" },
      { id: "nmba_international_registration_fee", item: "NMBA/Ahpra registration fee for international applications" },
    ].map((f) => ({
      ...f,
      status: "needs human verification",
      reason: `The document names this fee but states no amount (p.${intl.page}: "${intl.quote}").`,
    })),
    unpricedStages: [
      { id: "nmba_mcq_exam", item: "NMBA multiple-choice question (MCQ) exam (Stream B outcomes-based assessment)", page: exams.page, quote: exams.quote },
      { id: "nmba_osce", item: "NMBA Objective Structured Clinical Exam (OSCE) (Stream B outcomes-based assessment)", page: osce.page, quote: osce.quote },
    ].map((s) => ({ ...s, status: "no fee stated in this document" })),
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(ANMAC_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${ANMAC_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildAnmacFees());
  if (check) {
    const committed = existsSync(ANMAC_OUT_FILE) ? readFileSync(ANMAC_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${ANMAC_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-anmac-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${ANMAC_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(ANMAC_OUT_FILE), { recursive: true });
  writeFileSync(ANMAC_OUT_FILE, out);
  console.log(`wrote ${ANMAC_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
