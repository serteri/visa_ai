import { readFileSync, existsSync } from "node:fs";
import { PDFParse } from "pdf-parse";

async function extractPdfText(pdfPath: string): Promise<string> {
  const dataBuffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  const result = await parser.getText();
  return typeof result === "string" ? result : result.text || "";
}

async function verify(pdfPath: string, expectedAuthority: string, personaName: string): Promise<boolean> {
  console.log(`\n--------------------------------------------------`);
  console.log(`Verifying ${personaName} (${pdfPath})...`);
  if (!existsSync(pdfPath)) {
    console.error(`  ❌ ERROR: File does not exist: ${pdfPath}`);
    return false;
  }
  const fullText = await extractPdfText(pdfPath);

  // Split out Appendix C (Resources Directory) where all assessing authorities are listed as reference links
  const [reportText] = fullText.split(/ACS \(Australian Computer Society\)|VETASSESS\s+Engineers Australia|Official Assessing Authorities Directory|Resmi Otoriteler|官方评估机构/i);

  const expectedMatches = (reportText.match(new RegExp(expectedAuthority, "gi")) || []).length;
  console.log(`  Matches for expected authority '${expectedAuthority}' in active report sections: ${expectedMatches}`);

  // Check for the specific generic fallback phrase that caused the original bug
  const hasGenericFallback =
    reportText.includes("General Professional Authority") ||
    reportText.includes("Genel Mesleki Değerlendirme Kurumu") ||
    (reportText.includes("VETASSESS") && expectedAuthority !== "VETASSESS");

  const lines = reportText.split("\n");
  console.log("  Extracted authority lines in personalized report body:");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes("ACS") ||
      line.includes("VETASSESS") ||
      line.includes("Engineers Australia") ||
      line.includes("Trades Recognition Australia") ||
      line.includes("TRA") ||
      line.includes("General Professional Authority") ||
      line.includes("Beceri Değerlendirmesi") ||
      line.includes("技能评估")
    ) {
      console.log(`    [L${i + 1}] ${line.trim()}`);
    }
  }

  if (expectedMatches === 0) {
    console.error(`  ❌ FAILED: Expected authority '${expectedAuthority}' not found in report body for ${personaName}`);
    return false;
  }

  if (hasGenericFallback) {
    console.error(`  ❌ FAILED: Incorrect generic fallback or VETASSESS found in report body for ${personaName}`);
    return false;
  }

  console.log(`  ✅ PASSED: ${personaName} consistently resolved to '${expectedAuthority}' across all active report sections.`);
  return true;
}

async function main() {
  const testCases = [
    {
      path: "temp_tests/persona-K.pdf",
      authority: "Australian Computer Society",
      personaName: "Persona K (Turkish - Software Engineer 261313)",
    },
    {
      path: "temp_tests/persona-L.pdf",
      authority: "Australian Computer Society",
      personaName: "Persona L (Chinese - Software Engineer 261313)",
    },
    {
      path: "temp_tests/persona-M.pdf",
      authority: "Engineers Australia",
      personaName: "Persona M (Turkish - Civil Engineer 233211)",
    },
    {
      path: "temp_tests/persona-N.pdf",
      authority: "Trades Recognition Australia",
      personaName: "Persona N (Chinese - Chef 351311)",
    },
  ];

  let allPassed = true;
  for (const tc of testCases) {
    const passed = await verify(tc.path, tc.authority, tc.personaName);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
