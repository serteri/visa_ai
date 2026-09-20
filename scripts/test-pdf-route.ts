/**
 * Production-entry-point PDF regression test.
 *
 * Calls the REAL route handler production serves for the downloadable PDF --
 * GET app/api/reports/[reportId]/pdf/route.ts -- which goes
 * route -> getReportPdfForDownload -> buildReportPdf -> generateReadinessPDF.
 * Only the database layer is stubbed (globalThis.prisma is replaced before
 * lib/prisma.ts is first imported): user_reports returns a row whose
 * report_json is exactly what the submitFullCheckWaitlist server action
 * stores (runReadinessEngine output, JSON round-tripped like a jsonb column),
 * and the occupation/round-cutoff/state-allocation lookups return "no rows".
 *
 * Text is extracted from the PDF bytes in the HTTP response body (not from
 * the report object). Per persona x locale the test fails if:
 *   - any known-bad string appears ("legally required", "Less than 2 years",
 *     "recent rounds", "partner/child columns", ...);
 *   - the cover EOI banner is truncated -- checked both as text (its final
 *     words are present) AND geometrically (no text item extends past the
 *     page's right edge; text extraction alone cannot see clipping, because
 *     pdf.js returns off-page text too);
 *   - the Financial Roadmap has no total row, or its total differs from the
 *     FAQ/guide figure (same computeEstimatedTotalAud() result);
 *   - the guide's cost list omits the police-certificate line, or (for a
 *     partnered profile) the partner/child VAC line from visa-fees.json.
 *
 * The browser download in full-check-waitlist-form.tsx calls the same
 * generateReadinessPDF with a thinner userInputSummary (no age, no
 * sponsorOrFamily); that shape is exercised too, and must satisfy the same
 * text checks.
 *
 * Usage: npx tsx scripts/test-pdf-route.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import { computeEstimatedTotalAud, formatEstimatedTotalLine } from "../lib/readiness/financial-roadmap-totals";
import { ENGLISH_TEST_VALIDITY_YEARS } from "../lib/readiness/constants";

const LOCALES = ["en", "tr", "zh-Hans"] as const;
type Locale = (typeof LOCALES)[number];

// The profile from the live-PDF bug report: partnered, no functional English
// for the partner, AU, no skills assessment, no preferred pathway chosen.
const base: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
  currentCountry: "Australia",
  passportCountry: "Turkey",
  age: "32",
  occupation: "Software Engineer 261313",
  occupationConfirmed: "no",
  englishLevel: "superior",
  qualificationLevel: "PhD/Doctorate",
  migrationGoals: ["direct_pr"],
  sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
};

const PERSONAS: Array<{ name: string; input: ReadinessInput; partnered: boolean; blocked: boolean }> = [
  { name: "se-partnered", input: base, partnered: true, blocked: true },
  { name: "se-single", input: { ...base, sponsorOrFamily: undefined }, partnered: false, blocked: true },
  {
    name: "civil-233211-positive-assessment",
    input: {
      ...base,
      currentCountry: "Turkey",
      age: "35",
      occupation: "Civil Engineer 233211",
      occupationConfirmed: "yes",
      englishLevel: "competent",
      qualificationLevel: "Bachelor's Degree",
      sponsorOrFamily: undefined,
      offshoreExperienceYears: 5,
    },
    partnered: false,
    blocked: false,
  },
];

// Final words of the cover EOI banner's detail sentence (banner is only drawn
// for blocked profiles). A clipped banner loses these.
const BANNER_TAIL: Record<Locale, RegExp> = {
  en: /positive Skills Assessment is required before a visa application can be lodged\./,
  tr: /bir vize başvurusu sunulmadan önce gereklidir\./,
  "zh-Hans": /递交签证申请前需要获得正面的技能评估结果。/,
};

const BANNED: Array<[string, RegExp]> = [
  ["legally required", /legally required/i],
  ["Less than 2 years", /Less than 2 years|2 yıldan az|2 年内/i],
  ["recent rounds", /recent rounds|son turlarda|近期轮次/i],
  ["'columns' pointer to a table that does not exist", /partner\/child columns|partner\/çocuk sütun|VAC 表格/i],
];

const SCOPE_INCLUDED: Record<Locale, string> = {
  en: "Included in this total:",
  tr: "Bu toplama dahil:",
  "zh-Hans": "此总计包含：",
};
const POLICE_LINE: Record<Locale, string> = {
  en: "Police certificates:",
  tr: "Polis belgeleri:",
  "zh-Hans": "无犯罪证明：",
};
const ADDITIONAL_VAC_LINE: Record<Locale, string> = {
  en: "Additional applicants (VAC):",
  tr: "Ek başvurucular (VAC):",
  "zh-Hans": "随行人员申请费（VAC）：",
};

const flatten = (t: string) => t.replace(/\s+/g, " ");
// pdf.js inserts spaces next to CJK runs and wraps mid-sentence, so CJK comparisons ignore whitespace.
const squashAll = (t: string) => t.replace(/\s+/g, "");

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes.slice() });
  const result = await parser.getText();
  return typeof result === "string" ? result : result.text || "";
}

/** Text items whose box extends past the page's right edge (or starts left of it). */
async function findOffPageText(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdf-parse registers its own (older) pdf.js worker on globalThis; drop it so
  // this pdf.js instance loads its matching worker instead of failing the version check.
  delete (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true, disableFontFace: true }).promise;
  const offenders: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { width } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const right = x + item.width;
      if (right > width - 10 || x < 0) {
        offenders.push(`p${n}: "${item.str.slice(0, 60)}" (x=${x.toFixed(0)}, right=${right.toFixed(0)}, page=${width.toFixed(0)})`);
      }
    }
  }
  return offenders;
}

type CaseCtx = { label: string; fail: (msg: string) => void };

async function checkPdf(
  ctx: CaseCtx,
  pdfBytes: Uint8Array,
  locale: Locale,
  persona: (typeof PERSONAS)[number],
  report: ReadinessReport,
  outStem: string
) {
  await writeFile(`${outStem}.pdf`, pdfBytes);
  const text = await extractPdfText(pdfBytes);
  await writeFile(`${outStem}.txt`, text);
  const flat = flatten(text);

  for (const [name, re] of BANNED) {
    if (re.test(flat) || re.test(squashAll(flat))) ctx.fail(`banned text present: ${name}`);
  }

  // English-test validity: never the stale hardcoded "2 years" (already banned
  // above); the checklist must state the constant's figure.
  if (locale === "en" && !new RegExp(`Less than ${ENGLISH_TEST_VALIDITY_YEARS.AU} years old`).test(flat)) {
    ctx.fail(`English checklist item does not state ${ENGLISH_TEST_VALIDITY_YEARS.AU} years (ENGLISH_TEST_VALIDITY_YEARS.AU)`);
  }

  if (persona.blocked) {
    if (!BANNER_TAIL[locale].test(flat) && !BANNER_TAIL[locale].test(squashAll(flat))) ctx.fail("cover EOI banner sentence missing its final words");
    const offenders = await findOffPageText(pdfBytes);
    if (offenders.length > 0) ctx.fail(`text runs past the page edge (clipped): ${offenders.slice(0, 3).join(" | ")}`);
  }

  const total = computeEstimatedTotalAud(report.financialRoadmap);
  if (!total) {
    ctx.fail("computeEstimatedTotalAud returned null");
    return;
  }
  // Same helper the three sections use -> the exact line must appear in
  // Roadmap + FAQ + guide (>= 3 times), and the Roadmap-only scope lines must exist.
  const totalLine = formatEstimatedTotalLine(total, locale);
  // The FAQ puts a full stop between the range and any "leaves out" note, so
  // compare label + figure only (the part every section must share).
  const maxStr = total.max.toLocaleString(locale === "tr" ? "tr-TR" : "en-AU");
  const needle = totalLine.slice(0, totalLine.indexOf(maxStr) + maxStr.length);
  const squash = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);
  const occurrences = squash(flat).split(squash(needle)).length - 1;
  if (occurrences < 3) ctx.fail(`total "${needle}" appears ${occurrences}x (need Roadmap + FAQ + guide)`);
  if (!squash(flat).includes(squash(SCOPE_INCLUDED[locale]))) ctx.fail("Financial Roadmap total row has no included/not-included lines");

  if (!squash(flat).includes(squash(POLICE_LINE[locale]))) ctx.fail("guide cost list has no police-certificate line");

  const additional = report.financialRoadmap.find((i) => i.kind === "vac_additional");
  if (persona.partnered) {
    if (!additional) ctx.fail("partnered profile has no vac_additional roadmap row");
    else if (!squash(flat).includes(squash(ADDITIONAL_VAC_LINE[locale]))) ctx.fail("guide cost list has no partner/child VAC line");
  } else if (additional) {
    ctx.fail("single applicant unexpectedly has a partner/child VAC row");
  }
  console.log(`  ${needle} | occurrences=${occurrences}`);
}

async function main() {
  let failed = false;
  const outDir = path.join(process.cwd(), "temp_tests");
  await mkdir(outDir, { recursive: true });

  // ── DB stub, installed BEFORE lib/prisma.ts is first imported ────────
  const rows = new Map<string, Record<string, unknown>>();
  const emptyModel = { findUnique: async () => null, findFirst: async () => null };
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
    stateAllocation: emptyModel,
    occupation: emptyModel,
    roundCutoff: emptyModel,
  };

  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");

  for (const persona of PERSONAS) {
    for (const locale of LOCALES) {
      const input: ReadinessInput = { ...persona.input, locale };
      const report = runReadinessEngine(input);
      const reportId = `test-${persona.name}-${locale}`;
      rows.set(reportId, {
        id: reportId,
        email: "qa@example.com",
        locale,
        // JSON round-trip: what a jsonb column hands back.
        report_json: JSON.parse(JSON.stringify(report)) as ReadinessReport,
        input_json: JSON.parse(JSON.stringify(input)) as ReadinessInput,
        agent_id: null,
        is_unlocked: true,
        full_name: "Test Persona",
        preview_data: null,
      });

      // ── 1. The route handler production serves ────────────────────
      {
        const label = `route ${persona.name}/${locale}`;
        console.log(`\n=== ${label} ===`);
        let caseFailed = false;
        const ctx: CaseCtx = { label, fail: (m) => { caseFailed = failed = true; console.error(`  ❌ ${m}`); } };
        const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), {
          params: Promise.resolve({ reportId }),
        });
        if (res.status !== 200 || res.headers.get("content-type") !== "application/pdf") {
          ctx.fail(`route returned HTTP ${res.status} / ${res.headers.get("content-type")}`);
        } else {
          const bytes = new Uint8Array(await res.arrayBuffer());
          await checkPdf(ctx, bytes, locale, persona, JSON.parse(JSON.stringify(report)), path.join(outDir, `route-${persona.name}-${locale}`));
        }
        if (!caseFailed) console.log("  ✅ ok");
      }

      // ── 2. The browser download's call shape (thinner summary) ────
      {
        const label = `client-shape ${persona.name}/${locale}`;
        console.log(`\n=== ${label} ===`);
        let caseFailed = false;
        const ctx: CaseCtx = { label, fail: (m) => { caseFailed = failed = true; console.error(`  ❌ ${m}`); } };
        const bytes = await generateReadinessPDF({
          report: JSON.parse(JSON.stringify(report)),
          locale,
          saveToFile: false,
          userInputSummary: {
            name: "Test Persona",
            email: "qa@example.com",
            occupation: input.occupation,
            mainGoal: input.mainGoal,
            currentCountry: input.currentCountry,
            age: undefined, // full-check page never seeds initialValues.age
            englishLevel: input.englishLevel,
            isAustralianQualification: false,
          },
        });
        await checkPdf(ctx, bytes, locale, persona, JSON.parse(JSON.stringify(report)), path.join(outDir, `client-${persona.name}-${locale}`));
        if (!caseFailed) console.log("  ✅ ok");
      }
    }
  }

  if (failed) {
    console.error("\n❌ test-pdf-route FAILED");
    process.exitCode = 1;
  } else {
    console.log("\n✅ test-pdf-route passed (route handler -> PDF bytes -> text/geometry, en/tr/zh-Hans)");
  }
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error("test-pdf-route crashed:", err);
  process.exit(1);
});
