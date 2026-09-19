import { readFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";

async function extractPdfText(pdfPath: string): Promise<string> {
  const dataBuffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  const result = await parser.getText();
  return typeof result === "string" ? result : result.text || "";
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx scripts/extract-pdf-text.ts <path-to-pdf>");
    process.exit(1);
  }

  const text = await extractPdfText(pdfPath);
  console.log(text);
}

main().catch((err) => {
  console.error("Failed to extract PDF text:", err);
  process.exit(1);
});
