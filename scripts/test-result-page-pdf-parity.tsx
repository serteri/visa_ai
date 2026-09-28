/**
 * The on-screen result page (app/[locale]/(main)/full-check/result) and the PDF (app/api/reports/[reportId]/pdf) run
 * the same refresh (lib/reports/refresh-report.ts) and must show identical state statuses, match figures, Points
 * Booster rows and date stamp.
 *
 *   1. Always (CI too): a stored report built from report b0d20f74's non-personal answers, made stale (an old
 *      491-in-189 booster row), rendered by the page and the PDF route in en / tr / zh-Hans.
 *   2. With database access: the stored report b0d20f74 itself, read in a READ ONLY transaction and kept in memory
 *      only (nothing written to disk, no personal data printed). SKIPPED without a database (CI).
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

function attrs(html: string, tag: string, names: string[]): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  for (const m of html.matchAll(new RegExp(`<tr[^>]*${tag}[^>]*>`, "g"))) {
    const rec: Record<string, string> = {};
    for (const n of names) rec[n] = decode(m[0].match(new RegExp(`${n}="([^"]*)"`))?.[1] ?? "");
    out.push(rec);
  }
  return out;
}

/** The PDF's booster table, rows concatenated, without the per-page header/footer lines. */
function pdfBoosterTable(text: string, locale: string): string {
  const header = locale === "tr" ? /Senaryo.*Puan.*Yeni/ : locale === "zh-Hans" ? /情景.*分数.*新/ : /^Scenario Points Change New Total$/;
  const lines = text.split("\n");
  const start = lines.findIndex((l) => header.test(l.trim()));
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^(Financial Roadmap|Tahmini Maliyet Yol Haritası|费用路线图)/.test(l)) break;
    if (header.test(l) || /^L o g i V i s a$/.test(l) || /Generated by LogiVisa AI/.test(l) || /^-- \d+ of \d+ --$/.test(l) || l === "") continue;
    out.push(l);
  }
  return squash(out.join(""));
}

async function compare(label: string, reportId: string, locale: string) {
  const html = await pageHtml(reportId, locale);
  const pdf = await pdfText(reportId);
  const flatPdf = squash(pdf);

  const states = attrs(html, "data-state-code", ["data-state-code", "data-state-status", "data-state-score"]);
  const booster = attrs(html, "data-booster-label", ["data-booster-label", "data-booster-change", "data-booster-total"]);
  const stamp = decode(html.match(/data-report-date-stamp[^>]*>([^<]*)</)?.[1] ?? "");

  // States: each page row (code, status, match %) is the PDF tracker row; same count and order as the radar.
  const missingStates = states.filter((s) => !flatPdf.includes(squash(`${s["data-state-status"]} ${s["data-state-score"]}%`)));
  const radar = states.map((s) => `${s["data-state-code"]}${s["data-state-score"]}%`).join("");
  const radarLine = squash(pdf.split("\n").filter((l) => /^([A-Z]{2,3} \d+%\s*)+$/.test(l.trim())).join(""));
  if (states.length === 8 && missingStates.length === 0 && radarLine === radar) {
    ok(`${label} [${locale}]: 8 states identical (${states.map((s) => `${s["data-state-code"]} ${s["data-state-status"]} ${s["data-state-score"]}%`).join("; ")})`);
  } else fail(`${label} [${locale}]: states differ -- page ${JSON.stringify(states)}; not in PDF: ${JSON.stringify(missingStates)}; radar page ${radar} vs PDF ${radarLine}`);

  // Booster: the PDF table equals the page rows, in order, nothing more or less.
  const table = pdfBoosterTable(pdf, locale).replace(/★/g, "");
  const rowsOk = booster.every((b) => {
    const change = b["data-booster-change"] === "" ? "—" : Number(b["data-booster-change"]) >= 0 ? `+${b["data-booster-change"]}` : b["data-booster-change"];
    return table.includes(squash(`${cleanNum(b["data-booster-label"])}`)) && table.includes(squash(`${change}${b["data-booster-total"]}`));
  });
  const concatenated = squash(
    booster
      .map((b) => {
        const change = b["data-booster-change"] === "" ? "—" : Number(b["data-booster-change"]) >= 0 ? `+${b["data-booster-change"]}` : b["data-booster-change"];
        return `${cleanNum(b["data-booster-label"])}${change}${b["data-booster-total"] === "" ? "—" : b["data-booster-total"]}`;
      })
      .join("")
  );
  if (booster.length > 0 && rowsOk && table === concatenated) ok(`${label} [${locale}]: ${booster.length} booster rows identical, same order`);
  else fail(`${label} [${locale}]: booster rows differ\n      page: ${concatenated.slice(0, 400)}\n      pdf:  ${table.slice(0, 400)}`);

  // Stamp: the page's stamp is on the PDF cover.
  if (stamp && flatPdf.includes(squash(stamp.replace(/^[^ ：]+(?: [a-z]+)?[ ：]/, "")))) ok(`${label} [${locale}]: stamp "${stamp}" on the page and the PDF`);
  else fail(`${label} [${locale}]: stamp "${stamp}" not found on the PDF`);
  return stamp;
}

async function main() {
  await import("dotenv/config");
  process.env.DATABASE_URL ||= "postgres://stub:stub@127.0.0.1:1/stub"; // import-time check only; nothing connects
  const hadRealDb = !process.env.DATABASE_URL.includes("127.0.0.1:1");

  // Real report b0d20f74: read once, before the stub replaces the client. In memory only.
  let real: { row: Row; live: Live } | undefined;
  if (hadRealDb && process.env.CI !== "true") {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const db = new PrismaClient();
      try {
        real = await db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
          const r = await tx.$queryRawUnsafe<Row[]>(
            "SELECT id, email, locale, report_json, input_json, agent_id, is_unlocked, full_name, preview_data, created_at FROM user_reports WHERE id::text = $1::text LIMIT 1",
            REAL_REPORT_ID
          );
          return { row: r[0], live: { stateNominationConfig: await tx.stateNominationConfig.findMany(), stateIntelligence: await tx.stateIntelligence.findMany() } };
        });
      } finally {
        await db.$disconnect();
      }
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
    const html = await pageHtml(id, locale);
    if (!html.includes("recent Subclass 189 invitation benchmark: 95 pts") && /^(Last updated|Son güncelleme|最后更新)/.test(stamp)) ok(`stale stored report [${locale}]: recomputed (old row gone), stamped "${stamp}"`);
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
    console.log("  SKIPPED: no database access (CI) -- run locally with DATABASE_URL to compare the real stored report");
  } else {
    live = {
      stateNominationConfig: real.live.stateNominationConfig,
      stateIntelligence: real.live.stateIntelligence,
    };
    rows.set(REAL_REPORT_ID, { ...real.row, email: "qa@example.com", full_name: real.row.full_name ? "Report Holder" : null });
    await compare("report b0d20f74", REAL_REPORT_ID, String(real.row.locale ?? "en"));
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
