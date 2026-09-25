/**
 * Regenerates src/data/skills-assessment/aims-fees.json from the Australian Institute of Medical Scientists'
 * migration pages, guidelines and forms ("Australian Institute of Medical Scientists.pdf", 147 pages) in
 * data/knowledge/Skill Assessments/Australian Institute of Medical Scientists/.
 *
 * "Fees for Qualification Assessment & Examinations" (p.18-19) is the document's only fee table; every other section
 * says "Refer to the AIMS website for current fees". Amounts are written "900.00 AUD", not "$900". Two columns: applying
 * from outside Australia (fee excluding GST) and from within Australia (fee including GST) -- "If the applicant's
 * postal / residential address is in Australia, the GST (10%) will apply". 14 rows; the employer-requested assessment
 * has a single figure (marked "*", with no footnote in the document) and discipline-specific membership examination has
 * no outside-Australia figure ("n/a"). The generator fails if a row is missing, an amount is unhandled, or a
 * within-Australia figure is not 1.1 x the outside-Australia one.
 * Processing: individual assessments "within 6 months of their receipt" (current guidelines, p.57 for 234611/311213,
 * p.81 for 311216); employer-requested "up to 16 weeks" (p.8). Occupations: 234611, 311213, 311216.
 *
 * Usage:
 *   npx tsx scripts/generate-aims-fees.ts           writes the JSON
 *   npx tsx scripts/generate-aims-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const AIMS_SOURCE_DOCUMENT =
  "data/knowledge/Skill Assessments/Australian Institute of Medical Scientists/Australian Institute of Medical Scientists.pdf";
export const AIMS_OUT_FILE = "src/data/skills-assessment/aims-fees.json";
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
  if (!match || match.index === undefined) throw new Error(`AIMS document: ${what} not found (${re})`);
  const page = pageAt(doc, match.index);
  const lastPage = pageAt(doc, match.index + match[0].length - 1);
  return { match, page, pages: lastPage === page ? [page] : [page, lastPage], quote: match[0].trim() };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const AMT = String.raw`(\d+\.\d{2}) AUD`;

type Row = { id: string; item: string; kind: "assessment" | "amendment" | "appeal" | "reissue" | "examination" | "remark" | "deferral"; occupations?: string[]; columns: "both" | "within_only" | "single" };
const ROWS: Row[] = [
  { id: "aims_assessment_mls_mlt", item: "Assessment - Medical Laboratory Scientist & Technician", kind: "assessment", occupations: ["234611", "311213"], columns: "both" },
  { id: "aims_assessment_ivf", item: "Assessment - Medical Laboratory Scientist - IVF Embryologist", kind: "assessment", occupations: ["234611"], columns: "both" },
  { id: "aims_assessment_pathology_collector", item: "Assessment - Phlebotomy & Pathology Collector", kind: "assessment", occupations: ["311216"], columns: "both" },
  { id: "aims_assessment_employer_requested", item: "Assessment - Employer requested (not for individuals) *", kind: "assessment", columns: "single" },
  { id: "aims_amendment", item: "Amendment to Professional Skills & Qualifications Assessment", kind: "amendment", columns: "both" },
  { id: "aims_appeal", item: "Appeal of Professional Skills & Qualifications Assessment", kind: "appeal", columns: "both" },
  { id: "aims_reissue_lost_letter", item: "Re-issue “Lost” Assessment & Examination Letter", kind: "reissue", columns: "both" },
  { id: "aims_exam_mls", item: "Professional Examination - Medical Laboratory Scientist", kind: "examination", occupations: ["234611"], columns: "both" },
  { id: "aims_exam_ivf", item: "Professional Examination - IVF Embryologist", kind: "examination", occupations: ["234611"], columns: "both" },
  { id: "aims_exam_pathology_collector", item: "Professional Examination - Phlebotomy & Pathology Collector", kind: "examination", occupations: ["311216"], columns: "both" },
  { id: "aims_membership_exam_multi", item: "Membership Examination - Multi discipline", kind: "examination", columns: "both" },
  { id: "aims_membership_exam_discipline", item: "Membership Examination - Discipline specific", kind: "examination", columns: "within_only" },
  { id: "aims_membership_exam_remark", item: "Membership Examination remark (single discipline only)", kind: "remark", columns: "both" },
  { id: "aims_exam_deferral", item: ".Professional Examination deferral (until closing day)", kind: "deferral", columns: "both" },
];

export async function buildAimsFees(sourcePath = AIMS_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));
  const doc = joinPages(pages);

  const gst = find(
    doc,
    /If the applicant’s postal \/ residential address is in Australia, the GST \(10%\) will apply\. If the applicant’s postal \/ residential address is outside Australia, the GST will not apply\./,
    "GST rule",
  );

  const fees = ROWS.map((r) => {
    const tail = r.columns === "both" ? `${AMT} ${AMT}` : r.columns === "within_only" ? `n/a ${AMT}` : AMT;
    const m = find(doc, new RegExp(`${esc(r.item)} ${tail}`), r.item);
    const outside = r.columns === "both" ? Number(m.match[1]) : null;
    const within = r.columns === "both" ? Number(m.match[2]) : r.columns === "within_only" ? Number(m.match[1]) : null;
    const single = r.columns === "single" ? Number(m.match[1]) : null;
    if (outside !== null && within !== null && Math.round(outside * 110) !== Math.round(within * 100)) throw new Error(`${r.id}: within-Australia ${within} is not 1.1 x ${outside}`);
    return {
      id: r.id,
      item: r.item.replace(/^\./, "").replace(/ \*$/, ""),
      kind: r.kind,
      ...(r.occupations ? { occupations: r.occupations } : {}),
      outsideAustraliaExclGstAud: outside,
      withinAustraliaInclGstAud: within,
      ...(single !== null
        ? { singleAmountAud: single, singleAmountNote: "One figure only, marked \"*\"; the document gives no footnote and does not say which column it belongs to." }
        : {}),
      page: m.page,
      quote: m.quote,
    };
  });

  const handled = new Set(fees.flatMap((f) => [f.outsideAustraliaExclGstAud, f.withinAustraliaInclGstAud, f.singleAmountAud ?? null]).filter((n): n is number => n !== null));
  const table = find(doc, /Fees for Qualification Assessment & Examinations .+? Please note all fees are subject to change without notice and may change at any time\./, "fee table");
  const stray = [...table.quote.matchAll(/(\d+\.\d{2}) AUD/g)].map((x) => Number(x[1])).filter((n) => !handled.has(n));
  if (stray.length) throw new Error(`AIMS fee table has amounts this generator does not handle: ${stray.join(", ")}`);
  const outsideTable = [...doc.text.matchAll(/(\d+\.\d{2}) AUD|\$\s?\d/g)].filter((x) => x.index! < doc.text.indexOf(table.quote) || x.index! > doc.text.indexOf(table.quote) + table.quote.length);
  if (outsideTable.length) throw new Error(`AIMS document states amounts outside the fee table: ${outsideTable.map((x) => x[0]).join(", ")}`);

  const individualMlsMlt = find(doc, /Guidelines for Skills and Qualifications Assessment of Occupations Medical Laboratory Scientist ANZSCO 234611 and Medical Laboratory Technician ANZSCO 311213 .+? We aim to complete all assessments within (\d+) months of their receipt, however the verification of an applicant’s supporting documents may extend that processing time\./, "234611/311213 processing");
  const individualPc = find(doc, /Pathology Collector \/ Phlebotomist\. We aim to complete all assessments within (\d+) months of their receipt, however the verification of an applicant’s supporting documents may extend that processing time\./, "311216 processing");
  const employer = find(doc, /Please allow up to (\d+) weeks for the assessment to be conducted\./, "employer-requested processing");
  const mlsQuote = /We aim to complete all assessments within \d+ months of their receipt, however the verification of an applicant’s supporting documents may extend that processing time\./;
  const mlsPage = pageAt(doc, individualMlsMlt.match.index! + individualMlsMlt.match[0].search(mlsQuote));

  const occupations = find(doc, /Guidelines for Skills and Qualifications Assessment of Occupations Pathology Collector \/ Phlebotomist ANZSCO 311216/, "311216 guidelines title");
  const review = find(doc, /There is no charge for this review, which is conducted by the committee/, "free review");

  return {
    sourceDocument: AIMS_SOURCE_DOCUMENT,
    sourceTitle: "Australian Institute of Medical Scientists — Qualification and Skills Assessments for Migration (web pages, guidelines and forms)",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-aims-fees.ts",
    currency: "AUD",
    gstRule: { page: gst.page, quote: gst.quote },
    occupations: [
      { anzscoCode: "234611", title: "Medical Laboratory Scientist" },
      { anzscoCode: "311213", title: "Medical Laboratory Technician" },
      { anzscoCode: "311216", title: "Pathology Collector / Phlebotomist", page: occupations.page, quote: occupations.quote },
    ],
    fees,
    processing: {
      individual: {
        months: Number(individualMlsMlt.match[1]),
        pages: [mlsPage, individualPc.page],
        quote: `We aim to complete all assessments within ${individualMlsMlt.match[1]} months of their receipt, however the verification of an applicant’s supporting documents may extend that processing time.`,
      },
      employerRequested: { weeks: Number(employer.match[1]), page: employer.page, quote: employer.quote },
    },
    notes: [{ id: "review_free", page: review.page, quote: review.quote }],
    notStated: [
      {
        id: "aims_special_professional_examination_fee",
        item: "Special Professional Examination (Medical Laboratory Scientist, overseas-qualification option)",
        status: "needs human verification",
        reason: "The fee table lists the Professional Examination but no Special Professional Examination fee.",
      },
    ],
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(AIMS_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${AIMS_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildAimsFees());
  if (check) {
    const committed = existsSync(AIMS_OUT_FILE) ? readFileSync(AIMS_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${AIMS_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-aims-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${AIMS_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(AIMS_OUT_FILE), { recursive: true });
  writeFileSync(AIMS_OUT_FILE, out);
  console.log(`wrote ${AIMS_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
