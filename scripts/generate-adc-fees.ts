/**
 * Regenerates src/data/skills-assessment/adc-fees.json from the Australian Dental Council's skills assessment page
 * ("Australian Dental Council Limited.pdf", 3 pages) in data/knowledge/Skill Assessments/Australian Dental Council Limited/.
 *
 * The document states NO fee amount. It says to "make payment as instructed" (p.2), that a skills assessment requested
 * after the dental practitioner assessment process carries "no additional charge" (p.1), and that reissuing a lapsed
 * letter attracts "An administrative fee" (p.3) -- so the fees are recorded as "needs human verification", never as
 * numbers. Scope: "We only conduct skills assessments for dentists and dental specialists" (p.2). No processing time is
 * stated. The generator fails if a dollar figure ever appears, so an updated document with a fee schedule is noticed.
 *
 * Usage:
 *   npx tsx scripts/generate-adc-fees.ts           writes the JSON
 *   npx tsx scripts/generate-adc-fees.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const ADC_SOURCE_DOCUMENT = "data/knowledge/Skill Assessments/Australian Dental Council Limited/Australian Dental Council Limited.pdf";
export const ADC_OUT_FILE = "src/data/skills-assessment/adc-fees.json";
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

/** Finds a passage; returns the match, its page and the exact text as the quote. */
function find(doc: Doc, re: RegExp, what: string) {
  const match = doc.text.match(re);
  if (!match || match.index === undefined) throw new Error(`ADC document: ${what} not found (${re})`);
  return { match, page: pageAt(doc, match.index), quote: match[0].trim() };
}

export async function buildAdcFees(sourcePath = ADC_SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages: Page[] = parsed.pages.map((p: Page) => ({ num: p.num, text: p.text }));
  const doc = joinPages(pages);

  const amounts = [...doc.text.matchAll(/\$\s?\d[\d,.]*|\bAUD\s?\d|\d[\d,.]*\s?AUD\b/g)].map((m) => m[0]);
  if (amounts.length) throw new Error(`ADC document now states amounts (${amounts.join(", ")}) -- extend this generator to extract them`);

  const payment = find(doc, /Complete your skills application and make payment as instructed\./, "payment instruction");
  const noCharge = find(doc, /If you require a skills assessment for migration purposes after you finish the dental practitioner assessment process, you will be given the opportunity to request one then\. There is no additional charge for this service\./, "no additional charge");
  const reissue = find(doc, /Contact us if your assessment lapses and you wish to have your letter reissued\. An administrative fee will apply\./, "reissue fee");
  const scope = find(doc, /We only conduct skills assessments for dentists and dental specialists\./, "scope");
  const validity = find(doc, /your skills assessment is valid for three years from the date of issue\./, "validity");

  return {
    sourceDocument: ADC_SOURCE_DOCUMENT,
    sourceTitle: "Australian Dental Council — Skills assessment",
    sourcePageCount: pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-adc-fees.ts",
    amountsStated: false,
    scope: { page: scope.page, quote: scope.quote, occupations: ["dentists", "dental specialists"] },
    fees: [
      { id: "adc_skills_assessment_after_dpa", item: "Skills assessment requested after the dental practitioner assessment process", amountAud: 0, page: noCharge.page, quote: noCharge.quote },
    ],
    notStated: [
      { id: "adc_skills_assessment_fee", item: "Skills assessment fee (skills assessment only, or registration and skills assessment)", page: payment.page, quote: payment.quote },
      { id: "adc_reissue_fee", item: "Administrative fee to reissue a lapsed skills assessment letter", page: reissue.page, quote: reissue.quote },
    ].map((f) => ({ ...f, status: "needs human verification", reason: "The document names or implies this fee but states no amount." })),
    processingTimeStated: false,
    validity: { years: 3, page: validity.page, quote: validity.quote },
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(ADC_SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${ADC_SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const out = serialize(await buildAdcFees());
  if (check) {
    const committed = existsSync(ADC_OUT_FILE) ? readFileSync(ADC_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${ADC_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-adc-fees.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${ADC_OUT_FILE} matches a fresh parse of the source document`);
    return;
  }
  mkdirSync(path.dirname(ADC_OUT_FILE), { recursive: true });
  writeFileSync(ADC_OUT_FILE, out);
  console.log(`wrote ${ADC_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
