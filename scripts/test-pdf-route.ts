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

import type { PointsActionPlan, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { generatePremiumStrategy } from "../lib/ai/generate-premium-strategy";
import { blockedLabel, describePathwayScore, PATHWAY_SUBCLASSES } from "../lib/readiness/pathway-scores";
import { deterministicRecommendations, findOpenState } from "../lib/readiness/pathway-recommendations";
import visaTrends from "../src/data/visa-trends.json";
import type { PremiumStrategyResult } from "../lib/ai/strategy-schema";
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
  isQualificationRecognized: true, // overseas PhD recognised => 70 base points (the live report's profile)
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

// ─────────────────────────────────────────────────────────────────────────────
// Points Booster Roadmap / Points Improvement Tips (Phase 2c)
//
// The roadmap and tips must contain only actions that can still raise THIS
// applicant's score, with the engine's own point values. The LLM step is stubbed
// with hostile output (English +20, Masters +20, unmapped actions, foreign
// numbers, a skills assessment "worth" points ...); the validator must replace
// it, and the PDF from the route handler must show only the engine's list.
// ─────────────────────────────────────────────────────────────────────────────

type StrategyStub = (args: { system: string; prompt: string }) => Promise<PremiumStrategyResult>;

const POINTS_PROFILES: Array<{
  name: string;
  input: ReadinessInput;
  expectEnglishAction: boolean;
  expectEducationAction: boolean;
  expectPartnerAction: boolean;
  expectEnablingStep: boolean;
}> = [
  {
    // (a) English superior (20/20) + PhD (20/20), partnered, partner without functional English
    name: "a-superior-phd-partnered",
    input: { ...base },
    expectEnglishAction: false,
    expectEducationAction: false,
    expectPartnerAction: true,
    expectEnablingStep: true,
  },
  {
    // (b) English competent (no bonus yet) + bachelor, single
    name: "b-competent-bachelor-single",
    input: { ...base, englishLevel: "competent", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: "Single / No Dependants" },
    expectEnglishAction: true,
    expectEducationAction: true,
    expectPartnerAction: false,
    expectEnablingStep: true,
  },
  {
    // (c) Civil Engineer 233211, positive assessment, 5 years overseas
    name: "c-civil-233211-positive-assessment",
    input: {
      ...base,
      currentCountry: "Turkey",
      age: "35",
      occupation: "Civil Engineer 233211",
      occupationConfirmed: "yes",
      englishLevel: "competent",
      qualificationLevel: "Bachelor's Degree",
      sponsorOrFamily: "Single / No Dependants",
      offshoreExperienceYears: 5,
    },
    expectEnglishAction: true,
    expectEducationAction: true,
    expectPartnerAction: false,
    expectEnablingStep: false,
  },
];

/** Deterministic PRNG so a failing hostile run can be reproduced from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOSTILE = "HOSTILE";

/** A model output built to break every rule: unmapped ids, foreign numbers, factors at their maximum, a skills assessment "worth" points. */
function hostileResult(rand: () => number, plan: PointsActionPlan): PremiumStrategyResult {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  // Never an engine gain, so every hostile string is wrong for EVERY profile (even where English/education are real actions).
  const n = () => pick([11, 12, 13, 17, 22, 23, 27]);
  const boosters: PremiumStrategyResult["pointsBoosterStrategy"] = [
    { actionId: "english_upgrade", action: `${HOSTILE} Improve English test results to Superior level +${n()}`, pointsGained: pick([20, 11]), difficulty: "Low", reason: `${HOSTILE} Retest English for +${n()} points`, difficultyExplanation: "Easy" },
    { actionId: null, action: `${HOSTILE} Masters degree +${n()}`, pointsGained: 20, difficulty: "Medium", reason: `${HOSTILE} A Masters adds +${n()} points`, difficultyExplanation: "Medium" },
    { actionId: "education", action: `${HOSTILE} Obtain a Masters`, pointsGained: n(), difficulty: "High", reason: null, difficultyExplanation: null },
    { actionId: "skills_assessment", action: `${HOSTILE} Obtain a Skills Assessment`, pointsGained: pick([0, 15]), difficulty: "Medium", reason: null, difficultyExplanation: null },
    { actionId: "partner_skills", action: `${HOSTILE} Partner`, pointsGained: 99, difficulty: "Low", reason: `${HOSTILE} partner`, difficultyExplanation: null },
    // Right id, right number, wrong wording (a factor that is at its maximum)
    ...plan.actions.slice(0, 2).map((a) => ({
      actionId: a.id as string | null,
      action: `${HOSTILE} ${a.label}`,
      pointsGained: a.gain,
      difficulty: "Low" as const,
      reason: `${HOSTILE} Also improve your English result by +${n()} points`,
      difficultyExplanation: null,
    })),
  ];
  // Random subset, random order
  const chosen = boosters.filter(() => rand() > 0.25).sort(() => rand() - 0.5);
  return {
    executiveSummary: `${HOSTILE} Improving English to Superior would add +${n()} points.`,
    topRecommendedPathways: [
      {
        state: "NSW",
        subclass: "190",
        reason: `${HOSTILE} A Masters degree gives +${n()} points`,
        nextSteps: [
          `${HOSTILE} Retake the English test for +${n()} points`,
          `${HOSTILE} Complete a Masters degree to gain +${n()} points`,
          "Prepare documents for the nomination application",
        ],
      },
    ],
    pointsBoosterStrategy: chosen.length > 0 ? chosen : boosters,
    timelineEstimate: "6-12 months",
  };
}

/** A fully valid output: engine ids, engine numbers, only the wording is the model's own. */
function validResult(plan: PointsActionPlan, recommendations: PremiumStrategyResult["topRecommendedPathways"]): PremiumStrategyResult {
  return {
    executiveSummary: "A concise, valid summary.",
    topRecommendedPathways: recommendations,
    pointsBoosterStrategy: plan.actions.map((a) => ({
      actionId: a.id,
      action: `model label ${a.id}`,
      pointsGained: a.gain,
      difficulty: "Low" as const,
      reason: `TESTWORD-${a.id} reason.`,
      difficultyExplanation: `TESTDIFF-${a.id} explanation.`,
    })),
    timelineEstimate: "6-12 months",
  };
}

const ROADMAP_HEADING: Record<Locale, string> = {
  en: "Points Booster Roadmap",
  tr: "Puan Artırma Yol Haritası",
  "zh-Hans": "积分提升路线图",
};
const TIMELINE_HEADING: Record<Locale, string> = {
  en: "Timeline Estimate",
  tr: "Tahmini Zaman Çizelgesi",
  "zh-Hans": "预计时间线",
};
const TIPS_HEADING: Record<Locale, string> = {
  en: "Points Improvement Tips",
  tr: "Puan Artırma Önerileri",
  "zh-Hans": "积分提升建议",
};
const TABLE_HEADER: Record<Locale, string> = { en: "Points Gained", tr: "Kazanılacak Puan", "zh-Hans": "可获积分" };

const ENGLISH_RE = /english|ielts|pte\b|ingilizce|İngilizce|dil (?:testi|puan|seviye)|英语|英文|雅思/i;
const EDUCATION_RE = /doctorate|\bphd\b|master|bachelor|degree|doktora|yüksek lisans|lisans|博士|硕士|学位|学士/i;
const PARTNER_RE = /partner|spouse|(?<![a-zçğıöşü])eş(?![a-zçğıöşü])|配偶|伴侣/i;

/** Every "+N" token, sorted. */
/** Removes the engine's partner-action strings: they legitimately mention the PARTNER's English, which is not an English improvement for the applicant. */
const withoutPartnerWording = (t: string, plan: PointsActionPlan, sq: (x: string) => string): string => {
  let out = t;
  for (const a of plan.actions.filter((x) => x.id === "partner_skills")) {
    for (const piece of [a.label, a.reason]) out = out.split(sq(piece)).join(" ");
  }
  return out;
};

const plusNumbers = (t: string): number[] => [...t.matchAll(/\+\s?(\d+)/g)].map((m) => Number(m[1])).sort((x, y) => x - y);

function sliceBetween(flat: string, from: string, toCandidates: string[], maxLen = 6000): string {
  const i = flat.indexOf(from);
  if (i < 0) return "";
  let end = Math.min(flat.length, i + maxLen);
  for (const c of toCandidates) {
    const j = flat.indexOf(c, i + from.length);
    if (j >= 0 && j < end) end = j;
  }
  return flat.slice(i, end);
}

async function runPointsActionChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const RUNS_PER_PROFILE = 5; // hostile runs per profile and locale
  const emptyRag = { visaContext: {}, stateContext: {} } as never;

  for (const profile of POINTS_PROFILES) {
    for (const locale of LOCALES) {
      const input: ReadinessInput = { ...profile.input, locale };
      const baseReport = runReadinessEngine(input);
      const plan = baseReport.pointsEstimate?.actionPlan;
      const label = `points ${profile.name}/${locale}`;
      if (!plan) {
        console.log(`\n=== ${label} ===`);
        fail(`${label}: engine produced no actionPlan`);
        continue;
      }
      const ids = plan.actions.map((a) => a.id);
      const gains = plan.actions.map((a) => a.gain).sort((x, y) => x - y);
      const has = (id: string) => (ids as string[]).includes(id);

      // ── Engine plan expectations (deterministic, before any LLM) ──────────
      const planIssues: string[] = [];
      if (has("english_upgrade") !== profile.expectEnglishAction) planIssues.push(`english action ${has("english_upgrade") ? "present" : "absent"}, expected ${profile.expectEnglishAction ? "present" : "absent"}`);
      if (has("education") !== profile.expectEducationAction) planIssues.push(`education action ${has("education") ? "present" : "absent"}, expected ${profile.expectEducationAction ? "present" : "absent"}`);
      if (has("partner_skills") !== profile.expectPartnerAction) planIssues.push(`partner action ${has("partner_skills") ? "present" : "absent"}, expected ${profile.expectPartnerAction ? "present" : "absent"}`);
      if ((plan.enablingSteps.length > 0) !== profile.expectEnablingStep) planIssues.push(`enabling step ${plan.enablingSteps.length > 0 ? "present" : "absent"}, expected ${profile.expectEnablingStep ? "present" : "absent"}`);
      if (plan.actions.some((a) => (a.id as string) === "skills_assessment" || a.gain <= 0)) planIssues.push("plan contains a non-points or zero-gain action");
      const sorted = [...plan.actions].every((a, i, arr) => i === 0 || arr[i - 1].gain >= a.gain);
      if (!sorted) planIssues.push("actions are not ordered by gain");
      if (planIssues.length > 0) {
        console.log(`\n=== ${label} (engine plan) ===`);
        planIssues.forEach((m) => fail(m));
      }

      // Runs: N hostile (both attempts hostile -> deterministic fallback), one hostile-then-valid
      // (retry accepted, model wording used), one valid (first attempt accepted).
      type Run = { kind: "hostile" | "hostile-then-valid" | "valid"; seed: number };
      const runs: Run[] = [
        ...Array.from({ length: RUNS_PER_PROFILE }, (_, i): Run => ({ kind: "hostile", seed: 1000 + i * 7919 })),
        { kind: "hostile-then-valid", seed: 4242 },
        { kind: "valid", seed: 0 },
      ];

      for (const run of runs) {
        const runLabel = `${label} [${run.kind} seed=${run.seed}]`;
        console.log(`\n=== ${runLabel} ===`);
        let runFailed = false;
        const f = (m: string) => { runFailed = true; fail(`${runLabel}: ${m}`); };

        const rand = mulberry32(run.seed);
        let calls = 0;
        const stub: StrategyStub = async () => {
          calls++;
          if (run.kind === "valid") return validResult(plan, deterministicRecommendations(baseReport, locale));
          if (run.kind === "hostile-then-valid" && calls === 2) return validResult(plan, deterministicRecommendations(baseReport, locale));
          return hostileResult(rand, plan);
        };
        // Quiet the expected [llm_text_invariant_violation] logging.
        const origError = console.error;
        console.error = () => undefined;
        let strategy: PremiumStrategyResult;
        try {
          strategy = await generatePremiumStrategy(baseReport, emptyRag, locale, stub);
        } finally {
          console.error = origError;
        }

        const expectedCalls = run.kind === "valid" ? 1 : 2;
        if (calls !== expectedCalls) f(`LLM stub called ${calls}x, expected ${expectedCalls}`);

        // Stored strategy: rows must equal the engine plan exactly.
        const strat = strategy.pointsBoosterStrategy;
        if (strat.length !== plan.actions.length) f(`strategy has ${strat.length} rows, engine has ${plan.actions.length}`);
        strat.forEach((row, i) => {
          const a = plan.actions[i];
          if (!a || row.actionId !== a.id || row.pointsGained !== a.gain || row.difficulty !== a.difficulty || row.action !== a.label) {
            f(`strategy row ${i} (${row.actionId}, +${row.pointsGained}) differs from engine (${a?.id}, +${a?.gain})`);
          }
        });
        if (JSON.stringify(strategy).includes(HOSTILE)) f("hostile text survived validation in the stored strategy");

        // Same path as production: report_json carries aiStrategy, PDF comes from the route handler.
        const report: ReadinessReport = JSON.parse(JSON.stringify({ ...baseReport, aiStrategy: strategy }));
        const reportId = `points-${profile.name}-${locale}-${run.kind}-${run.seed}`;
        rows.set(reportId, {
          id: reportId,
          email: "qa@example.com",
          locale,
          report_json: report,
          input_json: JSON.parse(JSON.stringify(input)),
          agent_id: null,
          is_unlocked: true,
          full_name: "Test Persona",
          preview_data: null,
        });
        const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
        if (res.status !== 200) {
          f(`route returned HTTP ${res.status}`);
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const text = await extractPdfText(bytes);
        const flat = locale === "zh-Hans" ? squashAll(text) : flatten(text);
        const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);
        if (run.seed === 1000 || run.kind !== "hostile") {
          await writeFile(path.join(outDir, `points-${profile.name}-${locale}-${run.kind}.txt`), text);
        }

        if (flat.includes(HOSTILE)) f("hostile text appears in the PDF");

        // The longer roadmap/tips must not overlap other text or run off the page.
        const layout = await analyzeLayout(bytes);
        if (layout.overlaps.length > 0) f(`${layout.overlaps.length} text overlap(s): ${layout.overlaps.slice(0, 3).join(" | ")}`);
        if (layout.offPage.length > 0) f(`text runs past the page edge: ${layout.offPage.slice(0, 3).join(" | ")}`);

        // ── Roadmap section ───────────────────────────────────────────
        const roadmap = sliceBetween(flat, sq(ROADMAP_HEADING[locale]), [sq(TIMELINE_HEADING[locale])]);
        if (!roadmap) {
          f("Points Booster Roadmap section missing from the PDF");
          continue;
        }
        const roadmapGains = plusNumbers(roadmap);
        if (JSON.stringify(roadmapGains) !== JSON.stringify(gains)) f(`roadmap points [${roadmapGains}] != engine [${gains}]`);
        for (const a of plan.actions) {
          if (!roadmap.includes(sq(a.label).slice(0, 40))) f(`roadmap is missing engine action ${a.id}`);
        }
        if (!profile.expectEnglishAction && ENGLISH_RE.test(withoutPartnerWording(roadmap, plan, sq))) f("roadmap mentions English although English is at the maximum");
        if (!profile.expectEducationAction && EDUCATION_RE.test(roadmap)) f("roadmap mentions education although it is at the maximum");
        if (!profile.expectPartnerAction && PARTNER_RE.test(roadmap)) f("roadmap mentions a partner for a single applicant");

        // Enabling step: separate, no points value.
        const step = plan.enablingSteps[0];
        if (profile.expectEnablingStep) {
          if (!step || !roadmap.includes(sq(step.label))) {
            f("enabling step (skills assessment) row missing");
          } else {
            const after = roadmap.slice(roadmap.indexOf(sq(step.label)) + sq(step.label).length);
            const reasonAt = after.indexOf(sq(step.reason));
            if (reasonAt < 0 || reasonAt > 120) {
              f("enabling step lacks its 'unlocks skilled-employment points' sentence right after the label");
            } else {
              const enablingBlock = after.slice(0, reasonAt + sq(step.reason).length);
              if (/[+\d]/.test(enablingBlock)) f(`enabling step carries a points value: "${enablingBlock.slice(0, 120)}"`);
            }
          }
        } else if (/Enabling step|Etkinleştirici adım|前置步骤/.test(roadmap)) {
          f("enabling step shown although a positive assessment is already on file");
        }

        if (run.kind === "valid" || run.kind === "hostile-then-valid") {
          for (const a of plan.actions) {
            if (!roadmap.includes(sq(`TESTWORD-${a.id}`))) f(`validated model wording for ${a.id} was not used`);
          }
        } else if (/TESTWORD/.test(roadmap)) {
          f("model wording used although validation failed");
        }

        // ── Points Improvement Tips + gap analysis ────────────────────
        const tipsRaw = sliceBetween(flat, sq(TIPS_HEADING[locale]), [], 6000);
        let tips = "";
        {
          let seen = 0;
          const re = /\+\s?\d+\s?(?:pts|puan|分)/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(tipsRaw)) !== null) {
            if (++seen === gains.length) {
              tips = tipsRaw.slice(0, m.index + m[0].length);
              break;
            }
          }
          if (!tips && gains.length === 0) tips = tipsRaw.slice(0, 200);
        }
        if (!tips) {
          f("Points Improvement Tips missing from the PDF");
        } else {
          // The container ends where the next block starts; the engine gains must be exactly the ones listed, in order.
          const tipGains = plusNumbers(tips).slice(0, gains.length).sort((x, y) => x - y);
          if (JSON.stringify(tipGains) !== JSON.stringify(gains)) f(`tips points [${tipGains}] != engine [${gains}]`);
          for (const a of plan.actions) {
            if (!tips.includes(sq(a.label).slice(0, 40))) f(`tips are missing engine action ${a.id}`);
          }
          if (/\+10-20|\+10 - 20/.test(tips)) f("static '+10-20' Masters/PhD tip is still shown");
        }
        const gapAnalysis = sliceBetween(flat, locale === "en" ? "TOTAL:" : locale === "tr" ? "TOPLAM:" : "总分：", [sq(TIPS_HEADING[locale])], 1500);
        if (!profile.expectEnglishAction && ENGLISH_RE.test(withoutPartnerWording(gapAnalysis, plan, sq))) f(`gap analysis mentions English although it is at the maximum: "${gapAnalysis.slice(0, 200)}"`);
        if (!profile.expectEnglishAction && ENGLISH_RE.test(withoutPartnerWording(tips, plan, sq))) f("tips mention English although it is at the maximum");
        if (!profile.expectEducationAction && EDUCATION_RE.test(tips)) f("tips mention education although it is at the maximum");
        if (!profile.expectPartnerAction && PARTNER_RE.test(tips)) f("tips mention a partner for a single applicant");

        // ── Whole-PDF: no English improvement advice at the maximum ──
        if (!profile.expectEnglishAction) {
          const adviceRe = /(?:improve|upgrad\w*|enhance|retak\w*|retest\w*|raise|boost)[^.]{0,50}english|english[^.]{0,40}\+\s?\d+|english (?:score|test)[^.]{0,30}(?:weight|retest)|(?:dil|ingilizce)[^.]{0,40}(?:yükselt|artır)|(?:提高|提升)[^。]{0,10}(?:语言|英语)/i;
          const m = adviceRe.exec(withoutPartnerWording(flat, plan, sq));
          if (m) f(`PDF still advises improving English at the maximum: "...${withoutPartnerWording(flat, plan, sq).slice(Math.max(0, m.index - 30), m.index + 110)}..."`);
        }

        if (!runFailed) console.log("  ✅ ok");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// One score and one ranking (Phase 2b)
//
// Every section must read the single PathwayScoreSet / PathwayRanking:
//  - Reality Check and Historical Invitation Trends state the SAME sentence (same numbers) per pathway;
//  - a nomination-bonus score is always conditional ("only if ... is secured");
//  - the ranking order is identical in the Visa Viability Ranking, Signal Snapshot, Reality Check,
//    Historical Invitation Trends, the lodgement checklist and the (LLM) recommendations;
//  - the LLM step (stubbed hostile) can only recommend recommendable pathways and OPEN states, and any
//    score it states must equal the engine's; the validator replaces anything else;
//  - the cover explains "N / 65" and points at the page of the invitation benchmarks.
// ─────────────────────────────────────────────────────────────────────────────

const PATHWAY_PROFILES: Array<{ name: string; input: ReadinessInput }> = [
  { name: "p-partnered-se", input: { ...base } },
  { name: "p-single-se", input: { ...base, sponsorOrFamily: "Single / No Dependants" } },
  {
    // Civil Engineer 233211, positive assessment, 5 years overseas (blocked only by the points minimum)
    name: "p-civil-233211",
    input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 },
  },
  {
    // Same, with Superior English: unblocked, so recommendations are allowed
    name: "p-civil-233211-superior",
    input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "superior", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 },
  },
];

async function extractPdfPages(bytes: Uint8Array): Promise<string[]> {
  const parser = new PDFParse({ data: bytes.slice() });
  const result = await parser.getText();
  return (result.pages ?? []).map((p: { text: string }) => p.text);
}

/** First-appearance order of the subclass codes captured by `re` (group 1), de-duplicated. */
function orderOf(text: string, re: RegExp): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(re)) if (!seen.includes(m[1])) seen.push(m[1]);
  return seen;
}

function hostilePathwayResult(rand: () => number, report: ReadinessReport): PremiumStrategyResult {
  const scores = report.pathwayScores!;
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const wrong = pick([92, 88, 81, 79]);
  const closed = (report.stateNominationTracker?.states ?? []).find((s) => s.isOpen === false);
  return {
    executiveSummary: `${HOSTILE} Your score is ${wrong}, so subclass 491 is a strong fit and viable now; apply immediately.`,
    topRecommendedPathways: [
      // A pathway the ranking does not allow, praised, with the bonus score presented as the current score
      { state: closed?.code ?? "NT", subclass: "491", reason: `${HOSTILE} Your ${scores["491"].subclass} score is ${scores["491"].scoreIfNominated} and clears the benchmark`, nextSteps: [`${HOSTILE} Lodge now`] },
      { state: "ZZ", subclass: "190", reason: `${HOSTILE} ${wrong} points, a ${wrong - 60}-point gap`, nextSteps: [] },
      { state: "NSW", subclass: "189", reason: `${HOSTILE} strong`, nextSteps: [] },
    ],
    pointsBoosterStrategy: [],
    timelineEstimate: "6-12 months",
  };
}

async function runPathwayChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const emptyRag = { visaContext: {}, stateContext: {} } as never;

  for (const profile of PATHWAY_PROFILES) {
    for (const locale of LOCALES) {
      const input: ReadinessInput = { ...profile.input, locale };
      const baseReport = runReadinessEngine(input);
      const scores = baseReport.pathwayScores;
      const ranking = baseReport.pathwayRanking;
      const label = `pathways ${profile.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      if (!scores || !ranking) {
        f("engine produced no pathwayScores/pathwayRanking");
        continue;
      }
      const expectedOrder: string[] = ranking.entries.map((e) => e.subclass);

      // Scores are one set: base is the engine estimate, bonus from the points table, gaps derived, no invented benchmark.
      for (const s of PATHWAY_SUBCLASSES) {
        const p = scores[s];
        if (p.baseScore !== baseReport.pointsEstimate?.estimatedPoints) f(`${s}: baseScore ${p.baseScore} != engine estimate ${baseReport.pointsEstimate?.estimatedPoints}`);
        if (p.scoreIfNominated !== p.baseScore + p.nominationBonus) f(`${s}: scoreIfNominated is not base + bonus`);
        if (p.benchmark !== null && p.gapBase !== p.benchmark - p.baseScore) f(`${s}: gapBase is not benchmark - base`);
        if (p.benchmark !== null && p.gapIfNominated !== p.benchmark - p.scoreIfNominated) f(`${s}: gapIfNominated is not benchmark - scoreIfNominated`);
        if (p.benchmark !== null && p.benchmark !== (visaTrendsBenchmark(input.occupation, s) ?? -1)) f(`${s}: benchmark ${p.benchmark} is not the visa-trends.json snapshot`);
      }

      // ── LLM step, stubbed hostile ─────────────────────────────────────
      const RUNS = 5;
      const hostileRuns: Array<{ kind: "hostile" | "valid"; seed: number }> = [
        ...Array.from({ length: RUNS }, (_, i) => ({ kind: "hostile" as const, seed: 77 + i * 131 })),
        { kind: "valid", seed: 0 },
      ];
      let lastBytes: Uint8Array | undefined;
      for (const run of hostileRuns) {
        const rand = mulberry32(run.seed);
        let calls = 0;
        const deterministic = deterministicRecommendations(baseReport, locale);
        const stub: StrategyStub = async () => {
          calls++;
          if (run.kind === "valid") {
            return {
              executiveSummary: "A concise, valid summary.",
              topRecommendedPathways: deterministic,
              pointsBoosterStrategy: (baseReport.pointsEstimate?.actionPlan?.actions ?? []).map((a) => ({
                actionId: a.id, action: a.label, pointsGained: a.gain, difficulty: a.difficulty, reason: null, difficultyExplanation: null,
              })),
              timelineEstimate: "6-12 months",
            };
          }
          return hostilePathwayResult(rand, baseReport);
        };
        const origError = console.error;
        console.error = () => undefined;
        let strategy: PremiumStrategyResult;
        try {
          strategy = await generatePremiumStrategy(baseReport, emptyRag, locale, stub);
        } finally {
          console.error = origError;
        }
        const runLabel = `[${run.kind} seed=${run.seed}]`;
        if (calls !== (run.kind === "valid" ? 1 : 2)) f(`${runLabel} LLM stub called ${calls}x`);
        const recs = strategy.topRecommendedPathways;
        // Only recommendable pathways, in ranking order, only open states
        const positions = recs.map((r) => expectedOrder.indexOf(r.subclass));
        if (recs.some((r) => !ranking.recommendable.includes(r.subclass as never))) f(`${runLabel} recommends a pathway the ranking does not allow: ${recs.map((r) => r.subclass)}`);
        if (positions.some((p, i) => i > 0 && p < positions[i - 1])) f(`${runLabel} recommendations are not in ranking order`);
        for (const r of recs) {
          if ((r.subclass === "190" || r.subclass === "491") && !findOpenState(baseReport, r.state)) f(`${runLabel} recommends state ${r.state}, which is not open in the state data`);
        }
        if (ranking.allBlocked && recs.length > 0) f(`${runLabel} every pathway is blocked but ${recs.length} recommendations remain`);
        if (JSON.stringify(strategy).includes(HOSTILE)) f(`${runLabel} hostile text survived validation`);
        if (run.kind === "hostile" && JSON.stringify(recs) !== JSON.stringify(deterministic)) f(`${runLabel} hostile recommendations were not replaced by the deterministic list`);
        if (run.kind === "valid" && JSON.stringify(recs) !== JSON.stringify(deterministic)) f(`${runLabel} a valid recommendation list was altered`);
        if (/\b(?:92|88|81|79)\b/.test(strategy.executiveSummary)) f(`${runLabel} a different score survived in the summary`);

        // Same path as production: report_json carries aiStrategy, PDF from the route handler
        const report: ReadinessReport = JSON.parse(JSON.stringify({ ...baseReport, aiStrategy: strategy }));
        const reportId = `pathways-${profile.name}-${locale}-${run.kind}-${run.seed}`;
        rows.set(reportId, {
          id: reportId, email: "qa@example.com", locale, report_json: report, input_json: JSON.parse(JSON.stringify(input)),
          agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
        });
        const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
        if (res.status !== 200) { f(`${runLabel} route returned HTTP ${res.status}`); continue; }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const flatAll = flatten(await extractPdfText(bytes));
        if (flatAll.includes(HOSTILE)) f(`${runLabel} hostile text appears in the PDF`);
        lastBytes = bytes;
      }
      if (!lastBytes) continue;

      // ── Section checks on the (valid-run) PDF ─────────────────────────
      const pages = (await extractPdfPages(lastBytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
      const raw = pages.join("\n");
      await writeFile(path.join(outDir, `pathways-${profile.name}-${locale}.txt`), raw);
      const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
      const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);

      // 1. One statement per pathway, identical in Reality Check and Historical Invitation Trends
      for (const s of PATHWAY_SUBCLASSES) {
        const statement = sq(describePathwayScore(scores[s], locale));
        const count = flat.split(statement).length - 1;
        const rankingRowNeedsIt = 0; // the ranking row may truncate the sentence; Reality Check + Trends must state it in full
        // Reality Check + Trends (+ the ranking row when it is a qualitative/blocked row)
        if (count < 2 + rankingRowNeedsIt) f(`${s}: the score sentence appears ${count}x, expected >= ${2 + rankingRowNeedsIt} (Reality Check, Trends${rankingRowNeedsIt ? ", ranking" : ""})`);
      }
      // 2. Bonus scores are never presented as current
      if (/nomination bonus|adaylık bonusu|提名加分|\(base \d+ \+/i.test(flat)) f("old '(base N + nomination bonus M)' wording is still shown");
      for (const s of ["190", "491"] as const) {
        const p = scores[s];
        const conditional = sq(describePathwayScore(p, locale));
        // Every sentence that states "<bonus score> only if ..." is inside the shared, conditional statement
        const re = new RegExp(`(?:${p.scoreIfNominated} (?:only if|yalnızca)|仅在获得[^；]{0,12}后为 ?${p.scoreIfNominated})`, "g");
        const conditionalMentions = (flat.match(re) ?? []).length;
        if (!flat.includes(conditional)) f(`${s}: the conditional statement is missing`);
        if (conditionalMentions < 2) f(`${s}: bonus score ${p.scoreIfNominated} is not shown as conditional in at least two sections (${conditionalMentions})`);
      }
      // 3. Gap numbers in Reality Check == gap numbers in Trends
      for (const s of PATHWAY_SUBCLASSES) {
        const p = scores[s];
        const reality = flat.match(new RegExp(`${s}\\)? ?- ?(?:Reality Check|Gerçeklik Kontrolü|实际难度评估): ?(.{0,400})`));
        const trends = flat.match(new RegExp(`Subclass ?${s}: ?(.{0,400})`, "g")) ?? [];
        const gapNums = (t: string) => [...t.matchAll(/(\d+)(?: points below| puan altında|分)/g)].map((m) => Number(m[1]));
        const expected = [p.gapBase, p.gapIfNominated].filter((n): n is number => n !== null && n > 0);
        if (reality && expected.length > 0 && !expected.every((n) => gapNums(reality[1]).includes(n))) f(`${s}: Reality Check gap numbers ${gapNums(reality[1])} != engine ${expected}`);
        const trendLine = trends.find((t) => /Score now|Şu anki puan|当前分数/.test(t));
        if (trendLine && expected.length > 0 && !expected.every((n) => gapNums(trendLine).includes(n))) f(`${s}: Trends gap numbers ${gapNums(trendLine)} != engine ${expected}`);
        if (reality && trendLine && p.gapBase !== null && !gapNums(reality[1]).includes(p.gapBase) && p.gapBase > 0) f(`${s}: Reality Check and Trends disagree on the gap`);
      }
      // 4. Ranking order identical across sections
      const sections: Array<[string, string[]]> = [];
      // Rows read "491 Visa - ..." (one per pathway) or, when grouped, "491 / 190 / 189 - General Skilled Migration".
      const rankingLabel = /(189|190|491)(?= Visa| Vizesi| ?签证| ?\/ ?(?:189|190|491)| ?- ?(?:General|Genel|一般))/g;
      const rankingStart = flat.search(/The ranking below orders|Aşağıdaki sıralama, olası|以下排序按合规状态/);
      if (rankingStart >= 0) sections.push(["Visa Viability Ranking", orderOf(flat.slice(rankingStart, rankingStart + 4000), rankingLabel)]);
      const snapStart = flat.search(/Signal Snapshot|Sinyal Özeti|匹配度概览/);
      if (snapStart >= 0) sections.push(["Signal Snapshot", orderOf(flat.slice(snapStart, snapStart + 700), /\((189|190|491)\)/g)]);
      sections.push(["Reality Check", orderOf(flat, /\((189|190|491)\) ?- ?(?:Reality Check|Gerçeklik Kontrolü|实际难度评估)/g)]);
      sections.push(["Historical Invitation Trends", orderOf(flat, /Subclass ?(189|190|491): ?(?:Score now|Şu anki puan|当前分数)/g)]);
      const checklist = flat.match(/(?:in ranking order|sıralama düzeninde yollar|按排序顺序的路径)[:：] ?([^.。]{0,120})/);
      if (checklist) sections.push(["Lodgement checklist", orderOf(checklist[1], /(189|190|491)/g)]);
      for (const [name, order] of sections) {
        if (order.length === 0) { f(`${name}: no pathways found to compare`); continue; }
        const expectedSubset = expectedOrder.filter((s) => order.includes(s));
        if (JSON.stringify(order) !== JSON.stringify(expectedSubset)) f(`${name} order [${order}] != ranking [${expectedOrder}]`);
      }
      // strongest signal == ranking #1
      const strongest = flat.match(/(?:Strongest signal|En güçlü sinyal|最高匹配路径) ?[^()]*\((189|190|491)\)/);
      if (strongest && strongest[1] !== expectedOrder[0]) f(`Signal Snapshot strongest (${strongest[1]}) != ranking #1 (${expectedOrder[0]})`);
      // every-blocked: one consistent label
      if (ranking.allBlocked && ranking.commonBlockReason) {
        const lbl = sq(blockedLabel(ranking.commonBlockReason, locale));
        const n = flat.split(lbl).length - 1;
        if (n < 4) f(`the blocked label "${lbl}" appears only ${n}x (expected in ranking x3 + snapshot + checklist)`);
        if (ranking.entries.some((e) => e.fit !== "blocked")) f("allBlocked but a pathway is not blocked");
      }
      // fit labels come from the ranking only: no "Potential fit"/"Unclear fit" on a blocked pathway
      if (ranking.allBlocked && /Potential fit|Unclear fit|Unlikely fit|Olası uyum|Belirsiz uyum|可能匹配|匹配度不明/.test(flat.slice(Math.max(0, rankingStart), rankingStart + 4000))) {
        f("a fit label is shown although every pathway is blocked");
      }

      // 5. Cover: "N / 65" explained, page reference correct, number equals the breakdown total
      const est = baseReport.pointsEstimate?.estimatedPoints;
      const cover = squashAll(pages[0] ?? "");
      if (est !== undefined) {
        const coverNote = locale === "tr" ? `Tahminipuan${est};` : locale === "zh-Hans" ? `预估分数${est}；` : `Estimatedpoints${est};`;
        if (!cover.includes(coverNote)) f(`cover does not explain the score ("${coverNote}")`);
        if (!cover.includes(`${est}/65`) && !cover.includes(`${est}`)) f("cover does not show the estimate");
        const seeRef = cover.match(/(?:seepage|bkz\.sayfa|见第)(\d+)/);
        const hasBenchmark = PATHWAY_SUBCLASSES.some((s) => scores[s].benchmark !== null);
        if (hasBenchmark) {
          if (!seeRef) f("cover has no page reference to the invitation benchmarks");
          else {
            const target = pages[Number(seeRef[1]) - 1] ?? "";
            if (!/Historical Invitation Trends|Tarihsel Davet Trendleri|历史邀请趋势/.test(target)) f(`cover points to page ${seeRef[1]}, which is not the Historical Invitation Trends page`);
          }
        }
        const totalLine = flat.match(/(?:TOTAL|TOPLAM|总分)[:：] ?(\d+) ?\/ ?65/);
        if (totalLine && Number(totalLine[1]) !== est) f(`cover estimate ${est} != points breakdown total ${totalLine[1]}`);
      }
      if (!caseFailed) console.log("  ✅ ok");
    }
  }
}

/** The dated snapshot benchmark straight from src/data/visa-trends.json (independent of the engine). */
function visaTrendsBenchmark(occupation: string | undefined, subclass: string): number | undefined {
  const code = occupation?.match(/(\d{6})/)?.[1];
  const rec = (visaTrends as { occupation_trends: Array<{ anzsco_code: string; estimates: Array<{ subclass: string; last_invited_point?: number; estimated_points: number }> }> }).occupation_trends.find((r) => r.anzsco_code === code);
  const e = rec?.estimates.find((x) => x.subclass === subclass);
  return e ? (e.last_invited_point ?? e.estimated_points) : undefined;
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

  // One score and one ranking (LLM stubbed with hostile output)
  await runPathwayChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Points Booster Roadmap / Points Improvement Tips (LLM stubbed with hostile output)
  await runPointsActionChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

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
