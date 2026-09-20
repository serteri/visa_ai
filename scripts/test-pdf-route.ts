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

const PERSONAS: Array<{ name: string; input: ReadinessInput; partnered: boolean; blocked: boolean; bannerInClientShape?: boolean }> = [
  { name: "se-partnered", input: base, partnered: true, blocked: true },
  { name: "se-single", input: { ...base, sponsorOrFamily: undefined }, partnered: false, blocked: true },
  {
    name: "se-long-occupation",
    input: {
      ...base,
      sponsorOrFamily: undefined,
      occupation:
        "Chief Visionary Officer of Quantum Blockchain Synergy Innovation Solutions and Cross-Functional Strategic Partnerships Enablement",
    },
    partnered: false,
    blocked: true,
    // Unmatched occupation: no detected subclass, and the browser download passes no
    // migrationGoals, so its PDF has no points section (and no banner) at all.
    bannerInClientShape: false,
  },
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
  en: /A positive Skills Assessment is also required before a visa application can be lodged./,
  tr: /ayrıca olumlu bir Beceri Değerlendirmesi gereklidir./,
  "zh-Hans": /此外，提交签证申请前也需要获得正面的技能评估结果。/,
};

const BANNED: Array<[string, RegExp]> = [
  ["legally required", /legally required/i],
  ["Less than 2 years", /Less than 2 years|2 yıldan az|2 年内/i],
  ["recent rounds", /recent rounds|son turlarda|近期轮次/i],
  ["duplicated skills-assessment sentence", /confirmed positive, and a positive|olumlu bir Beceri Değerlendirmesi olumlu|积极的技能评估结果获得正面结果/i],
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

type Rect = { x0: number; y0: number; x1: number; y1: number };
type LayoutReport = { offPage: string[]; overlaps: string[]; bannerIssues: string[]; bannerCount: number };

// Fill colours of the EOI STATUS banner box (RED_PALETTE.bg / GREEN_PALETTE.bg in pdf-personalized-content.ts).
const BANNER_FILLS: Array<[number, number, number]> = [
  [254, 242, 242],
  [220, 253, 230],
];
/** True when a "#rrggbb" fill is (within rounding) one of the banner background colours. */
function isBannerFill(hex: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex);
  if (!m) return false;
  const rgb = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return BANNER_FILLS.some((c) => c.every((v, i) => Math.abs(v - rgb[i]) <= 3));
}

/**
 * Geometry analysis of the finished PDF, from pdf.js text items (transform
 * coordinates) and the page operator list (filled rectangles):
 *   - offPage: text past the page's right edge;
 *   - overlaps: two text items whose boxes intersect by more than 2pt in BOTH
 *     axes (text drawn over text);
 *   - bannerIssues: any text item intersecting an EOI banner box that is not
 *     the banner's own text. Banner text (title + wrapped detail) all starts
 *     at the title's x; anything else inside the box was drawn over it.
 */
async function analyzeLayout(bytes: Uint8Array): Promise<LayoutReport> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdf-parse registers its own (older) pdf.js worker on globalThis; drop it so
  // this pdf.js instance loads its matching worker instead of failing the version check.
  delete (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true, disableFontFace: true }).promise;
  const out: LayoutReport = { offPage: [], overlaps: [], bannerIssues: [], bannerCount: 0 };
  const TOL = 2;
  const { OPS } = pdfjs;

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { width } = page.getViewport({ scale: 1 });

    // Text item boxes (PDF user space: origin bottom-left, baseline at transform[5]).
    const content = await page.getTextContent();
    const items: Array<{ str: string; box: Rect }> = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      const h = item.height || Math.abs(item.transform[3]) || 8;
      const box = { x0: x, x1: x + item.width, y0: y - 0.2 * h, y1: y + 0.8 * h };
      items.push({ str: item.str, box });
      if (box.x1 > width - 10 || x < 0) {
        out.offPage.push(`p${n}: "${item.str.slice(0, 60)}" (x=${x.toFixed(0)}, right=${box.x1.toFixed(0)}, page=${width.toFixed(0)})`);
      }
    }

    // Text over text.
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i].box;
        const b = items[j].box;
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > TOL && oy > TOL) {
          out.overlaps.push(`p${n}: "${items[i].str.slice(0, 40)}" overlaps "${items[j].str.slice(0, 40)}" (${ox.toFixed(1)}x${oy.toFixed(1)}pt)`);
        }
      }
    }

    // Banner boxes: wide rectangles filled with a banner background colour.
    const ops = await page.getOperatorList();
    let fill = "";
    const banners: Rect[] = [];
    ops.fnArray.forEach((fn, i) => {
      const args = ops.argsArray[i];
      if (fn === OPS.setFillRGBColor) fill = String(args[0]).toLowerCase();
      else if (fn === OPS.constructPath && args[0] !== OPS.stroke && isBannerFill(fill)) {
        const mm = args[2] as Record<string, number>;
        if (mm && mm[2] - mm[0] > 400 && mm[3] - mm[1] > 10) banners.push({ x0: mm[0], y0: mm[1], x1: mm[2], y1: mm[3] });
      }
    });
    for (const box of banners) {
      const inside = items.filter(
        (it) => Math.min(it.box.x1, box.x1) - Math.max(it.box.x0, box.x0) > TOL && Math.min(it.box.y1, box.y1) - Math.max(it.box.y0, box.y0) > TOL
      );
      const title = inside.find((it) => /^EOI/.test(it.str));
      // Other alert boxes reuse the red palette; only a box carrying the EOI title is the banner.
      if (!title) continue;
      out.bannerCount++;
      for (const it of inside) {
        if (Math.abs(it.box.x0 - title.box.x0) > 1.5 || it.box.x1 > box.x1) {
          out.bannerIssues.push(`p${n}: "${it.str.slice(0, 50)}" drawn on top of the banner box`);
        }
      }
    }
  }
  return out;
}

type CaseCtx = { label: string; fail: (msg: string) => void };

async function checkPdf(
  ctx: CaseCtx,
  pdfBytes: Uint8Array,
  locale: Locale,
  persona: (typeof PERSONAS)[number],
  report: ReadinessReport,
  outStem: string,
  expectBanner: boolean
) {
  await writeFile(`${outStem}.pdf`, pdfBytes);
  const text = await extractPdfText(pdfBytes);
  await writeFile(`${outStem}.txt`, text);
  const flat = flatten(text);

  for (const [name, re] of BANNED) {
    if (re.test(flat) || re.test(squashAll(flat))) ctx.fail(`banned text present: ${name}`);
  }

  // English-test validity: whenever the checklist states one, it must be the
  // constant's figure (never the stale hardcoded "2 years").
  for (const m of flat.matchAll(/Test Results \(Less than (\d+) years old\)/g)) {
    if (Number(m[1]) !== ENGLISH_TEST_VALIDITY_YEARS.AU) {
      ctx.fail(`English checklist states ${m[1]} years, ENGLISH_TEST_VALIDITY_YEARS.AU is ${ENGLISH_TEST_VALIDITY_YEARS.AU}`);
    }
  }

  if (expectBanner && !BANNER_TAIL[locale].test(flat) && !BANNER_TAIL[locale].test(squashAll(flat))) {
    ctx.fail("cover EOI banner sentence missing its final words");
  }
  const layout = await analyzeLayout(pdfBytes);
  if (layout.offPage.length > 0) ctx.fail(`text runs past the page edge (clipped): ${layout.offPage.slice(0, 3).join(" | ")}`);
  if (layout.overlaps.length > 0) ctx.fail(`${layout.overlaps.length} text overlap(s): ${layout.overlaps.slice(0, 4).join(" | ")}`);
  if (layout.bannerIssues.length > 0) ctx.fail(`EOI banner overlap: ${layout.bannerIssues.slice(0, 3).join(" | ")}`);
  if (expectBanner && layout.bannerCount === 0) ctx.fail("blocked profile but no EOI banner box found in the PDF");

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
          await checkPdf(ctx, bytes, locale, persona, JSON.parse(JSON.stringify(report)), path.join(outDir, `route-${persona.name}-${locale}`), persona.blocked);
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
        await checkPdf(ctx, bytes, locale, persona, JSON.parse(JSON.stringify(report)), path.join(outDir, `client-${persona.name}-${locale}`), persona.blocked && persona.bannerInClientShape !== false);
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
