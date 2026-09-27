/**
 * Regenerates src/data/state-occupation-lists/wa.json -- Western Australia's State nomination occupation lists -- from
 * WA's own 2025-26 documents (read by exact filename):
 *
 *   1. "2025-26 Eligible occupations WA.pdf" (58 pages): every eligible occupation, by industry sector, each line
 *      "<occupation> | <stream>" with stream "General - WASMOL Schedule 1", "General - WASMOL Schedule 2" or
 *      "Graduate". The document prints NO program year, date, ANZSCO code or visa subclass; the program year 2025-26
 *      is the filename's and the program document's ("2025-26 Eligibility requirements", p.1).
 *   2. "State Nominated Migration Program/State Nominated Migration Program Western Australia.pdf": the stream rules
 *      -- each stream leads to subclass 190 or 491 (p.3, p.7, p.11); Schedule 1 needs one year of work experience in
 *      the last 10 years (p.4-5) and, for 190, a WA contract of employment (p.5); Schedule 2 needs, for 190, a WA
 *      contract of employment (p.9); Graduate needs at least two academic years of WA study (p.13).
 *
 * ANZSCO codes are NOT in the list, so each title is matched: first to WA's own occupation-search.csv (title ->
 * code), else to the Home Affairs skilled occupation list (data/knowledge/Skilled Occupation List.md, ANZSCO 2013
 * code, which 190/491 use). A title neither source names exactly is kept with anzscoCode null (never guessed) and is
 * not matchable. Subclass eligibility: "eligible for your intended visa subclass" (p.2) -- WA's own v190/v491 flags
 * where occupation-search.csv has the occupation, else the Home Affairs list's 190 / 491 (State or Territory
 * nominated) for that code.
 *
 * Usage:
 *   npx tsx scripts/generate-wa-occupations.ts           writes the JSON
 *   npx tsx scripts/generate-wa-occupations.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

const WA_DIR = "data/knowledge/State Immigrations/Western Australia";
export const WA_LIST_DOCUMENT = `${WA_DIR}/2025-26 Eligible occupations WA.pdf`;
export const WA_PROGRAM_DOCUMENT = `${WA_DIR}/State Nominated Migration Program/State Nominated Migration Program Western Australia.pdf`;
const WA_SEARCH_CSV = `${WA_DIR}/occupation-search.csv`;
const HOME_AFFAIRS_LIST = "data/knowledge/Skilled Occupation List.md";
export const WA_OUT_FILE = "src/data/state-occupation-lists/wa.json";
// Pinned so a regenerate on another day is not drift; bump when a source document is replaced.
const EXTRACTED_DATE = "2026-09-28";

type Stream = "schedule1" | "schedule2" | "graduate";
const STREAM_LABEL: Record<string, Stream> = {
  "General - WASMOL Schedule 1": "schedule1",
  "General - WASMOL Schedule 2": "schedule2",
  Graduate: "graduate",
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

async function pdfPages(file: string): Promise<Array<{ num: number; text: string }>> {
  const parser = new PDFParse({ data: readFileSync(file) });
  const parsed = await parser.getText();
  await parser.destroy();
  return parsed.pages.map((p: { num: number; text: string }) => ({ num: p.num, text: p.text }));
}

/** The eligible-occupations list: "<title>\n|\n<stream>" triples, with sector headings in between. */
function parseList(pages: Array<{ num: number; text: string }>) {
  const lines: Array<{ text: string; page: number }> = [];
  for (const p of pages) for (const l of p.text.split(/\r?\n/)) if (l.trim()) lines.push({ text: l.trim(), page: p.num });
  const entries: Array<{ title: string; stream: Stream; streamLabel: string; sector: string; page: number }> = [];
  let sector = "";
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1]?.text;
    if (next === "|") {
      const label = lines[i + 2]?.text ?? "";
      const stream = STREAM_LABEL[label];
      if (!stream) throw new Error(`WA list p.${lines[i].page}: unknown stream "${label}" for "${lines[i].text}"`);
      entries.push({ title: lines[i].text, stream, streamLabel: label, sector, page: lines[i].page });
      i += 2;
    } else if (lines[i].text !== "|") {
      sector = lines[i].text; // a heading line (not followed by "|")
    }
  }
  return entries;
}

function csvRows(file: string): string[][] {
  const parse = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  return readFileSync(file, "utf8").trim().split(/\r?\n/).map(parse);
}

/** Home Affairs list: title -> ANZSCO 2013 code and whether it is on the 190 / 491 (State or Territory nominated) lists. */
function homeAffairsIndex() {
  const index = new Map<string, { code: string; s190: boolean; s491: boolean }>();
  for (const line of readFileSync(HOME_AFFAIRS_LIST, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("| ") || line.startsWith("| Occupation") || line.startsWith("| :")) continue;
    const cells = line.replace(/​/g, "").split(" | ");
    const title = cells[0].replace(/^\|\s*/, "").replace(/\\/g, "").trim();
    const codeCell = cells[1] ?? "";
    const m2013 = codeCell.match(/ANZSCO 2013[^\]]*?(\d{6})\]/);
    const any = codeCell.match(/(\d{6})\]/);
    const code = (m2013 ?? any)?.[1];
    if (!title || !code) continue;
    const visas = (cells[2] ?? "").replace(/\\/g, "");
    const s190 = /190 - Skilled Nominated/.test(visas);
    const s491 = /491 - Skilled Work Regional \(provisional\) visa \(subclass 491\) State or Territory nominated/.test(visas);
    if (!index.has(norm(title))) index.set(norm(title), { code, s190, s491 });
  }
  return index;
}

function findQuote(pages: Array<{ num: number; text: string }>, re: RegExp, what: string) {
  for (const p of pages) {
    const t = p.text.replace(/\s+/g, " ");
    const m = t.match(re);
    if (m) return { page: p.num, quote: m[0].trim() };
  }
  throw new Error(`WA program document: ${what} not found (${re})`);
}

export async function buildWaOccupations() {
  const listPages = await pdfPages(WA_LIST_DOCUMENT);
  const programPages = await pdfPages(WA_PROGRAM_DOCUMENT);
  const entries = parseList(listPages);
  if (entries.length < 500) throw new Error(`WA list: only ${entries.length} entries parsed`);

  // Title -> code sources.
  const csv = csvRows(WA_SEARCH_CSV);
  const h = csv[0];
  const col = (n: string) => h.indexOf(n);
  const waByTitle = new Map<string, { code: string; v190: boolean; v491: boolean }>();
  for (const r of csv.slice(1)) {
    const key = norm(r[0]);
    const prev = waByTitle.get(key);
    waByTitle.set(key, { code: r[col("ANZSCO")], v190: (prev?.v190 ?? false) || r[col("v190")] === "Yes", v491: (prev?.v491 ?? false) || r[col("v491")] === "Yes" });
  }
  const ha = homeAffairsIndex();

  // Merge the list's lines by occupation title.
  const byTitle = new Map<string, { title: string; sector: string; streams: Set<Stream>; pages: Set<number> }>();
  for (const e of entries) {
    const key = norm(e.title);
    const cur = byTitle.get(key) ?? { title: e.title, sector: e.sector, streams: new Set<Stream>(), pages: new Set<number>() };
    cur.streams.add(e.stream);
    cur.pages.add(e.page);
    byTitle.set(key, cur);
  }

  let subclassDisagreements = 0;
  const occupations = [...byTitle.entries()]
    .map(([key, o]) => {
      const wa = waByTitle.get(key);
      const hai = ha.get(key);
      const anzscoCode = wa?.code ?? hai?.code ?? null;
      const codeSource = wa ? "wa-occupation-search.csv" : hai ? "home-affairs-skilled-occupation-list" : null;
      const haForCode = anzscoCode ? [...ha.values()].find((x) => x.code === anzscoCode) : undefined;
      const s190 = wa ? wa.v190 : (haForCode?.s190 ?? false);
      const s491 = wa ? wa.v491 : (haForCode?.s491 ?? false);
      if (wa && haForCode && (wa.v190 !== haForCode.s190 || wa.v491 !== haForCode.s491)) subclassDisagreements++;
      const streams = (["schedule1", "schedule2", "graduate"] as Stream[]).filter((s) => o.streams.has(s));
      return {
        anzscoCode,
        occupationTitle: o.title,
        subclass190: anzscoCode !== null && s190,
        subclass491: anzscoCode !== null && s491,
        streams,
        sector: o.sector,
        pages: [...o.pages].sort((a, b) => a - b),
        codeSource,
        notes: waNotes(streams, s190),
      };
    })
    .sort((a, b) => a.occupationTitle.localeCompare(b.occupationTitle));

  const rules = {
    program: findQuote(programPages, /Features of the 2025[—–-]26 program/, "program year"),
    eligibility: findQuote(programPages, /2025-26 Eligibility requirements/, "eligibility heading"),
    subclasses: findQuote(programPages, /Applicants who have a nominated occupation identified on the WASMOL or the GOL may be eligible for WA State nomination using one of the following visa subclasses:/, "subclasses"),
    occupationEligibleForSubclass: findQuote(programPages, /listed on the WASMOL Schedule 1 occupation list; and ● eligible for your intended visa subclass\./, "eligible for subclass"),
    schedule1WorkExperience: findQuote(programPages, /at least one year of Australian work experience in the nominated \(or closely related\) occupation over the last 10 years; or ● at least one year of overseas work experience in the nominated \(or closely related\) occupation over the last 10 years\./, "Schedule 1 work experience"),
    schedule1Contract: findQuote(programPages, /6\. Contract of employment The Contract of employment requirement is not applicable to visa 491 applicants\./, "Schedule 1 contract"),
    schedule2Contract: findQuote(programPages, /5\. Contract of employment The Contract of employment requirement is not applicable to visa 491 applicants, or applicants who were invited through a WA building and construction industry sector occupation/, "Schedule 2 contract"),
    contractTerms: findQuote(programPages, /You must have a contract of employment in your nominated \(or closely related\) occupation for full-time employment in Western Australia, for at least six months from the date of your application for State nomination\./, "contract terms"),
    graduateStudy: findQuote(programPages, /studied in WA: ○ at an accredited WA educational institution; and ○ full-time; and ○ in a face-to-face learning environment \(on campus study\); and ○ for a period of at least two academic years\./, "Graduate study"),
    invitedFor491First: findQuote(programPages, /If your EOI indicates you are seeking State nomination for both the subclass 190 and subclass 491 visa, you will generally be invited for the subclass 491 visa in the first/, "491 first"),
  };

  const count = (s: Stream) => occupations.filter((o) => o.streams.includes(s)).length;
  return {
    _provenance: {
      extractedOn: EXTRACTED_DATE,
      last_verified: EXTRACTED_DATE,
      generatedBy: "scripts/generate-wa-occupations.ts",
      sourceFile: WA_LIST_DOCUMENT,
      sourcePageCount: listPages.length,
      programDocument: WA_PROGRAM_DOCUMENT,
      programYear: "2025-26",
      programYearSource: "The list document prints no program year or date; '2025-26' is its filename and the program document's (p.1).",
      datePrintedInList: null,
      entryLines: entries.length,
      occupationCount: occupations.length,
      streamCounts: { schedule1: count("schedule1"), schedule2: count("schedule2"), graduate: count("graduate") },
      codeMatching: {
        fromWaOccupationSearchCsv: occupations.filter((o) => o.codeSource === "wa-occupation-search.csv").length,
        fromHomeAffairsList: occupations.filter((o) => o.codeSource === "home-affairs-skilled-occupation-list").length,
        unmatchedTitles: occupations.filter((o) => o.anzscoCode === null).map((o) => o.occupationTitle),
        subclassDisagreementsCsvVsHomeAffairs: subclassDisagreements,
      },
      method:
        "Every line of the WA list, merged by title (an occupation can appear under several streams). ANZSCO codes are not printed: matched by exact title to WA's occupation-search.csv, else to the Home Affairs skilled occupation list (ANZSCO 2013); unmatched titles keep anzscoCode null. Subclass eligibility per the program document's 'eligible for your intended visa subclass': WA's v190/v491 where the CSV has the occupation, else the Home Affairs 190 / 491 (State or Territory nominated) lists.",
      rules,
    },
    occupations,
  };
}

/** Customer-facing note for a WA row (plain language; the conditions come from the program document). */
function waNotes(streams: Stream[], s190: boolean): string {
  const parts: string[] = [];
  if (streams.includes("schedule1")) parts.push("General stream (WASMOL Schedule 1): at least one year of work experience in the occupation in the last 10 years; for subclass 190, a WA full-time employment contract of at least six months");
  if (streams.includes("schedule2")) parts.push(`General stream (WASMOL Schedule 2)${s190 ? ": for subclass 190, a WA full-time employment contract of at least six months" : ""}`);
  if (streams.includes("graduate")) parts.push("Graduate stream: at least two academic years of full-time, on-campus study in WA");
  return `WA 2025-26 occupation lists -- ${parts.join("; ")}.`;
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(WA_LIST_DOCUMENT) || !existsSync(WA_PROGRAM_DOCUMENT)) {
    console.log(`SKIPPED: ${WA_LIST_DOCUMENT} / the WA program document not present (data/knowledge is gitignored).`);
    return;
  }
  const out = serialize(await buildWaOccupations());
  if (check) {
    const committed = existsSync(WA_OUT_FILE) ? readFileSync(WA_OUT_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    if (committed !== out) {
      console.error(`❌ ${WA_OUT_FILE} drifted from a fresh parse -- run: npx tsx scripts/generate-wa-occupations.ts`);
      process.exitCode = 1;
    } else console.log(`✅ ${WA_OUT_FILE} matches a fresh parse of the source documents`);
    return;
  }
  writeFileSync(WA_OUT_FILE, out);
  console.log(`wrote ${WA_OUT_FILE}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
