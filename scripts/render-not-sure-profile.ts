/**
 * Renders the Software Engineer "Not sure" profile through the real PDF route in en / tr / zh-Hans and prints the page count of each PDF.
 * Writes the text to the given directory (default temp_tests/not-sure).
 *
 *   npx tsx scripts/render-not-sure-profile.ts [outDir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

async function main() {
  const out = process.argv[2] ?? "temp_tests/not-sure";
  mkdirSync(out, { recursive: true });
  const base = REVIEW_PERSONAS["reference-se-au"];
  const persona = { ...base, targetVisa: "not_sure" } as typeof base;
  const bytes: Record<string, Uint8Array> = {};
  const rendered = await renderPersonaPdfTexts({ "se-not-sure": persona }, ["en", "tr", "zh-Hans"], undefined, "2026-10-08T00:00:00Z", (id, locale, b) => {
    bytes[`${id}-${locale}`] = b;
  });
  for (const r of rendered) {
    const key = `${r.id}-${r.locale}`;
    const parser = new PDFParse({ data: bytes[key].slice() });
    const info = await parser.getInfo();
    await parser.destroy();
    writeFileSync(path.join(out, `${key}.txt`), r.text);
    writeFileSync(path.join(out, `${key}.pdf`), bytes[key]);
    console.log(`${key}: ${info.total} pages, ${r.text.length} characters`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
