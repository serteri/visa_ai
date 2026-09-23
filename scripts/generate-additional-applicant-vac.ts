/**
 * Regenerates src/data/additional-applicant-vac.json: the per-person Visa Application Charge for additional
 * applicants (18+ and under 18), read independently from EACH subclass's own Department of Home Affairs page in
 * data/knowledge (gitignored). The 23 September 2026 versions of these pages carry a fee table:
 *
 *   Product                              Quantity  Price
 *   SI189 Skilled Independent ...        1         6,135.00
 *   Additional Applicant Charge 18+      1         3,070.00
 *   Additional Applicant Charge U18      1         1,540.00
 *
 * Each subclass is parsed from its own file only -- a figure is never carried over from another subclass. A
 * subclass whose document has no such table is recorded as "not stated" (deferred to the Visa Pricing
 * Estimator), so src/data/visa-fees.json keeps its value and fee-provenance.json keeps "needs human
 * verification". scripts/test-fee-provenance.ts checks visa-fees.json and fee-provenance.json against this file.
 *
 * 482 is not listed: its document states the charges in a sentence ("AUD4,015.00 for the main applicant and
 * for each dependant 18 years and over. AUD1,005.00 for each dependant under 18 years old"), already sourced
 * in fee-provenance.json.
 *
 * Usage:
 *   npx tsx scripts/generate-additional-applicant-vac.ts           writes the JSON
 *   npx tsx scripts/generate-additional-applicant-vac.ts --check   exits 1 if the committed JSON differs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const VAC_OUT_FILE = "src/data/additional-applicant-vac.json";
// Pinned so a regenerate on another day is not drift; bump when the source documents are replaced.
const EXTRACTED_DATE = "2026-09-23";

const K = "data/knowledge";
export const SUBCLASS_DOCUMENTS: Record<string, string> = {
  "189": `${K}/Skilled Independent visa (subclass 189) Points-tested stream/Skilled Independent visa (subclass 189) Points-tested stream_23_09_2026.pdf`,
  "190": `${K}/Subclass 190 Skilled Nominated visa/Subclass 190 Skilled Nominated visa_23September2026.pdf`,
  "491": `${K}/Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant/Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant_23September2026.pdf`,
  "485": `${K}/Temporary Graduate visa (subclass 485) Post-Higher Education Work stream/Temporary Graduate visa (subclass 485) Post-Higher Education Work stream _23September2026.pdf`,
  "500": `${K}/Visa_500/Student visa_class_500_23September2026.pdf`,
  "820": `${K}/(Subclasses 820 and 801) Partner visas (apply in Australia)/Subclass 820 Partner visa (temporary)/Subclass 820 Partner visa (temporary)_23September2026.pdf`,
};

type Row = { amountAud: number; page: number; quote: string };

function tableRow(pages: Array<{ num: number; text: string }>, label: "18+" | "U18"): Row | null {
  const re = new RegExp(`^Additional Applicant Charge ${label.replace("+", "\\+")}\\s+1\\s+([\\d,]+\\.\\d{2})$`);
  const hits: Row[] = [];
  for (const p of pages) {
    for (const raw of p.text.split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, " ").trim();
      const m = line.match(re);
      if (m) hits.push({ amountAud: Number(m[1].replace(/,/g, "")), page: p.num, quote: line.replace(/ 1 /, " | 1 | ") });
    }
  }
  if (hits.length > 1) throw new Error(`"Additional Applicant Charge ${label}" appears ${hits.length} times -- ambiguous`);
  return hits[0] ?? null;
}

export async function buildAdditionalApplicantVac() {
  const subclasses: Record<string, unknown> = {};
  for (const [subclass, file] of Object.entries(SUBCLASS_DOCUMENTS)) {
    if (!existsSync(file)) throw new Error(`${subclass}: source document missing: ${file}`);
    const parser = new PDFParse({ data: readFileSync(file) });
    const parsed = await parser.getText();
    await parser.destroy();
    const pages = parsed.pages.map((p: { num: number; text: string }) => ({ num: p.num, text: p.text }));
    const adult = tableRow(pages, "18+");
    const child = tableRow(pages, "U18");
    const intro = pages
      .map((p) => p.text.replace(/\s+/g, " "))
      .join(" ")
      .match(/There is also a (?:charge|fee) for each family member (?:who|that) applies? for the visa(?: with you)?\./)?.[0];
    subclasses[subclass] = {
      sourceDocument: file,
      intro: intro ?? null,
      adult18Plus: adult ?? { status: "not stated -- deferred to the Visa Pricing Estimator" },
      childUnder18: child ?? { status: "not stated -- deferred to the Visa Pricing Estimator" },
    };
  }
  return { extractedDate: EXTRACTED_DATE, generatedBy: "scripts/generate-additional-applicant-vac.ts", subclasses };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (Object.values(SUBCLASS_DOCUMENTS).some((f) => !existsSync(f))) {
    console.log("SKIPPED: the subclass documents are not present (data/knowledge is gitignored) -- nothing to regenerate or check.");
    return;
  }
  const out = serialize(await buildAdditionalApplicantVac());
  if (check) {
    const committed = existsSync(VAC_OUT_FILE) ? readFileSync(VAC_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${VAC_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-additional-applicant-vac.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${VAC_OUT_FILE} matches a fresh parse of the source documents`);
    return;
  }
  writeFileSync(VAC_OUT_FILE, out);
  console.log(`wrote ${VAC_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
