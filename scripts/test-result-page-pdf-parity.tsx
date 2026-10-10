/**
 * The PDF (app/api/reports/[reportId]/pdf) is the source of truth; the result page (app/[locale]/(main)/full-check/result) shows only its header.
 * They run the same refresh (lib/reports/refresh-report.ts), so what the page does say matches the PDF cover: the applicant's name, the target
 * visa line and the date stamp (stable across viewing days). The page has no sections, tables or visa/state/fee rows.
 *
 *   1. Always (CI too): a stored report built from report b0d20f74's non-personal answers, made stale (an old
 *      491-in-189 booster row), rendered by the page and the PDF route in en / tr / zh-Hans.
 *   2. With PROD_DATABASE_URL set: the stored production report b0d20f74 itself, read in a READ ONLY transaction and
 *      kept in memory only (nothing written to disk, no personal data printed). SKIPPED without it (CI).
 *
 *   npx tsx scripts/test-result-page-pdf-parity.tsx
 */
import "./lib/stub-request-context";

import { renderToStaticMarkup } from "react-dom/server";
import { PDFParse } from "pdf-parse";

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

const REAL_REPORT_ID = "b0d20f74-7f71-4286-b27e-c3d1788b3257";
const REAL_INPUTS: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "",
  currentCountry: "AU",
  passportCountry: "TR",
  age: "28",
  occupation: "Software Engineer (261313)",
  occupationConfirmed: "no",
  englishLevel: "superior",
  qualificationLevel: "PhD",
  isQualificationRecognized: true,
  qualificationAwardedInAustralia: false,
  annualSalaryAud: 45000,
  sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
};

type Row = Record<string, unknown>;
type Live = { stateNominationConfig: unknown[]; stateIntelligence: unknown[] };

const rows = new Map<string, Row>();
let live: Live = { stateNominationConfig: [], stateIntelligence: [] };
function installStub() {
  const empty = { findUnique: async () => null, findFirst: async () => null, findMany: async () => [] };
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
    stateAllocation: empty,
    occupation: empty,
    roundCutoff: empty,
    stateNominationConfig: { ...empty, findMany: async () => live.stateNominationConfig },
    stateIntelligence: { ...empty, findMany: async () => live.stateIntelligence },
  };
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const squash = (s: string) => s.replace(/\s+/g, "");
/** generate-pdf.ts cleanNum, applied to booster labels in the PDF table. */
const cleanNum = (v: string) =>
  v.replace(/\+(\d)/g, "$1").replace(/\$(\d)/g, "$1").replace(/~\$(\d)/g, "~$1").replace(/CAD \$/g, "CAD ").replace(/AUD \$/g, "AUD ");

async function pdfText(reportId: string): Promise<string> {
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const { reportAccessToken } = await import("../lib/reports/report-access");
  const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf?t=${reportAccessToken(reportId)}`), { params: Promise.resolve({ reportId }) });
  if (res.status !== 200) throw new Error(`PDF HTTP ${res.status}`);
  const parser = new PDFParse({ data: new Uint8Array(await res.arrayBuffer()) });
  const text = (await parser.getText()).pages.map((p: { text: string }) => p.text).join("\n");
  await parser.destroy();
  return text;
}

async function pageHtml(reportId: string, locale: string): Promise<string> {
  const { default: Page } = await import("../app/[locale]/(main)/full-check/result/page");
  const { reportAccessToken } = await import("../lib/reports/report-access");
  const element = await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId, t: reportAccessToken(reportId) ?? undefined }) });
  return renderToStaticMarkup(element);
}

/** The text of every cell of each <tr ...attr...> row (tags removed, entities decoded). */
function rowCells(html: string, attr: string): string[][] {
  const out: string[][] = [];
  for (const m of html.matchAll(new RegExp(`<tr[^>]*${attr}[^>]*>(.*?)</tr>`, "g"))) {
    out.push([...m[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((c) => decode(c[1].replace(/<[^>]*>/g, ""))));
  }
  return out;
}

/** The text of every element carrying the data attribute (tags removed, entities decoded). */
function blocks(html: string, attr: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(new RegExp(`<div[^>]*${attr}[^>]*>(.*?)</div>`, "g"))) out.push(decode(m[1].replace(/<[^>]*>/g, " ")));
  return out;
}

/** Runs fn with Date.now() / new Date() pinned to `iso` -- a simulated viewing day. */
async function onDay<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const RealDate = Date;
  const fixed = new RealDate(iso).getTime();
  class FakeDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixed);
      else super(...(args as [string]));
    }
    static now() {
      return fixed;
    }
  }
  (globalThis as { Date: DateConstructor }).Date = FakeDate as unknown as DateConstructor;
  try {
    return await fn();
  } finally {
    (globalThis as { Date: DateConstructor }).Date = RealDate;
  }
}

async function stampOn(reportId: string, locale: string, iso: string): Promise<string> {
  const html = await onDay(iso, () => pageHtml(reportId, locale));
  const pdf = await onDay(iso, () => pdfText(reportId));
  const stamp = decode(html.match(/data-report-date-stamp[^>]*>([^<]*)</)?.[1] ?? "");
  return squash(pdf).includes(squash(stamp)) ? stamp : `${stamp} (NOT ON THE PDF)`;
}

/** Every cell of a page table row is on the PDF (the PDF wraps cells, so compared without whitespace). */
const onPdf = (flatPdf: string, cells: string[]) => cells.every((c) => !c || flatPdf.includes(squash(c)));

async function compare(label: string, reportId: string, locale: string) {
  const html = await pageHtml(reportId, locale);
  const pdf = await pdfText(reportId);
  const flatPdf = squash(pdf);
  const stamp = decode(html.match(/data-report-date-stamp[^>]*>([^<]*)</)?.[1] ?? "");

  // The page has no report parts: no sections, tables or rows (the PDF has them).
  const sections = [...html.matchAll(/data-section="([a-z]+)"/g)].map((m) => m[1]);
  const pdfTables = pdf.split("\n").length;
  if (sections.length === 1 && sections[0] === "cover" && !/<table|<tbody|data-visa-heading|data-state-code/.test(html) && pdfTables > 200) ok(`${label} [${locale}]: the page is the header only (${html.length} bytes); the PDF carries the content (${pdfTables} lines)`);
  else fail(`${label} [${locale}]: page parts ${JSON.stringify(sections)}`);

  // Cover: the target line, the applicant's name and the date stamp on the page are on the PDF cover.
  const targetLine = decode(html.match(/data-target-line[^>]*>([^<]*)</)?.[1] ?? "");
  if (targetLine && flatPdf.includes(squash(targetLine))) ok(`${label} [${locale}]: target line identical`);
  else fail(`${label} [${locale}]: target line "${targetLine}" is not on the PDF`);
  if (stamp && flatPdf.includes(squash(stamp))) ok(`${label} [${locale}]: stamp "${stamp}" on the page and the PDF`);
  else fail(`${label} [${locale}]: stamp "${stamp}" not found on the PDF`);
  const name = decode(html.match(/<p class="text-base font-medium">([^<]*)</)?.[1] ?? "");
  if (name && flatPdf.includes(squash(name))) ok(`${label} [${locale}]: the applicant's name is on both`);
  else fail(`${label} [${locale}]: name "${name}" is not on the PDF`);
  return stamp;
}

async function main() {
  await import("dotenv/config");
  process.env.DATABASE_URL ||= "postgres://stub:stub@127.0.0.1:1/stub"; // import-time check only; nothing connects
  // b0d20f74 is a PRODUCTION report: read through PROD_DATABASE_URL only, read-only (scripts/lib/prod-db.ts).
  const { prodDatabaseUrl, withProdReadOnly } = await import("./lib/prod-db");
  const hadProdDb = Boolean(prodDatabaseUrl());

  // Real report b0d20f74: read once, before the stub replaces the client. In memory only.
  let real: { row: Row; live: Live } | undefined;
  if (hadProdDb && process.env.CI !== "true") {
    try {
      real = await withProdReadOnly(async (tx) => {
        const r = await tx.$queryRawUnsafe<Row[]>(
          "SELECT id, email, locale, report_json, input_json, agent_id, is_unlocked, full_name, preview_data, created_at FROM user_reports WHERE id::text = $1::text LIMIT 1",
          REAL_REPORT_ID
        );
        return { row: r[0], live: { stateNominationConfig: await tx.stateNominationConfig.findMany(), stateIntelligence: await tx.stateIntelligence.findMany() } };
      });
    } catch (error) {
      console.log(`  (database not reachable: ${(error as Error).message.split("\n")[0]})`);
    }
  }

  installStub();
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");

  console.log("==================== (1) a stale stored report: page vs PDF (en / tr / zh-Hans) ====================");
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const input = { ...REAL_INPUTS, locale };
    const stored: ReadinessReport = JSON.parse(JSON.stringify(runReadinessEngine(input)));
    stored.pointsBoosterSimulator!.scenarios.push({
      label: "Obtain regional nomination or eligible relative sponsorship (subclass 491) + Obtain a NAATI credentialled community language (CCL) certification (recent Subclass 189 invitation benchmark: 95 pts)",
      estimatedChange: 20,
      resultingEstimate: 90,
      explanation: "",
      isCombined: true,
    });
    const id = `parity-${locale}`;
    rows.set(id, { id, email: "qa@example.com", locale, report_json: stored, input_json: input, agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null, created_at: "2026-09-27T21:30:42.102Z" });
    const stamp = await compare("stale stored report", id, locale);
    const [day1, day2] = [await stampOn(id, locale, "2026-10-02T03:00:00Z"), await stampOn(id, locale, "2027-01-15T22:00:00Z")];
    if (day1 === day2 && day1 === stamp) ok(`stale stored report [${locale}]: same stamp on 2 October 2026 and 15 January 2027 ("${day1}")`);
    else fail(`stale stored report [${locale}]: stamp changes with the viewing day: "${day1}" vs "${day2}" (today "${stamp}")`);
    const html = await pageHtml(id, locale);
    if (!html.includes("recent Subclass 189 invitation benchmark: 95 pts") && /^Updated to reflect data as of|itibarıyla verilere göre güncellendi$|^已根据截至/.test(stamp)) ok(`stale stored report [${locale}]: recomputed (old row gone), stamped "${stamp}"`);
    else fail(`stale stored report [${locale}]: not recomputed or wrong stamp "${stamp}"`);
  }
  {
    // Unchanged content keeps its generation date.
    const input = { ...REAL_INPUTS, locale: "en" as const };
    const current: ReadinessReport = JSON.parse(JSON.stringify(runReadinessEngine(input)));
    rows.set("parity-current", { id: "parity-current", email: "qa@example.com", locale: "en", report_json: current, input_json: input, agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null, created_at: "2026-09-27T21:30:42.102Z" });
    const stamp = await compare("up-to-date stored report", "parity-current", "en");
    if (/^Generated 28 September 2026$/.test(stamp)) ok(`up-to-date stored report: keeps its generation date ("${stamp}")`);
    else fail(`up-to-date stored report: stamp "${stamp}"`);
  }

  console.log("\n==================== (2) stored report b0d20f74 (read-only, in memory) ====================");
  if (!real?.row) {
    console.log("  SKIPPED: no production database access (CI, or PROD_DATABASE_URL not set) -- set PROD_DATABASE_URL locally to compare the real stored report");
  } else {
    live = {
      stateNominationConfig: real.live.stateNominationConfig,
      stateIntelligence: real.live.stateIntelligence,
    };
    rows.set(REAL_REPORT_ID, { ...real.row, email: "qa@example.com", full_name: real.row.full_name ? "Report Holder" : null });
    const realLocale = String(real.row.locale ?? "en");
    const stamp = await compare("report b0d20f74", REAL_REPORT_ID, realLocale);
    const [day1, day2] = [await stampOn(REAL_REPORT_ID, realLocale, "2026-10-02T03:00:00Z"), await stampOn(REAL_REPORT_ID, realLocale, "2027-01-15T22:00:00Z")];
    if (day1 === day2 && day1 === stamp) ok(`report b0d20f74: same stamp on two simulated days ("${day1}")`);
    else fail(`report b0d20f74: stamp changes with the viewing day: "${day1}" vs "${day2}"`);
    rows.delete(REAL_REPORT_ID);
    real = undefined;
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
