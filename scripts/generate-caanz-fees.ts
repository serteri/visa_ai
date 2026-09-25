/**
 * Regenerates src/data/skills-assessment/caanz-fees.json from Chartered Accountants Australia and New Zealand's
 * migration skills assessment document (77 pages) in data/knowledge/Skill Assessments/Chartered Accountants Australia
 * and New Zealand/.
 *
 * The fee table (p.44-49, "Fees and estimated processing times") states 12 assessment types, each with a current fee,
 * a new fee from 1 July 2026 and a processing time in business days; the generator fails if any row is missing or a
 * dollar figure appears that it does not handle. There are no onshore / offshore / Singapore variants: one AUD fee per
 * type. Also captured, each with page + quote: the six occupations CA ANZ assesses (p.3-4), what each assessment
 * covers (p.5, p.37), the skilled-employment prerequisite and the full-member exemption (p.49), the completeness check
 * (p.42). The p.14 Country Education Profile subscription prices are a reference product, not an assessment fee, and
 * are deliberately not extracted.
 *
 * Usage:
 *   npx tsx scripts/generate-caanz-fees.ts           writes the JSON
 *   npx tsx scripts/generate-caanz-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const CAANZ_SOURCE_DOCUMENT =
  "data/knowledge/Skill Assessments/Chartered Accountants Australia and New Zealand/Chartered Accountants Australia and New Zealand.pdf";
export const CAANZ_OUT_FILE = "src/data/skills-assessment/caanz-fees.json";
// Pinned so a regenerate on another day is not drift; bump when the source document is replaced.
const EXTRACTED_DATE = "2026-09-26";

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
  if (!match || match.index === undefined) throw new Error(`CA ANZ document: ${what} not found (${re})`);
  const page = pageAt(doc, match.index);
  const lastPage = pageAt(doc, match.index + match[0].length - 1);
  return { match, page, pages: lastPage === page ? [page] : [page, lastPage], quote: match[0].trim() };
}

const aud = (s: string) => Number(s.replace(/[$,]/g, ""));

type Row = {
  id: string;
  item: string;
  assessment: "qualification" | "skilled_employment" | "combined" | "reassessment" | "internal_review" | "external_appeal" | "withdrawal";
  scope: string;
  processing?: "standard" | "express";
  re: RegExp;
};

// "$current $new N business days"; one row's "(Qualification AND Skilled employment)" follows its figures (page break).
const FIG = String.raw`\$(\d+) \$(\d+) (\d+) business days`;
const ROWS: Row[] = [
  { id: "caanz_qualification_standard", item: "Qualification assessment only – Standard processing time", assessment: "qualification", processing: "standard", scope: "qualification", re: new RegExp(`Qualification assessment only – Standard processing time ${FIG}`) },
  { id: "caanz_qualification_express", item: "Qualification assessment only – Express processing time", assessment: "qualification", processing: "express", scope: "qualification", re: new RegExp(`Qualification assessment only – Express processing time ${FIG}`) },
  { id: "caanz_skilled_employment_standard", item: "Skilled employment assessment only – Standard processing time", assessment: "skilled_employment", processing: "standard", scope: "skilled_employment", re: new RegExp(`Skilled employment assessment only – Standard processing time\\* ${FIG}`) },
  { id: "caanz_skilled_employment_express", item: "Skilled employment assessment only – Express processing time", assessment: "skilled_employment", processing: "express", scope: "skilled_employment", re: new RegExp(`Skilled employment assessment only – Express processing time\\* ${FIG}`) },
  { id: "caanz_combined", item: "Combined assessment (Qualification AND Skilled employment)", assessment: "combined", scope: "combined", re: new RegExp(`Combined assessment \\(Qualification AND Skilled employment\\) ${FIG}`) },
  { id: "caanz_reassessment_single", item: "Reassessment (Qualification OR Skilled employment)", assessment: "reassessment", scope: "after an outcome", re: new RegExp(`Reassessment \\(Qualification OR Skilled employment\\) ${FIG}`) },
  { id: "caanz_reassessment_both", item: "Reassessment (Qualification AND Skilled employment)", assessment: "reassessment", scope: "after an outcome", re: new RegExp(`Reassessment \\(Qualification AND Skilled employment\\) ${FIG}`) },
  { id: "caanz_internal_review_single", item: "Internal review - review of the decision (Qualification OR Skilled employment)", assessment: "internal_review", scope: "after an outcome", re: new RegExp(`Internal review - review of the decision \\(Qualification OR Skilled employment\\) ${FIG}`) },
  { id: "caanz_internal_review_both", item: "Internal review - review of the decision (Qualification AND Skilled employment)", assessment: "internal_review", scope: "after an outcome", re: new RegExp(`Internal review - review of the decision ${FIG} \\(Qualification AND Skilled employment\\)`) },
  { id: "caanz_external_appeal_single", item: "External appeal (Qualification OR Skilled employment)", assessment: "external_appeal", scope: "after an outcome", re: new RegExp(`External appeal \\(Qualification OR Skilled employment\\) ${FIG}`) },
  { id: "caanz_external_appeal_both", item: "External appeal (Qualification AND Skilled employment)", assessment: "external_appeal", scope: "after an outcome", re: new RegExp(`External appeal \\(Qualification AND Skilled employment\\)? ?${FIG}`) },
  { id: "caanz_withdrawal", item: "Withdrawal request (Admin fee)", assessment: "withdrawal", scope: "withdrawal", re: new RegExp(`Withdrawal request \\(Admin fee\\) ${FIG}`) },
];

export async function buildCaanzFees(sourcePath = CAANZ_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));
  const doc = joinPages(pages);

  // ── Effective date (p.44) ──
  const effective = find(
    doc,
    /From 1 July 2026, our migration skills assessment fees will increase by an average of approximately 2%\. .+? Applications received before 1 July 2026 will be charged at current rates\./,
    "fee increase / effective date",
  );

  // ── Fee table (p.44-49) ──
  const fees = ROWS.map((r) => {
    const m = find(doc, r.re, r.item);
    return {
      id: r.id,
      item: r.item,
      assessment: r.assessment,
      ...(r.processing ? { processing: r.processing } : {}),
      amountAud: aud(m.match[2]),
      previousAmountAud: aud(m.match[1]),
      processingBusinessDays: Number(m.match[3]),
      page: m.page,
      quote: m.quote,
    };
  });

  // Guard: every dollar figure in the document is a table figure, the "$5 per item" increase or the members' "$0".
  const handled = new Set([...fees.flatMap((f) => [f.amountAud, f.previousAmountAud]), 5, 0]);
  const stray = [...doc.text.matchAll(/\$\s?([\d,]+)/g)].map((m) => aud(m[1])).filter((n) => !handled.has(n));
  if (stray.length) throw new Error(`CA ANZ document states dollar figures this generator does not handle: ${stray.join(", ")}`);

  // ── Occupations (p.3-4) ──
  const occ = find(doc, /CA ANZ assesses the following accounting and finance occupations: Occupation ANZSCO Code (.+?) ANZSCO The Australian/, "occupation list");
  const occupations = [...occ.match[1].matchAll(/(.+?) (\d{6})\s*/g)].map((m) => ({ title: m[1].trim(), anzscoCode: m[2] }));
  if (occupations.length !== 6) throw new Error(`CA ANZ occupation list: ${JSON.stringify(occupations)}`);

  // ── What each assessment covers ──
  const qualification = find(
    doc,
    /Qualification Assessment Assesses whether your education and professional qualification are comparable to an Australian Bachelor’s degree under the Australian Qualifications Framework \(AQF\)\. .+? Required for all applicants\. Must be completed before applying for skilled employment assessment\./,
    "qualification assessment scope",
  );
  const employment = find(doc, /Skilled Employment Assessment \(Optional\) Assesses if your work experience is relevant and meets the required skill level\. You must first have a suitable and valid qualification assessment outcome for the same occupation from CA ANZ\./, "skilled employment assessment scope");
  const combined = find(doc, /You can apply for a combined assessment that includes both: Qualification assessment – CA ANZ checks if your qualifications meet the required standard\. Skilled employment assessment – if your qualifications are suitable, CA ANZ will assess your work experience\./, "combined assessment scope");
  const prerequisite = find(doc, /\*Skilled employment assessment is only available if you have received a suitable qualification assessment outcome from CA ANZ\./, "skilled employment prerequisite");
  const members = find(doc, /Note: CA ANZ full members do not need to pay the migration skills assessment fee\. If you are eligible, your invoice will show a \$0 fee\./, "full-member exemption");
  const completeness = find(doc, /We will review your application within 10 business days of submission to check if it is complete\./, "completeness check");

  return {
    sourceDocument: CAANZ_SOURCE_DOCUMENT,
    sourceTitle: "Chartered Accountants Australia and New Zealand — Migration Skills Assessment",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-caanz-fees.ts",
    effectiveDate: "2026-07-01",
    effectiveDateSource: { page: effective.page, quote: effective.quote },
    currency: "AUD",
    locationVariants: {
      stated: false,
      note: "The document states one AUD fee per assessment type; it states no onshore, offshore, Singapore or other location variant.",
    },
    occupations: { page: occ.page, pages: occ.pages, list: occupations },
    scope: {
      qualification: { pages: qualification.pages, quote: qualification.quote },
      skilled_employment: { page: employment.page, quote: employment.quote },
      combined: { page: combined.page, quote: combined.quote },
    },
    fees,
    notes: [
      { id: "skilled_employment_prerequisite", page: prerequisite.page, quote: prerequisite.quote },
      { id: "full_members_pay_nothing", page: members.page, quote: members.quote },
      { id: "completeness_check", page: completeness.page, quote: completeness.quote },
    ],
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(CAANZ_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${CAANZ_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildCaanzFees());
  if (check) {
    const committed = existsSync(CAANZ_OUT_FILE) ? readFileSync(CAANZ_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${CAANZ_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-caanz-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${CAANZ_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(CAANZ_OUT_FILE), { recursive: true });
  writeFileSync(CAANZ_OUT_FILE, out);
  console.log(`wrote ${CAANZ_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
