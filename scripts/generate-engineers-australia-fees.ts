/**
 * Regenerates src/data/skills-assessment/engineers-australia-fees.json from Engineers Australia's migration skills
 * assessment pages ("The Institution of Engineers Australia (1).pdf", 16 pages) in data/knowledge/Skill Assessments/
 * The Institution of Engineers Australia/. (The folder's other two PDFs are the accredited-programs list and an older
 * 175-page compilation with no fees.)
 *
 * "Migration skills assessment fees ... for the 2026 to 2027 period" (p.7-10) states 20 items, each with a fee
 * excluding and including GST: three pathways (Washington/Sydney/Dublin Accord, Australian accredited qualification,
 * competency demonstration report) x four combinations (qualification alone, + relevant skilled employment, + overseas
 * engineering PhD, + both), and eight additional services. The generator fails if a row is missing, a dollar figure is
 * unhandled, or an incl.-GST figure is not 1.1 x the excl.-GST one. Fees do not vary by occupational category; the
 * document does not say which applicants pay the GST-inclusive figure (recorded under notStated). Processing is stated
 * only as time to be ASSIGNED to an assessor: about 15 weeks standard (p.13), 20 business days fast track (p.9).
 *
 * Usage:
 *   npx tsx scripts/generate-engineers-australia-fees.ts           writes the JSON
 *   npx tsx scripts/generate-engineers-australia-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const EA_SOURCE_DOCUMENT =
  "data/knowledge/Skill Assessments/The Institution of Engineers Australia/The Institution of Engineers Australia (1).pdf";
export const EA_OUT_FILE = "src/data/skills-assessment/engineers-australia-fees.json";
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
  if (!match || match.index === undefined) throw new Error(`Engineers Australia document: ${what} not found (${re})`);
  const page = pageAt(doc, match.index);
  const lastPage = pageAt(doc, match.index + match[0].length - 1);
  return { match, page, pages: lastPage === page ? [page] : [page, lastPage], quote: match[0].trim() };
}

const aud = (s: string) => Number(s.replace(/[$,]/g, ""));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

type Pathway = "accord" | "australian" | "cdr" | null;
type Row = { id: string; item: string; pathway: Pathway; addOns: Array<"relevant_skilled_employment" | "overseas_phd">; kind: "assessment" | "additional_service" };

const ROWS: Row[] = [
  { id: "ea_accord", item: "Washington/Sydney/Dublin Accord qualification assessment", pathway: "accord", addOns: [], kind: "assessment" },
  { id: "ea_accord_rse", item: "Washington/Sydney/Dublin Accord qualification assessment plus relevant skilled employment assessment", pathway: "accord", addOns: ["relevant_skilled_employment"], kind: "assessment" },
  { id: "ea_accord_phd", item: "Washington/Sydney/Dublin Accord qualification assessment plus overseas PhD assessment", pathway: "accord", addOns: ["overseas_phd"], kind: "assessment" },
  { id: "ea_accord_rse_phd", item: "Washington/Sydney/Dublin Accord qualification assessment plus relevant skilled employment assessment plus overseas engineering PhD assessment", pathway: "accord", addOns: ["relevant_skilled_employment", "overseas_phd"], kind: "assessment" },
  { id: "ea_australian", item: "Australian engineering qualification assessment", pathway: "australian", addOns: [], kind: "assessment" },
  { id: "ea_australian_rse", item: "Australian engineering qualification assessment plus relevant skilled employment assessment", pathway: "australian", addOns: ["relevant_skilled_employment"], kind: "assessment" },
  { id: "ea_australian_phd", item: "Australian engineering qualification assessment plus overseas engineering PhD assessment", pathway: "australian", addOns: ["overseas_phd"], kind: "assessment" },
  { id: "ea_australian_rse_phd", item: "Australian engineering qualification assessment plus relevant skilled employment assessment plus overseas engineering PhD assessment", pathway: "australian", addOns: ["relevant_skilled_employment", "overseas_phd"], kind: "assessment" },
  { id: "ea_cdr", item: "Standard competency demonstration report", pathway: "cdr", addOns: [], kind: "assessment" },
  { id: "ea_cdr_rse", item: "Competency demonstration report plus relevant skilled employment assessment", pathway: "cdr", addOns: ["relevant_skilled_employment"], kind: "assessment" },
  { id: "ea_cdr_phd", item: "Competency demonstration report plus overseas engineering PhD assessment", pathway: "cdr", addOns: ["overseas_phd"], kind: "assessment" },
  { id: "ea_cdr_rse_phd", item: "Competency demonstration report plus relevant skilled employment assessment plus overseas engineering PhD assessment", pathway: "cdr", addOns: ["relevant_skilled_employment", "overseas_phd"], kind: "assessment" },
  { id: "ea_fast_track", item: "Fast-track assessment fee (additional to MSA assessment fee)", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_separate_rse", item: "Separate relevant skilled employment assessment", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_separate_phd", item: "Separate overseas engineering PhD assessment", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_separate_rse_phd", item: "Separate relevant skilled employment assessment plus overseas engineering PhD assessment", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_review", item: "Review fee", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_appeal", item: "Appeal fee", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_updated_outcome_letter", item: "Updated outcome letter", pathway: null, addOns: [], kind: "additional_service" },
  { id: "ea_administration", item: "Standard administration fee", pathway: null, addOns: [], kind: "additional_service" },
];

export async function buildEngineersAustraliaFees(sourcePath = EA_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));
  const doc = joinPages(pages);

  const period = find(doc, /Our migration skills assessment fees for the (\d{4}) to (\d{4}) period are set out below\./, "fee period");

  // Each item name is followed by "$excl $incl"; a longer item that starts with a shorter one is matched on its own
  // text, so the shorter item must be followed directly by its figures.
  const fees = ROWS.map((r) => {
    const m = find(doc, new RegExp(`${esc(r.item)} (\\$[\\d,]+(?:\\.\\d{2})?) (\\$[\\d,]+(?:\\.\\d{2})?)`), r.item);
    const excl = aud(m.match[1]);
    const incl = aud(m.match[2]);
    if (Math.round(excl * 110) !== Math.round(incl * 100)) throw new Error(`${r.id}: incl. GST ${incl} is not 1.1 x ${excl}`);
    return { id: r.id, item: r.item, kind: r.kind, pathway: r.pathway, addOns: r.addOns, feeExclGstAud: excl, feeInclGstAud: incl, page: m.page, quote: m.quote };
  });

  const handled = new Set(fees.flatMap((f) => [f.feeExclGstAud, f.feeInclGstAud]));
  const stray = [...doc.text.matchAll(/\$\s?([\d,]+(?:\.\d{2})?)/g)].map((m) => aud(m[1])).filter((n) => !handled.has(n));
  if (stray.length) throw new Error(`Engineers Australia document states dollar figures this generator does not handle: ${stray.join(", ")}`);

  const standard = find(doc, /Migration skills assessment applications submitted for standard assessment generally take (\d+) weeks to be assigned to an assessor\. This doesn’t mean you’ll receive an outcome in this timeframe\./, "standard processing");
  const fastTrack = find(doc, /This option carries a fee but your application can be assigned to an assessor within (\d+) business days\. This doesn’t mean you’ll receive an outcome in this timeframe\./, "fast-track processing");
  const managerRse = find(doc, /This option is available for all engineering occupation categories except engineering manager, where it’s a mandatory part of the CDR assessment\./, "engineering manager: skilled employment mandatory");
  const managerCdr = find(doc, /Candidates may seek Migration Skills Assessment \(MSA\) via Competency Demonstration Report \(CDR\) pathway\./, "engineering manager: CDR pathway");
  const australianPathway = find(doc, /You can apply via the Australian qualification pathway if: ● your program is accredited by Engineers Australia, and ● you started your program during or after the year of accreditation commencement\./, "Australian pathway eligibility");
  const cdrPathway = find(doc, /You should apply via the competency demonstration report \(CDR\) assessment pathway if you: (● .+?) Under the CDR pathway/, "CDR pathway eligibility");
  const phd = find(doc, /You don’t need this service if you completed your PhD in Australia\./, "overseas PhD scope");
  const categories = find(doc, /Engineers Australia recognises four occupational categories for skilled migration: ● Professional engineer ● Engineering technologist ● Engineering associate ● Engineering manager\./, "occupational categories");

  return {
    sourceDocument: EA_SOURCE_DOCUMENT,
    sourceTitle: "Engineers Australia — Migration skills assessment (fees and additional services, 2026–2027)",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-engineers-australia-fees.ts",
    feePeriod: { from: Number(period.match[1]), to: Number(period.match[2]), page: period.page, quote: period.quote },
    currency: "AUD",
    occupationalCategories: { page: categories.page, quote: categories.quote, varyFees: false, note: "The fee tables do not vary by occupational category." },
    pathways: {
      australian: { pages: australianPathway.pages, quote: australianPathway.quote },
      cdr: { pages: cdrPathway.pages, quote: cdrPathway.quote },
      engineeringManager: {
        cdrQuote: managerCdr.quote,
        cdrPage: managerCdr.page,
        skilledEmploymentMandatoryQuote: managerRse.quote,
        skilledEmploymentMandatoryPage: managerRse.page,
      },
      overseasPhd: { page: phd.page, quote: phd.quote },
    },
    fees,
    processing: {
      standardWeeksToAssessor: Number(standard.match[1]),
      standardPage: standard.page,
      standardQuote: standard.quote,
      fastTrackBusinessDaysToAssessor: Number(fastTrack.match[1]),
      fastTrackPage: fastTrack.page,
      fastTrackQuote: fastTrack.quote,
      note: "Time to be assigned to an assessor; the document states no time to an outcome.",
    },
    notStated: [
      {
        id: "ea_gst_applicability",
        item: "Which applicants pay the GST-inclusive figure",
        status: "needs human verification",
        reason: "Every fee is given excluding and including GST; the document does not say who pays which.",
      },
    ],
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(EA_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${EA_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildEngineersAustraliaFees());
  if (check) {
    const committed = existsSync(EA_OUT_FILE) ? readFileSync(EA_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${EA_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-engineers-australia-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${EA_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(EA_OUT_FILE), { recursive: true });
  writeFileSync(EA_OUT_FILE, out);
  console.log(`wrote ${EA_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
