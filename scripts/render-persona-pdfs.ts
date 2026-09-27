/**
 * Renders review personas through the REAL PDF route (app/api/reports/[reportId]/pdf -> generateReadinessPDF), with
 * only the request context and database stubbed, and writes each PDF's text to temp_tests/personas/<label>/ -- for
 * before/after comparisons of report changes. Nothing touches a network or database.
 *
 *   npx tsx scripts/render-persona-pdfs.ts <label> [personaId ...]      e.g. before / after
 */
import "./lib/stub-request-context";

import { mkdirSync, writeFileSync } from "node:fs";
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

/** Renders each persona in each locale through the real PDF route and returns the PDF text. */
export async function renderPersonaPdfTexts(
  personas: Record<string, ReadinessInput>,
  locales: readonly (typeof LOCALES)[number][] = LOCALES
): Promise<RenderedPersona[]> {
  const rows = new Map<string, Record<string, unknown>>();
  const empty = { findUnique: async () => null, findFirst: async () => null };
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
    stateAllocation: empty,
    occupation: empty,
    roundCutoff: empty,
  };
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const { reportAccessToken } = await import("../lib/reports/report-access");

  const out: RenderedPersona[] = [];
  for (const [id, base] of Object.entries(personas)) {
    for (const locale of locales) {
      const input: ReadinessInput = { ...base, locale };
      const report = runReadinessEngine(input);
      const reportId = `${id}-${locale}`;
      rows.set(reportId, { id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)), agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null });
      const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf?t=${reportAccessToken(reportId)}`), { params: Promise.resolve({ reportId }) });
      if (res.status !== 200) throw new Error(`${reportId}: HTTP ${res.status}`);
      const parser = new PDFParse({ data: new Uint8Array(await res.arrayBuffer()) });
      const text = (await parser.getText()).pages.map((p: { text: string }) => p.text).join("\n");
      await parser.destroy();
      out.push({ id, locale, text, report });
    }
  }
  return out;
}

async function main() {
  const [label, ...ids] = process.argv.slice(2);
  if (!label) throw new Error("usage: render-persona-pdfs.ts <label> [personaId ...]");
  const extra = process.env.RENDER_PERSONAS_JSON ? (JSON.parse(process.env.RENDER_PERSONAS_JSON) as Record<string, ReadinessInput>) : {};
  const all = { ...REVIEW_PERSONAS, ...extra };
  const selected = ids.length ? ids : Object.keys(all);
  const personas: Record<string, ReadinessInput> = {};
  for (const id of selected) {
    if (!all[id]) throw new Error(`unknown persona ${id}`);
    personas[id] = all[id];
  }
  const outDir = path.join(process.cwd(), "temp_tests", "personas", label);
  mkdirSync(outDir, { recursive: true });
  for (const r of await renderPersonaPdfTexts(personas)) {
    const reportId = `${r.id}-${r.locale}`;
    writeFileSync(path.join(outDir, `${reportId}.txt`), r.text);
    writeFileSync(path.join(outDir, `${reportId}.report.json`), JSON.stringify(r.report, null, 1));
    console.log(`wrote ${path.join("temp_tests", "personas", label, `${reportId}.txt`)} (${r.text.length} chars)`);
  }
}

if (/render-persona-pdfs\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
