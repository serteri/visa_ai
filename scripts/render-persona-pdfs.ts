/**
 * Renders reports through the REAL PDF route (app/api/reports/[reportId]/pdf -> report-service -> generateReadinessPDF)
 * with only the request context and the database client stubbed, and writes the PDF text to temp_tests/.
 *
 * Two modes:
 *
 *   npx tsx scripts/render-persona-pdfs.ts <label> [personaId ...] [--live-state]
 *     Synthetic review personas (REVIEW_PERSONAS). The engine runs on the persona's input, so this shows what a NEW
 *     report looks like with the current code. It is NOT a reproduction of any real report: a real report's inputs
 *     come from the intake form, and production also passes the live admin state config (StateNominationConfig /
 *     StateIntelligence) to the engine. --live-state reads those two tables from production (PROD_DATABASE_URL, read-only) so state statuses match
 *     production.
 *
 *   npx tsx scripts/render-persona-pdfs.ts --report <reportId> <label> [--at <commit>] [--row-file <path>]
 *     Reproduces a REAL report. Reads the user_reports row (report_json, input_json with the stored AI strategy)
 *     and the live state config from PRODUCTION via PROD_DATABASE_URL (docs/database-environments.md) in a READ ONLY transaction -- no writes -- and renders it exactly as production does:
 *     the route receives the stored row. Without --at, the current checkout's code renders it (which recomputes the
 *     deterministic sections, lib/reports/refresh-report.ts). With --at <commit>, the same stored row is rendered by
 *     that commit's code in a temporary git worktree (e.g. the commit that was deployed when the report was made).
 *     The row is cached in temp_tests/real/<id>.row.json (gitignored; it holds personal data -- the email and name
 *     are replaced before rendering and never printed).
 */
import "./lib/stub-request-context";

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import type { ReadinessInput } from "../lib/readiness/types";

export const REVIEW_PERSONAS: Record<string, ReadinessInput> = {
  // Reference persona from the report review: Software Engineer 261313, 28, in Australia, Superior English, PhD
  // (institution unknown), partner without Functional English, no skills assessment, no employment experience.
  "reference-se-au": {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
    currentCountry: "AU",
    passportCountry: "TR",
    age: "28",
    occupation: "Software Engineer 261313",
    occupationConfirmed: "no",
    englishLevel: "superior",
    qualificationLevel: "PhD/Doctorate",
    sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
    migrationGoals: ["direct_pr"],
  },
  "offshore-se-in": {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
    currentCountry: "IN",
    passportCountry: "IN",
    age: "28",
    occupation: "Software Engineer 261313",
    occupationConfirmed: "no",
    englishLevel: "superior",
    qualificationLevel: "PhD/Doctorate",
    sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
    migrationGoals: ["direct_pr"],
  },
  // The intake answers of real report b0d20f74 (non-personal fields only): the same Software Engineer profile as
  // reference-se-au but with the PhD recognized and earned outside Australia -> 70 points. At 70 the old simulator
  // summed the 491 nomination into the Subclass 189 benchmark scenario; at 50 (reference-se-au) it never could.
  "real-b0d20f74-inputs": {
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
  },
  // An occupation on WA's 2025-26 lists (Civil Engineer 233211: Schedule 2 + Graduate, p.10), in Australia, with a
  // skills assessment and experience -- exercises the ranking with a confirmed WA list match and a score above 65.
  "wa-civil-engineer-au": {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
    currentCountry: "AU",
    passportCountry: "IN",
    age: "30",
    occupation: "Civil Engineer 233211",
    occupationConfirmed: "yes",
    englishLevel: "proficient",
    qualificationLevel: "Bachelor's Degree",
    isQualificationRecognized: true,
    offshoreExperienceYears: 5,
    sponsorOrFamily: "Single / No Dependants",
    migrationGoals: ["direct_pr"],
  },
};

export const LOCALES = ["en", "tr", "zh-Hans"] as const;

export type RenderedPersona = { id: string; locale: (typeof LOCALES)[number]; text: string; report: unknown };

/** Live admin state config rows, served to the stubbed client exactly as production's findMany() returns them. */
export type LiveStateRows = { stateNominationConfig: unknown[]; stateIntelligence: unknown[] };

/** JSON caches turn Date columns into strings; findMany() returns Dates (e.g. updatedAt.toISOString()). */
function reviveDates<T>(rows: T[] | undefined): T[] {
  return (rows ?? []).map((r) =>
    Object.fromEntries(
      Object.entries(r as Record<string, unknown>).map(([k, v]) => [k, /At$/.test(k) && typeof v === "string" ? new Date(v) : v])
    ) as T
  );
}

function installStubPrisma(rows: Map<string, Record<string, unknown>>, live?: LiveStateRows) {
  const empty = { findUnique: async () => null, findFirst: async () => null, findMany: async () => [] };
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
    stateAllocation: empty,
    occupation: empty,
    roundCutoff: empty,
    stateNominationConfig: { ...empty, findMany: async () => reviveDates(live?.stateNominationConfig) },
    stateIntelligence: { ...empty, findMany: async () => reviveDates(live?.stateIntelligence) },
  };
}

async function renderRow(row: Record<string, unknown>): Promise<string> {
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const { reportAccessToken } = await import("../lib/reports/report-access");
  const reportId = String(row.id);
  const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf?t=${reportAccessToken(reportId)}`), { params: Promise.resolve({ reportId }) });
  if (res.status !== 200) throw new Error(`${reportId}: HTTP ${res.status}`);
  const parser = new PDFParse({ data: new Uint8Array(await res.arrayBuffer()) });
  const text = (await parser.getText()).pages.map((p: { text: string }) => p.text).join("\n");
  await parser.destroy();
  return text;
}

/** Renders each persona in each locale through the real PDF route and returns the PDF text. */
export async function renderPersonaPdfTexts(
  personas: Record<string, ReadinessInput>,
  locales: readonly (typeof LOCALES)[number][] = LOCALES,
  live?: LiveStateRows
): Promise<RenderedPersona[]> {
  const rows = new Map<string, Record<string, unknown>>();
  installStubPrisma(rows, live);
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { getStateIntelligenceMap, getStateNominationConfigMap } = await import("../lib/state-intelligence");
  // The same live state inputs the intake action passes to the engine.
  const [stateIntelligence, stateNominationConfig] = await Promise.all([getStateIntelligenceMap(), getStateNominationConfigMap()]);

  const out: RenderedPersona[] = [];
  for (const [id, base] of Object.entries(personas)) {
    for (const locale of locales) {
      const input: ReadinessInput = { ...base, locale };
      const report = runReadinessEngine({ ...input, stateIntelligence, stateNominationConfig });
      const reportId = `${id}-${locale}`;
      rows.set(reportId, { id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)), agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null });
      out.push({ id, locale, text: await renderRow(rows.get(reportId)!), report });
    }
  }
  return out;
}

/**
 * PRODUCTION, READ ONLY transaction via PROD_DATABASE_URL: the report row and the
 * live state config. Nothing is written.
 */
async function readLiveData(reportId?: string): Promise<{ row?: Record<string, unknown>; live: LiveStateRows }> {
  await import("dotenv/config");
  const { withProdReadOnly } = await import("./lib/prod-db");
  return withProdReadOnly(async (tx) => {
    const rows = reportId
      ? await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
          "SELECT id, email, locale, report_json, input_json, agent_id, is_unlocked, full_name, preview_data FROM user_reports WHERE id::text = $1::text LIMIT 1",
          reportId
        )
      : [];
    const live = {
      stateNominationConfig: await tx.stateNominationConfig.findMany(),
      stateIntelligence: await tx.stateIntelligence.findMany(),
    };
    return { row: rows[0], live };
  });
}

async function reproduceReport(reportId: string, label: string, at?: string, rowFile?: string) {
  const outDir = path.join(process.cwd(), "temp_tests", "real", label);
  mkdirSync(outDir, { recursive: true });
  const cache = rowFile ?? path.join(process.cwd(), "temp_tests", "real", `${reportId}.row.json`);
  let dump: { row: Record<string, unknown>; live: LiveStateRows };
  if (existsSync(cache) && rowFile) {
    dump = JSON.parse(readFileSync(cache, "utf8"));
  } else {
    const { row, live } = await readLiveData(reportId);
    if (!row) throw new Error(`report ${reportId} not found`);
    dump = { row, live };
    writeFileSync(cache, JSON.stringify(dump, null, 1));
  }
  // Personal data never reaches the output: the PDF shows the stored name only on the cover, replaced here.
  const row: Record<string, unknown> = { ...dump.row, email: "qa@example.com", full_name: dump.row.full_name ? "Report Holder" : null, agent_id: null };

  if (at) {
    // Render with another commit's code: a temporary worktree sharing this checkout's node_modules.
    const wt = path.join(tmpdir(), `render-at-${at}-${Date.now()}`);
    execFileSync("git", ["worktree", "add", "--detach", wt, at], { stdio: "inherit" });
    try {
      symlinkSync(path.join(process.cwd(), "node_modules"), path.join(wt, "node_modules"), "junction");
      const tmpRow = path.join(outDir, `${reportId}.at-${at}.row.json`);
      writeFileSync(tmpRow, JSON.stringify({ row, live: dump.live }));
      const runner = path.join(wt, "scripts", "_render-stored-row.ts");
      writeFileSync(runner, STORED_ROW_RUNNER);
      const outFile = path.join(outDir, `${reportId}-${at}.txt`);
      execFileSync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), runner, tmpRow, outFile], { cwd: wt, stdio: "inherit", env: { ...process.env } });
      unlinkSync(tmpRow);
    } finally {
      // Remove the node_modules junction first so removing the worktree can never reach this checkout's modules.
      try {
        unlinkSync(path.join(wt, "node_modules"));
      } catch {
        /* not created */
      }
      execFileSync("git", ["worktree", "remove", "--force", wt], { stdio: "inherit" });
    }
    return;
  }

  const rows = new Map<string, Record<string, unknown>>([[String(row.id), row]]);
  installStubPrisma(rows, dump.live);
  const text = await renderRow(row);
  const outFile = path.join(outDir, `${reportId}-HEAD.txt`);
  writeFileSync(outFile, text);
  console.log(`wrote ${path.relative(process.cwd(), outFile)} (${text.length} chars)`);
}

/**
 * Minimal renderer written into an older commit's worktree (that commit may predate this script). Uses only what
 * the report-access commit (65c4105) and later have: scripts/lib/stub-request-context and the token-gated route.
 */
const STORED_ROW_RUNNER = `import "./lib/stub-request-context";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";
(async () => {
  const [rowFile, outFile] = process.argv.slice(2);
  const { row, live } = JSON.parse(readFileSync(rowFile, "utf8"));
  const revive = (rows: any[]) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, /At$/.test(k) && typeof v === "string" ? new Date(v) : v])));
  const empty = { findUnique: async () => null, findFirst: async () => null, findMany: async () => [] };
  (globalThis as any).prisma = {
    $queryRawUnsafe: async () => [row], $executeRawUnsafe: async () => 0, $disconnect: async () => undefined,
    stateAllocation: empty, occupation: empty, roundCutoff: empty,
    stateNominationConfig: { ...empty, findMany: async () => revive(live.stateNominationConfig) },
    stateIntelligence: { ...empty, findMany: async () => revive(live.stateIntelligence) },
  };
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const { reportAccessToken } = await import("../lib/reports/report-access");
  const res = await GET(new Request("http://localhost/api/reports/" + row.id + "/pdf?t=" + reportAccessToken(row.id)), { params: Promise.resolve({ reportId: row.id }) });
  if (res.status !== 200) throw new Error("HTTP " + res.status);
  const parser = new PDFParse({ data: new Uint8Array(await res.arrayBuffer()) });
  const text = (await parser.getText()).pages.map((p: { text: string }) => p.text).join("\\n");
  writeFileSync(outFile, text);
  console.log("wrote " + outFile + " (" + text.length + " chars)");
})().catch((e) => { console.error(e); process.exit(1); });
`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const reportId = flag(args, "--report");
  const at = flag(args, "--at");
  const rowFile = flag(args, "--row-file");
  const liveState = args.includes("--live-state");
  const rest = args.filter((a) => a !== "--live-state");

  if (reportId) {
    const label = rest[0] ?? "repro";
    await reproduceReport(reportId, label, at, rowFile);
    return;
  }

  const [label, ...ids] = rest;
  if (!label) throw new Error("usage: render-persona-pdfs.ts <label> [personaId ...] [--live-state] | --report <id> <label> [--at <commit>]");
  const extra = process.env.RENDER_PERSONAS_JSON ? (JSON.parse(process.env.RENDER_PERSONAS_JSON) as Record<string, ReadinessInput>) : {};
  const all = { ...REVIEW_PERSONAS, ...extra };
  const selected = ids.length ? ids : Object.keys(all);
  const personas: Record<string, ReadinessInput> = {};
  for (const id of selected) {
    if (!all[id]) throw new Error(`unknown persona ${id}`);
    personas[id] = all[id];
  }
  const live = liveState ? (await readLiveData()).live : undefined;
  const outDir = path.join(process.cwd(), "temp_tests", "personas", label);
  mkdirSync(outDir, { recursive: true });
  for (const r of await renderPersonaPdfTexts(personas, LOCALES, live)) {
    const id = `${r.id}-${r.locale}`;
    writeFileSync(path.join(outDir, `${id}.txt`), r.text);
    writeFileSync(path.join(outDir, `${id}.report.json`), JSON.stringify(r.report, null, 1));
    console.log(`wrote ${path.join("temp_tests", "personas", label, `${id}.txt`)} (${r.text.length} chars)`);
  }
}

if (/render-persona-pdfs\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
