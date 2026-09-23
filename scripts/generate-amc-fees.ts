/**
 * Regenerates src/data/health-registration/amc-fees.json from the Australian Medical Council's own pages
 * ("Australian Medical Council.pdf", 53 pages) in data/knowledge/Skill Assessments/Australian Medical Council(AMC)/.
 *
 * The "Pathways to registration for international medical graduates" document (img-pathways.json) defers every
 * AMC fee ("Contact the AMC for fee information."). This document states exactly one AMC fee: the clinical
 * examination (in person and online). It gives no figure for the AMC candidate account / primary source
 * verification, the CAT MCQ examination or the workplace-based assessment -- those are recorded here as
 * "not stated", so the report keeps them unpriced. Same pattern as scripts/generate-img-pathways.ts: parsed
 * from the PDF text (the generator fails if an expected sentence is missing or the figures disagree),
 * gitignored source, committed output, --check for drift.
 *
 * Usage:
 *   npx tsx scripts/generate-amc-fees.ts           writes the JSON
 *   npx tsx scripts/generate-amc-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const AMC_SOURCE_DOCUMENT = "data/knowledge/Skill Assessments/Australian Medical Council(AMC)/Australian Medical Council.pdf";
export const AMC_OUT_FILE = "src/data/health-registration/amc-fees.json";
// Pinned so a regenerate on another day is not drift; bump when the source document is replaced.
const EXTRACTED_DATE = "2026-09-23";

type Page = { num: number; text: string };

/** Finds a sentence (whitespace-normalised, across line and page breaks) and returns its match and page. */
function find(pages: Page[], re: RegExp, what: string): { match: RegExpMatchArray; page: number; quote: string } {
  // Join pages with a marker so a sentence split across a page break still matches, then map back to the page.
  const joined = pages.map((p) => `\u0000${p.num}\u0000 ${p.text}`).join(" ").replace(/\s+/g, " ");
  const match = joined.match(re);
  if (!match || match.index === undefined) throw new Error(`AMC document: ${what} not found (${re})`);
  const before = joined.slice(0, match.index);
  const markers = [...before.matchAll(/\u0000(\d+)\u0000/g)];
  const page = markers.length ? Number(markers[markers.length - 1][1]) : 1;
  return { match, page, quote: match[0].replace(/\u0000\d+\u0000 ?/g, "").trim() };
}

const aud = (s: string) => Number(s.replace(/[$,]/g, ""));

export async function buildAmcFees(sourcePath = AMC_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));

  const reduced = find(
    pages,
    /We have reduced the fee of the AMC in-person clinical exam from (\$[\d,]+) to (\$[\d,]+) and the online clinical exam from (\$[\d,]+) to (\$[\d,]+)\./,
    "clinical examination fee sentence",
  );
  const online = find(pages, /The fee for the online (?:\u0000\d+\u0000 )?clinical (?:\u0000\d+\u0000 )?examination is AUD (\$[\d,]+)\./, "online clinical examination fee sentence");
  const payable = find(pages, /Fees for clinical examinations are payable when an examination session is scheduled\./, "clinical fee payment sentence");

  const inPersonAud = aud(reduced.match[2]);
  const onlineAud = aud(reduced.match[4]);
  if (aud(online.match[1]) !== onlineAud) throw new Error(`AMC document states two online clinical exam fees: ${online.match[1]} vs ${reduced.match[4]}`);

  // What the document says about the other AMC fees: it links out ("Find out more about fees") without a figure.
  const moreAboutFees = find(pages, /Find out more about fees/, "fees link text");
  const anyOtherFigure = pages.some((p) =>
    /(MCQ|multiple.?choice|primary source verification|PSV|candidate account|portfolio|workplace.?based)[^.]{0,120}\$\s?\d/i.test(p.text.replace(/\s+/g, " ")),
  );
  if (anyOtherFigure) throw new Error("AMC document now states a figure next to MCQ / PSV / portfolio / WBA text -- extend this generator");

  return {
    sourceDocument: AMC_SOURCE_DOCUMENT,
    sourceTitle: "Australian Medical Council (AMC) -- Standard pathway, examinations and assessment, other pathways",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-amc-fees.ts",
    effectiveDate: null as string | null,
    effectiveDateNote: "The document states no effective date for the reduced clinical examination fees.",
    fees: [
      {
        id: "amc_clinical_exam_in_person",
        item: "AMC clinical examination (in person)",
        amountAud: inPersonAud,
        previousAmountAud: aud(reduced.match[1]),
        page: reduced.page,
        quote: reduced.quote,
        payment: payable.quote,
      },
      {
        id: "amc_clinical_exam_online",
        item: "AMC clinical examination (online)",
        amountAud: onlineAud,
        previousAmountAud: aud(reduced.match[3]),
        page: reduced.page,
        quote: reduced.quote,
        alsoStated: { page: online.page, quote: online.quote },
        payment: payable.quote,
      },
    ],
    notStated: [
      { id: "amc_candidate_account_psv", item: "AMC candidate account / portfolio and primary source verification (PSV)" },
      { id: "amc_cat_mcq_exam", item: "AMC CAT MCQ examination" },
      { id: "amc_workplace_based_assessment", item: "AMC-accredited workplace-based assessment (WBA)" },
    ].map((f) => ({
      ...f,
      status: "needs human verification",
      reason: `No amount in this document; it only links out ("${moreAboutFees.quote}", p.${moreAboutFees.page}).`,
    })),
    outOfScope:
      "The document gives no ECFMG, specialist-college or CPD-home fees: it states the AMC does not conduct assessments for the Specialist, Expedited Specialist or Short-term training pathways and has no role in registration.",
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(AMC_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${AMC_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildAmcFees());
  if (check) {
    const committed = existsSync(AMC_OUT_FILE) ? readFileSync(AMC_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${AMC_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-amc-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${AMC_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(AMC_OUT_FILE), { recursive: true });
  writeFileSync(AMC_OUT_FILE, out);
  console.log(`wrote ${AMC_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
