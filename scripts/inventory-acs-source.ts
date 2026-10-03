/**
 * Read-only inventory of an assessing authority's source folder, the first step of a sourced fee extraction
 * (the same discipline as scripts/generate-engineers-australia-fees.ts / generate-aims-fees.ts):
 *
 *   1. every file in the folder with size, modification time and (PDF) page count, and which one is the newest guide
 *      (latest date in the file name, else latest mtime);
 *   2. for that guide, every dollar figure with its page and the sentence around it, and every processing-time
 *      statement (weeks / business days) with its page -- the raw material a generator turns into structured rows.
 * It extracts nothing into the app and writes nothing.
 *
 *   npx tsx scripts/inventory-acs-source.ts                       ACS folder, newest guide
 *   npx tsx scripts/inventory-acs-source.ts --file "<name>.pdf"   a specific file in the folder
 *   npx tsx scripts/inventory-acs-source.ts --dir "<folder under data/knowledge>"
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import { parseDocumentVersion } from "../lib/chat/document-versions";

const ROOT = path.join(process.cwd(), "data", "knowledge");
const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DIR = path.resolve(arg("--dir") ? path.join(ROOT, arg("--dir")!) : path.join(ROOT, "Skill Assessments", "Australian Computer Society Incorporated"));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function pagesOf(file: string): Promise<{ num: number; text: string }[]> {
  const parser = new PDFParse({ data: readFileSync(file) });
  try {
    return (await parser.getText()).pages.map((p: { num: number; text: string }) => ({ num: p.num, text: p.text }));
  } finally {
    await parser.destroy();
  }
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

async function main() {
  const files = walk(DIR).sort();
  if (files.length === 0) throw new Error(`No files under ${DIR}`);
  console.log(`Folder: ${path.relative(process.cwd(), DIR)}\n`);
  console.log(["SIZE (bytes)".padStart(12), "MTIME (UTC)".padEnd(20), "PAGES".padStart(5), "FILE"].join("  "));
  const rows: { file: string; mtime: Date; date?: string; pages?: number }[] = [];
  for (const file of files) {
    const st = statSync(file);
    const isPdf = file.toLowerCase().endsWith(".pdf");
    let pages: number | undefined;
    if (isPdf) pages = (await pagesOf(file)).length;
    rows.push({ file, mtime: st.mtime, date: parseDocumentVersion(path.basename(file)).date, pages });
    console.log([String(st.size).padStart(12), st.mtime.toISOString().slice(0, 19).replace("T", " ").padEnd(20), String(pages ?? "-").padStart(5), path.relative(DIR, file)].join("  "));
  }

  const wanted = arg("--file");
  const pdfs = rows.filter((r) => r.file.toLowerCase().endsWith(".pdf"));
  const newest = wanted
    ? pdfs.find((r) => path.basename(r.file) === wanted)
    : [...pdfs].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.mtime.getTime() - a.mtime.getTime())[0];
  if (!newest) throw new Error(wanted ? `${wanted} is not a PDF in ${DIR}` : "No PDF in the folder");
  console.log(`\nNewest guide: ${path.relative(DIR, newest.file)} (${newest.date ? `file-name date ${newest.date}` : "no date in the name"}, mtime ${newest.mtime.toISOString().slice(0, 10)}, ${newest.pages} pages)`);

  const pages = await pagesOf(newest.file);
  console.log("\nDOLLAR FIGURES (page, figure, quote):");
  for (const p of pages) {
    const text = squash(p.text);
    for (const m of text.matchAll(/(?:AUD|A\$|\$)\s?\d[\d,]*(?:\.\d{2})?/g)) {
      const start = Math.max(0, m.index! - 110);
      console.log(`  p.${p.num}  ${m[0]}  "${text.slice(start, Math.min(text.length, m.index! + m[0].length + 60))}"`);
    }
  }
  console.log("\nPROCESSING TIME STATEMENTS (page, quote):");
  for (const p of pages) {
    const text = squash(p.text);
    for (const m of text.matchAll(/[^.]*\b(?:\d+(?:\s*(?:-|to)\s*\d+)?\s*(?:weeks?|business days?|working days?|days|months?)|processing time|turnaround)\b[^.]*\./gi)) {
      console.log(`  p.${p.num}  "${squash(m[0])}"`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
