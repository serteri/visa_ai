import { strFromU8, unzipSync } from "fflate";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

/**
 * Text out of an uploaded source file, in the request (nothing is stored). PDF, DOCX, XLSX and CSV only, 10 MB at most, and the file's own bytes
 * must be of the type its name says (a renamed file is refused). The extracted text is what the extraction compares and what the proposals quote.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** The text kept with the update record and sent to the model is capped; a longer source is cut and says so. */
export const MAX_SOURCE_CHARS = 300_000;

export type SheetRows = { name: string; rows: string[][] };
export type ExtractedSource = { kind: "pdf" | "docx" | "xlsx" | "csv"; text: string; sheets: SheetRows[]; truncated: boolean };

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);
const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");

/** The paragraphs of a .docx: word/document.xml with paragraph, tab and line breaks kept. */
export function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("This is not a Word document (word/document.xml is missing).");
  return decodeEntities(
    strFromU8(xml)
      .replace(/<w:tab\s*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sheetsOf(workbook: XLSX.WorkBook): { text: string; sheets: SheetRows[] } {
  const sheets: SheetRows[] = [];
  const parts: string[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = (XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "", blankrows: false }) as unknown[][]).slice(0, 20_000).map((r) => r.map((c) => String(c ?? "").trim()));
    if (rows.length === 0) continue;
    sheets.push({ name, rows });
    parts.push(`## ${name}\n${rows.map((r) => r.join("\t")).join("\n")}`);
  }
  return { text: parts.join("\n\n"), sheets };
}

export async function extractUpload(fileName: string, bytes: Uint8Array): Promise<ExtractedSource> {
  if (bytes.byteLength === 0) throw new Error("The file is empty.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error(`The file is ${(bytes.byteLength / 1048576).toFixed(1)} MB; the limit is 10 MB.`);
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  let kind: ExtractedSource["kind"];
  let text = "";
  let sheets: SheetRows[] = [];

  if (ext === "pdf") {
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) throw new Error("The file is not a PDF.");
    kind = "pdf";
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      text = (await parser.getText()).pages.map((p) => p.text).join("\n\n");
    } finally {
      await parser.destroy();
    }
  } else if (ext === "docx") {
    if (!startsWith(bytes, [0x50, 0x4b])) throw new Error("The file is not a Word (.docx) document.");
    kind = "docx";
    text = docxText(bytes);
  } else if (ext === "xlsx") {
    if (!startsWith(bytes, [0x50, 0x4b])) throw new Error("The file is not an Excel (.xlsx) workbook.");
    kind = "xlsx";
    ({ text, sheets } = sheetsOf(XLSX.read(bytes, { type: "array" })));
  } else if (ext === "csv") {
    if (bytes.subarray(0, 4096).includes(0)) throw new Error("The file is not a text CSV.");
    kind = "csv";
    ({ text, sheets } = sheetsOf(XLSX.read(new TextDecoder("utf-8").decode(bytes), { type: "string" })));
  } else throw new Error("Only PDF, DOCX, XLSX and CSV files are accepted.");

  text = text.replace(new RegExp(String.fromCharCode(0), "g"), "").trim();
  if (!text) throw new Error("No text could be read from the file (a scanned PDF has no text layer).");
  const truncated = text.length > MAX_SOURCE_CHARS;
  return { kind, text: truncated ? text.slice(0, MAX_SOURCE_CHARS) : text, sheets, truncated };
}
