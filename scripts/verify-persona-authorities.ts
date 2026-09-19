import { readFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";

async function extractPdfText(pdfPath: string): Promise<string> {
  const dataBuffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  const result = await parser.getText();
  return typeof result === "string" ? result : result.text || "";
}

async function verify(pdfPath: string, expectedAuthority: string, forbiddenTerms: string[]) {
  console.log(`Checking ${pdfPath}...`);
  const text = await extractPdfText(pdfPath);

  const expectedMatches = (text.match(new RegExp(expectedAuthority, "gi")) || []).length;
  console.log(`  Matches for expected authority '${expectedAuthority}': ${expectedMatches}`);

  let hasForbidden = false;
  for (const forbidden of forbiddenTerms) {
    const forbiddenMatches = (text.match(new RegExp(forbidden, "gi")) || []).length;
    console.log(`  Matches for forbidden term '${forbidden}': ${forbiddenMatches}`);
    if (forbiddenMatches > 0) {
      hasForbidden = true;
    }
  }

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes("ACS") ||
      line.includes("VETASSESS") ||
      line.includes("Australian Computer Society") ||
      line.includes("General Professional Authority") ||
      line.includes("Beceri Değerlendirmesi") ||
      line.includes("技能评估")
    ) {
      console.log(`  [L${i + 1}] ${line}`);
    }
  }

  if (hasForbidden) {
    console.error(`FAILED: Forbidden terms found in ${pdfPath}`);
  } else {
    console.log(`PASSED: Authority is consistent in ${pdfPath}`);
  }
}

async function main() {
  const pdfPath = process.argv[2] || "temp_tests/persona-K.pdf";
  await verify(pdfPath, "Australian Computer Society", ["VETASSESS", "General Professional Authority"]);
}

main().catch(console.error);
