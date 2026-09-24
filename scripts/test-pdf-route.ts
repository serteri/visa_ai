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
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import type { PointsActionPlan, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { generatePremiumStrategy } from "../lib/ai/generate-premium-strategy";
import { blockedLabel, describePathwayScore, PATHWAY_SUBCLASSES } from "../lib/readiness/pathway-scores";
import { deterministicRecommendations, findOpenState } from "../lib/readiness/pathway-recommendations";
import visaTrends from "../src/data/visa-trends.json";
import { resolveAssessingAuthority } from "../lib/skills-assessment/resolve-authority";
import { confidenceLevelLabel, frictionBandDefinition, frictionBandLabel, frictionLevelDefinitionGeneric, occupationMatchLine } from "../src/lib/readiness/localization";
import { matchOccupationToStateAllSubclasses, type StateOccupationSubclass } from "../lib/state-nomination/occupation-match";
import {
  deferredFeesLine,
  MEDICAL_REGISTRATION_PROCESS,
  medicalRegistrationAmountLabel,
  medicalRegistrationFeeBreakdown,
  resolveMedicalRegistration,
} from "../lib/health-registration/img-pathways";
import {
  ANMAC_ASSESSMENT_PROCESS,
  anmacAmountLabel,
  anmacFeeCitation,
  FULL_SKILLS_ASSESSMENT_CODES,
  nursingRegistrationLine,
  resolveAnmacAssessment,
} from "../lib/health-registration/anmac-fees";
import { anmacAuthority } from "../lib/skills-assessment/authorities/anmac";
import type { PremiumStrategyResult } from "../lib/ai/strategy-schema";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import { computeEstimatedTotalAud, computePartnerTotalAud, estimateQualifier, formatEstimatedTotalLine, formatPartnerTotalLine, formatSecondInstalmentLine } from "../lib/readiness/financial-roadmap-totals";
import visaFeesData from "../src/data/visa-fees.json";
import { ENGLISH_TEST_VALIDITY_YEARS, SECOND_INSTALMENT_AUD } from "../lib/readiness/constants";

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
const PARTNER_TOTAL_LABEL: Record<Locale, string> = {
  en: "Estimated total with partner/dependants",
  tr: "Partner/bağımlılarla tahmini toplam",
  "zh-Hans": "含配偶/受抚养人的预计总计",
};
const ASSUMING_ONE_PARTNER: Record<Locale, string> = { en: "assuming one partner", tr: "bir partner", "zh-Hans": "假设有一位配偶" };
const POSSIBLE_ADDITIONAL: Record<Locale, string> = { en: "Possible additional charge", tr: "Olası ek ücret", "zh-Hans": "可能产生的额外费用" };
const AGE_LABEL: Record<Locale, string> = { en: "Age: ", tr: "Yaş: ", "zh-Hans": "年龄：" };
const NOT_SPECIFIED_AGE: Record<Locale, RegExp> = { en: /Age: ?Not ?specified/, tr: /Yaş: ?Belirtilmedi/, "zh-Hans": /年龄：?未填写/ };
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
  expectBanner: boolean,
  /** The applicant's known age: the PDF must print it, never "Not specified". Omitted for the thin client-shape summary. */
  knownAge?: string
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

  // ── Partnered total: a second line, built from the same components + the additional-applicant VAC ──
  const partnerLabel = PARTNER_TOTAL_LABEL[locale];
  const partnerLabelCount = squash(flat).split(squash(partnerLabel)).length - 1;
  if (!persona.partnered) {
    if (partnerLabelCount > 0) ctx.fail(`single applicant shows "${partnerLabel}" ${partnerLabelCount}x`);
  } else {
    const partner = computePartnerTotalAud(report.financialRoadmap);
    if (!partner) {
      ctx.fail("partnered profile: computePartnerTotalAud returned null");
    } else {
      // Independent arithmetic straight from src/data/visa-fees.json: primary total + one partner (18+), no children.
      const adult = (visaFeesData as unknown as { visas: Record<string, { vac: { partner_18_plus: number } }> }).visas[partner.subclass]?.vac.partner_18_plus;
      if (typeof adult !== "number") ctx.fail(`visa-fees.json has no partner charge for subclass ${partner.subclass}`);
      else if (partner.min !== total.min + adult || partner.max !== total.max + adult) {
        ctx.fail(`partner total ${partner.min}-${partner.max} != primary ${total.min}-${total.max} + one partner ${adult}`);
      }
      if (partner.partners !== 1 || partner.children !== 0 || !partner.assumedCounts) ctx.fail("no head-count in the input: one partner, no children, flagged as assumed");
      if (!partner.subclass) ctx.fail("partner total does not name the subclass its figures belong to");
      // Same figure in Roadmap + FAQ + guide, with the "assuming one partner" wording, in every locale
      const partnerLine = formatPartnerTotalLine(partner, locale);
      const partnerMax = partner.max.toLocaleString(locale === "tr" ? "tr-TR" : "en-AU");
      const partnerNeedle = partnerLine.slice(0, partnerLine.indexOf(partnerMax) + partnerMax.length);
      const partnerOccurrences = squash(flat).split(squash(partnerNeedle)).length - 1;
      if (partnerOccurrences < 3) ctx.fail(`partner total "${partnerNeedle}" appears ${partnerOccurrences}x (need Roadmap + FAQ + guide)`);
      if (!squash(partnerNeedle).includes(squash(ASSUMING_ONE_PARTNER[locale]))) ctx.fail(`partner total line lacks "${ASSUMING_ONE_PARTNER[locale]}"`);
      if (!squash(partnerNeedle).includes(squash(`${partner.subclass}`))) ctx.fail("partner total line does not name the subclass");
      if (!squash(partnerNeedle).includes(squash(partnerLabel))) ctx.fail(`partner total line lacks its label "${partnerLabel}"`);
      // Second instalment: its own "possible additional charge" line (Roadmap + FAQ + guide), never folded in
      const instalmentLine = formatSecondInstalmentLine(partner, locale);
      if (partner.secondInstalmentAud !== SECOND_INSTALMENT_AUD[partner.subclass]) ctx.fail("second-instalment amount is not the per-subclass constant");
      if (!instalmentLine) ctx.fail("no second-instalment line although the subclass has a constant");
      else {
        const instalmentOccurrences = squash(flat).split(squash(instalmentLine)).length - 1;
        if (instalmentOccurrences < 3) ctx.fail(`second-instalment line appears ${instalmentOccurrences}x (need Roadmap + FAQ + guide)`);
        if (!squash(instalmentLine).includes(squash(POSSIBLE_ADDITIONAL[locale]))) ctx.fail("second-instalment line is not labelled as a possible additional charge");
      }
      console.log(`  ${partnerNeedle} | occurrences=${partnerOccurrences}`);
    }
  }

  // ── Age: a known age is printed, never "Not specified" ──
  if (knownAge) {
    if (NOT_SPECIFIED_AGE[locale].test(squash(flat))) ctx.fail(`"Age: Not specified" appears although the applicant's age is ${knownAge}`);
    if (!squash(flat).includes(squash(`${AGE_LABEL[locale]}${knownAge}`))) ctx.fail(`the guide's status block does not print "${AGE_LABEL[locale]}${knownAge}"`);
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
        const expectedLabels = ranking.commonBlockReason === "skills_assessment" ? 4 : 1; // ranking x3 + snapshot + checklist; grouped points-blocked ranking rows keep their own heading
        if (n < expectedLabels) f(`the blocked label "${lbl}" appears only ${n}x (expected >= ${expectedLabels})`);
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

// ─────────────────────────────────────────────────────────────────────────────
// Unsupported labels / one authority / estimate qualifier (Phase 2d-lite)
//  - no friction level when the occupation has no invitation benchmark ("Not assessed");
//  - one confidence value, identical in the pathway table and the Signal Snapshot;
//  - "Strongest signal" never shown when every pathway is blocked;
//  - one assessing authority per occupation in the whole text;
//  - every figure from an authority fee flagged `estimated` carries "estimate pending verification",
//    including the Estimated total line.
// ─────────────────────────────────────────────────────────────────────────────

const AUTHORITY_PROFILES: Array<{ name: string; input: ReadinessInput }> = [
  {
    // General Practitioner 253111, no assessment: no benchmark, AHPRA estimated fee
    name: "a-gp-253111",
    input: { ...base, currentCountry: "Turkey", age: "34", occupation: "General Practitioner 253111", sponsorOrFamily: undefined },
  },
  { name: "a-se-261313", input: { ...base } },
  {
    name: "a-civil-233211-positive",
    input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 },
  },
];

const CONF_WORDS = Object.fromEntries(
  LOCALES.map((l) => [l, { low: confidenceLevelLabel(l, "low"), medium: confidenceLevelLabel(l, "medium"), high: confidenceLevelLabel(l, "high") }])
) as Record<Locale, { low: string; medium: string; high: string }>;
const CONF_RANK = { low: 0, medium: 1, high: 2 } as const;

const NO_BENCHMARK_PHRASE: Record<Locale, string> = {
  en: "no recent invitation benchmark is available for this occupation",
  tr: "bu meslek için yakın dönem davet referansı bulunmuyor",
  "zh-Hans": "该职业暂无近期邀请参考分",
};
const STRONGEST_LABEL: Record<Locale, string> = { en: "Strongest signal", tr: "En güçlü sinyal", "zh-Hans": "最高匹配路径" };
const ONCE_UNBLOCKED: Record<Locale, string> = {
  en: "Would be evaluated first once unblocked",
  tr: "Engel kalktığında ilk değerlendirilecek yollar",
  "zh-Hans": "解除阻碍后将优先评估",
};
const RESOURCES_HEADING: Record<Locale, string> = { en: "Official Resources", tr: "Resmi Kaynaklar", "zh-Hans": "官方资源" };

// Authority acronyms/names that must not appear for another occupation's authority (registry authorityId -> patterns)
const AUTHORITY_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "ACS", re: /\bACS\b|Australian ?Computer ?Society/ },
  { id: "EA", re: /Engineers ?Australia/ },
  { id: "VETASSESS", re: /\bVETASSESS\b/ },
  { id: "TRA", re: /\bTRA\b|Trades ?Recognition ?Australia/ },
  { id: "ANMAC", re: /\bANMAC\b/ },
  { id: "AHPRA", re: /\bAHPRA\b|Health ?Practitioner ?Regulation ?Agency/ },
  { id: "AMC", re: /\bAMC\b|Australian ?Medical ?Council/ },
  { id: "CPA", re: /CPA ?Australia/ },
  { id: "CA-ANZ", re: /\bCA ?ANZ\b|\bCAANZ\b/ },
  { id: "AACA", re: /\bAACA\b/ },
];

async function runAuthorityChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  for (const profile of AUTHORITY_PROFILES) {
    for (const locale of LOCALES) {
      const label = `authority ${profile.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const input: ReadinessInput = { ...profile.input, locale };
      const report = runReadinessEngine(input);
      const scores = report.pathwayScores!;
      const ranking = report.pathwayRanking!;
      const reportId = `authority-${profile.name}-${locale}`;
      rows.set(reportId, {
        id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
        agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
      });
      const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
      if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const pages = (await extractPdfPages(bytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
      const raw = pages.join("\n");
      await writeFile(path.join(outDir, `authority-${profile.name}-${locale}.txt`), raw);
      const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
      const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);

      // ── 1. Friction: a level only with a benchmark and a score gap ──────────
      const noBenchmark = PATHWAY_SUBCLASSES.filter((s) => scores[s].benchmark === null);
      const levels = ["LOW", "MEDIUM", "HIGH", "EXTREME"] as const;
      const notAssessedDef = sq(frictionBandDefinition(locale, "NOT_ASSESSED"));
      const notAssessedLabel = sq(frictionBandLabel(locale, "NOT_ASSESSED"));
      if (noBenchmark.length === PATHWAY_SUBCLASSES.length) {
        for (const lv of levels) {
          const def = sq(frictionBandDefinition(locale, lv));
          if (flat.includes(def)) f(`friction level ${lv} is shown although no pathway has an invitation benchmark`);
        }
        if (!flat.includes(sq(NO_BENCHMARK_PHRASE[locale]))) f("the Reality Check does not say there is no invitation benchmark");
        if (!flat.includes(notAssessedLabel)) f(`"Not assessed" label is missing ("${notAssessedLabel}")`);
        if (!flat.includes(notAssessedDef)) f("the 'Not assessed' friction definition is missing");
      } else if (noBenchmark.length === 0) {
        // Positive control: with benchmarks a real level IS shown and "Not assessed" is not
        if (!levels.some((lv) => flat.includes(sq(frictionBandDefinition(locale, lv))))) f("no friction level is shown although benchmarks exist");
        if (flat.includes(notAssessedLabel)) f("'Not assessed' is shown although benchmarks exist");
      }
      // Glossary: the friction definition says levels exist only with a benchmark and a score gap
      if (!flat.includes(sq(frictionLevelDefinitionGeneric(locale)))) f("glossary friction definition (levels only with a benchmark and a gap) is missing");
      // the sentence that contradicts the Reality Check
      if (flat.includes(sq(NO_BENCHMARK_PHRASE[locale])) && /A (?:moderate|meaningful|substantial) gap exists between your profile and/.test(flat) && noBenchmark.length === PATHWAY_SUBCLASSES.length) {
        f("a 'gap exists between your profile and recent benchmarks' definition is shown next to 'no benchmark available'");
      }

      // ── 2. Confidence: one value in the table and the Snapshot ─────────────
      const words = CONF_WORDS[locale];
      const wordRe = `(${words.high}|${words.medium}|${words.low})`;
      const tableStart = flat.search(/Structured Pathway Comparison|Vize Yolu Karşılaştırması|签证路径结构化对比/);
      const snapStart = flat.search(/Signal Snapshot|Sinyal Özeti|匹配度概览/);
      const snapMatch = snapStart >= 0 ? flat.slice(snapStart, snapStart + 900).match(new RegExp(`(?:Confidence|Güven|置信度) ?${wordRe}`)) : null;
      const snapLevel = snapMatch ? (Object.entries(words).find(([, w]) => w === snapMatch[1])?.[0] as keyof typeof CONF_RANK) : undefined;
      if (!snapLevel) f("no confidence value found in the Signal Snapshot");
      const tableLevels: Array<keyof typeof CONF_RANK> = [];
      if (tableStart >= 0) {
        const slice = flat.slice(tableStart, tableStart + 3500);
        for (const m of slice.matchAll(new RegExp(`\\((?:189|190|491|482|485|500|186|820/801)\\) ?${wordRe}`, "g"))) {
          const lv = Object.entries(words).find(([, w]) => w === m[1])?.[0] as keyof typeof CONF_RANK;
          if (lv) tableLevels.push(lv);
        }
      }
      if (tableLevels.length === 0) f("no pathway confidence found in the comparison table");
      if (snapLevel) {
        for (const lv of tableLevels) if (CONF_RANK[lv] > CONF_RANK[snapLevel]) f(`table confidence ${lv} is higher than the Snapshot's ${snapLevel}`);
        if (tableLevels.some((lv) => lv !== snapLevel)) f(`table confidence [${tableLevels}] differs from the Snapshot's ${snapLevel}`);
        if (snapLevel !== undefined && report.signalSnapshot.overallConfidence !== snapLevel) f(`Snapshot text ${snapLevel} != engine overallConfidence ${report.signalSnapshot.overallConfidence}`);
        // capped by completeness: a missing skills assessment caps at Medium
        if (!report.assessmentState.fieldsPresent.skillsAssessment && CONF_RANK[snapLevel] > CONF_RANK.medium) f("confidence exceeds Medium although the skills assessment is missing");
      }

      // ── 3. Snapshot when every pathway is blocked ──────────────────────────
      if (ranking.allBlocked) {
        if (snapStart >= 0 && flat.slice(snapStart, snapStart + 900).includes(sq(STRONGEST_LABEL[locale]))) f('"Strongest signal" is shown although every pathway is blocked');
        const status = sq(report.signalSnapshot.strongest);
        if (!flat.includes(status)) f(`Snapshot status sentence missing ("${report.signalSnapshot.strongest}")`);
        const onceIdx = flat.indexOf(sq(ONCE_UNBLOCKED[locale]));
        if (onceIdx < 0) f("'would be evaluated first once unblocked' row is missing");
        else {
          const order = orderOf(flat.slice(onceIdx, onceIdx + 500), /\((189|190|491)\)/g);
          const expected = ranking.entries.map((e) => e.subclass);
          if (JSON.stringify(order) !== JSON.stringify(expected)) f(`unblocked order [${order}] != ranking [${expected}]`);
        }
      } else if (snapStart >= 0 && !flat.slice(snapStart, snapStart + 900).includes(sq(STRONGEST_LABEL[locale]))) {
        f('"Strongest signal" is missing although a pathway is not blocked');
      }

      // ── 4. One authority per occupation in the whole text ──────────────────
      const resolved = resolveAssessingAuthority(profile.input.occupation);
      const resStart = flat.indexOf(sq(RESOURCES_HEADING[locale]));
      const body = resStart >= 0 ? flat.slice(0, resStart) : flat; // the generic "Official Resources" link list is exempt
      const named = AUTHORITY_PATTERNS.filter((a) => a.re.test(body)).map((a) => a.id);
      // A body that is part of the resolved authority's own process is not a second authority: for doctors the
      // Medical Board document has the AMC verify qualifications (PSV) and run the exams inside Ahpra
      // registration. Naming the AMC as an alternative assessing body ("AMC pathway") is still a failure.
      const PROCESS_BODIES: Record<string, string[]> = { AHPRA: ["AMC"] };
      const stray = named.filter((id) => id !== resolved.authorityId && !(PROCESS_BODIES[resolved.authorityId] ?? []).includes(id));
      if (stray.length > 0) f(`text names other authorities ${stray} although ${profile.input.occupation} resolves to ${resolved.authorityId}`);
      if (/AMC ?pathway/i.test(body)) f(`text frames the AMC as an assessing pathway ("AMC pathway") although ${profile.input.occupation} resolves to ${resolved.authorityId}`);
      if (!named.includes(resolved.authorityId)) f(`the resolved authority ${resolved.authorityId} is never named`);

      // ── 5. Estimate qualifier next to every figure from an estimated fee ───
      const qualifier = sq(estimateQualifier(locale));
      const estimatedItems = report.financialRoadmap.filter((i) => i.estimated === true);
      const total = computeEstimatedTotalAud(report.financialRoadmap);
      if (estimatedItems.length > 0) {
        for (const item of estimatedItems) {
          // The label carries the qualifier (from the data flag)...
          if (!item.amountLabel.includes(estimateQualifier(locale)) && !item.amountLabel.includes("估算")) f(`roadmap item "${item.category}" is flagged estimated but its amount label has no qualifier`);
          // ...and every section quoting the figure quotes that label: Roadmap + guide cost list + FAQ answer.
          const labelCount = flat.split(sq(item.amountLabel)).length - 1;
          if (labelCount < 3) f(`estimated fee "${item.amountLabel}" appears ${labelCount}x with its qualifier, expected in the Roadmap, guide cost list and FAQ`);
          // No skills-assessment sentence quotes the figure without the qualifier
          const fig = String(item.amountMin).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          const bare = new RegExp(`(?:Skills assessment|Beceri değerlendirmesi|技能评估)[^.。;]{0,90}?${fig.replace(",", "[,.]")}(?!\\d)(?![^]{0,4}[(（])`, "gi");
          for (const m of flat.matchAll(bare)) {
            const tail = flat.slice(m.index! + m[0].length, m.index! + m[0].length + 60);
            if (!sq(tail).includes(qualifier) && !sq(tail).includes("估算")) f(`fee ${fig} quoted without the qualifier: "...${m[0].slice(-40)}${tail.slice(0, 30)}..."`);
          }
        }
        const totalLine = sq(formatEstimatedTotalLine(total!, locale));
        const totalCount = flat.split(totalLine.replace(/\.$/, "")).length - 1;
        if (totalCount < 3) f(`Estimated total line with the estimate qualifier appears ${totalCount}x (need Roadmap + FAQ + guide)`);
        if (!totalLine.includes(qualifier)) f("Estimated total line lacks the estimate qualifier");
      } else if (flat.includes(qualifier)) {
        f("the estimate qualifier is shown although no fee is flagged estimated");
      }
      if (!caseFailed) console.log("  ✅ ok");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Friction level from the actual score gap (Phase 2e)
//
// Friction is derived ONLY from gapBase (benchmark - current score). Independent copy of the threshold
// table, on purpose: <= 0 LOW, 1-15 MEDIUM, 16-25 HIGH, > 25 EXTREME; no benchmark = NOT_ASSESSED.
// The table, the Pathway Strength section, the LLM input (the report) and the explanatory sentences under
// the table must all agree with it.
// ─────────────────────────────────────────────────────────────────────────────

type FrictionName = "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | "NOT_ASSESSED";

function expectedFriction(gapBase: number | null): FrictionName {
  if (gapBase === null) return "NOT_ASSESSED";
  if (gapBase <= 0) return "LOW";
  if (gapBase <= 15) return "MEDIUM";
  if (gapBase <= 25) return "HIGH";
  return "EXTREME";
}

const FRICTION_PROFILES: Array<{ name: string; input: ReadinessInput; expected?: Record<string, FrictionName> }> = [
  // Score 70; benchmarks 95/85/75 -> gaps 25/15/5
  { name: "f-se-261313-gaps-25-15-5", input: { ...base }, expected: { "189": "HIGH", "190": "MEDIUM", "491": "MEDIUM" } },
  // Civil 233211 with Superior English: score 70 is AT the 491 benchmark (gap 0) -> LOW; 190 gap 10, 189 gap 20
  {
    name: "f-civil-233211-at-benchmark",
    input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "superior", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 },
    expected: { "189": "HIGH", "190": "MEDIUM", "491": "LOW" },
  },
  // GP 253111: no benchmark for the occupation
  { name: "f-gp-253111-no-benchmark", input: { ...base, currentCountry: "Turkey", age: "34", occupation: "General Practitioner 253111", sponsorOrFamily: undefined }, expected: { "189": "NOT_ASSESSED", "190": "NOT_ASSESSED", "491": "NOT_ASSESSED" } },
  // Large gaps: score 50 -> 491 gap 20 HIGH, 190 gap 30 EXTREME, 189 EXTREME
  { name: "f-civil-233211-large-gaps", expected: { "189": "EXTREME", "190": "EXTREME", "491": "HIGH" }, input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 } },
];

const FRICTION_NAMES: FrictionName[] = ["LOW", "MEDIUM", "HIGH", "EXTREME", "NOT_ASSESSED"];
const COMPOUNDING: Record<Locale, RegExp> = { en: /multiple compounding factors/, tr: /birden fazla faktör/, "zh-Hans": /多个不利因素/ };

async function runFrictionChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  for (const profile of FRICTION_PROFILES) {
    for (const locale of LOCALES) {
      const label = `friction ${profile.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const input: ReadinessInput = { ...profile.input, locale };
      const report = runReadinessEngine(input);
      const scores = report.pathwayScores!;
      const expected = {} as Record<string, FrictionName>;
      for (const s of PATHWAY_SUBCLASSES) expected[s] = expectedFriction(scores[s].gapBase);
      if (profile.expected) {
        for (const s of PATHWAY_SUBCLASSES) if (expected[s] !== profile.expected[s]) f(`${s}: gap ${scores[s].gapBase} gives ${expected[s]}, the profile was designed for ${profile.expected[s]}`);
      }

      // Data: frictionAnalysis, pathwayStrengthComparison and the LLM input (this report) carry the same level
      for (const s of PATHWAY_SUBCLASSES) {
        const fa = report.frictionAnalysis.find((x) => x.pathway === s)?.frictionScore;
        const ps = report.pathwayStrengthComparison.find((x) => x.subclass === s)?.friction;
        if (fa !== expected[s]) f(`${s}: frictionAnalysis ${fa} != ${expected[s]} (gap ${scores[s].gapBase})`);
        if (ps !== expected[s].toLowerCase()) f(`${s}: pathwayStrengthComparison ${ps} != ${expected[s].toLowerCase()}`);
      }
      const llmInput = JSON.stringify(report);
      for (const s of PATHWAY_SUBCLASSES) {
        if (!llmInput.includes(`"friction":"${expected[s].toLowerCase()}"`)) f(`${s}: the report handed to the LLM does not carry friction ${expected[s].toLowerCase()}`);
      }

      const reportId = `friction-${profile.name}-${locale}`;
      rows.set(reportId, {
        id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
        agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
      });
      const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
      if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const pages = (await extractPdfPages(bytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
      const raw = pages.join("\n");
      await writeFile(path.join(outDir, `friction-${profile.name}-${locale}.txt`), raw);
      const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
      const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);

      // ── The table ────────────────────────────────────────────────────────
      const tableStart = flat.search(/Structured Pathway Comparison|Vize Yolu Karşılaştırması|签证路径结构化对比/);
      const tableEnd = flat.indexOf("Reality Check", tableStart) > 0 ? tableStart + 2500 : tableStart + 2500;
      const tableText = tableStart >= 0 ? flat.slice(tableStart, tableEnd) : "";
      const labelOf = (lv: FrictionName) => sq(frictionBandLabel(locale, lv));
      const words = CONF_WORDS[locale];
      const shown: Record<string, FrictionName> = {};
      for (const s of PATHWAY_SUBCLASSES) {
        const re = new RegExp(`\\(${s}\\) ?(?:${words.high}|${words.medium}|${words.low}) ?(${FRICTION_NAMES.map((lv) => labelOf(lv).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
        const m = tableText.match(re);
        const lv = m ? FRICTION_NAMES.find((n) => labelOf(n) === m[1]) : undefined;
        if (!lv) f(`${s}: no friction label found in the comparison table`);
        else {
          shown[s] = lv;
          if (lv !== expected[s]) f(`${s}: table shows ${lv} but the gap ${scores[s].gapBase} means ${expected[s]}`);
        }
      }

      // ── The sentences under the table match the levels actually shown ────
      const presentLevels = new Set(Object.values(shown));
      const sentenceZone = tableText;
      for (const lv of FRICTION_NAMES) {
        const def = sq(frictionBandDefinition(locale, lv));
        const isShown = sentenceZone.includes(def);
        if (presentLevels.has(lv) && !isShown) f(`level ${lv} is in the table but its sentence is missing`);
        if (!presentLevels.has(lv) && isShown) f(`sentence for ${lv} is shown but no pathway has that level`);
      }
      const compoundingShown = COMPOUNDING[locale].test(sentenceZone);
      if (compoundingShown !== presentLevels.has("EXTREME")) f(`"multiple compounding factors" wording ${compoundingShown ? "shown" : "absent"} while EXTREME ${presentLevels.has("EXTREME") ? "is" : "is not"} in the table`);
      if (/multiple compounding factors/.test(flat.slice(tableStart, tableStart + 2500)) && !presentLevels.has("EXTREME")) f("'multiple compounding factors' shown without an EXTREME level");

      // ── Pathway Strength section (en): same level per pathway ────────────
      if (locale === "en") {
        for (const s of PATHWAY_SUBCLASSES) {
          const secStart = flat.indexOf("Pathway Strength Comparison", flat.indexOf("Pathway Strength Comparison") + 1) > 0 ? flat.lastIndexOf("Pathway Strength Comparison") : flat.indexOf("Pathway Strength Comparison");
          const m = flat.slice(secStart).match(new RegExp(`\\(${s}\\)[^]{0,300}?Friction: (Low|Medium|High|Extreme|Not assessed)`));
          if (!m) { f(`${s}: no Friction line found in the Pathway Strength section`); continue; }
          const got = m[1].toUpperCase().startsWith("NOT") ? "NOT_ASSESSED" : m[1].toUpperCase();
          if (got !== expected[s]) f(`${s}: Pathway Strength shows friction ${got} but the gap means ${expected[s]}`);
        }
      }
      if (!caseFailed) console.log("  ✅ ok");
    }
  }
}

/**
 * Production PDFs come from ONE place: the server route (app/api/reports/[reportId]/pdf). A client component that
 * imports the jsPDF generator would reintroduce a browser-built PDF (no stored profile -> "Age: Not specified",
 * no partnered total), so no "use client" file may import generateReadinessPDF / generate-pdf.
 */
function runClientPdfImportCheck(fail: (msg: string) => void) {
  console.log("\n=== no client component imports the PDF generator ===");
  const root = process.cwd();
  const skip = new Set(["node_modules", ".next", ".git", ".claude", "scripts", "scratch", "temp_tests"]);
  const files: string[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  })(root);
  let clientFiles = 0;
  let bad = 0;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    // "use client" must be the first statement (comments allowed before it)
    const withoutLeadingComments = src.replace(/^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*/, "");
    if (!/^\s*["']use client["']/.test(withoutLeadingComments)) continue;
    clientFiles++;
    if (/generateReadinessPDF|readiness\/generate-pdf|from ["'][^"']*\/generate-pdf["']/.test(src)) {
      bad++;
      fail(`client component ${path.relative(root, file)} imports the PDF generator -- download from /api/reports/[reportId]/pdf instead`);
    }
  }
  const helper = readFileSync(path.join(root, "lib/client/download-report-pdf.ts"), "utf8");
  if (!helper.includes("/api/reports/")) fail("lib/client/download-report-pdf.ts no longer downloads from /api/reports/[reportId]/pdf");
  const form = readFileSync(path.join(root, "app/[locale]/(main)/full-check/full-check-waitlist-form.tsx"), "utf8");
  if (!form.includes("downloadReportPdf(")) fail("full-check-waitlist-form.tsx does not download through the server route helper");
  if (!/role="alert"/.test(form) || !/setPdfError\(pdfErrorMessage\)/.test(form)) fail("full-check-waitlist-form.tsx shows no visible error when the PDF download fails");
  if (bad === 0) console.log(`  ✅ ${clientFiles} client components checked, none imports the PDF generator`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Occupation <-> state occupation-list match line (Phase 2b): the State Nomination Tracker's per-state
// note now carries an additive "Occupation list check: ..." line from
// lib/state-nomination/occupation-match.ts's matchOccupationToState. Checked against real PDF text for two
// occupations that land differently across states: Software Engineer 261313 (MATCH in ACT/QLD, NOT_ON_LIST
// in NT/WA, UNIT_GROUP_ONLY in NSW, NO_DATA in SA, NOT_APPLICABLE in TAS/VIC) and Civil Engineer 233211
// (MATCH in ACT/QLD/WA, NOT_ON_LIST in NT).
// ─────────────────────────────────────────────────────────────────────────────

const OCCUPATION_MATCH_PROFILES: Array<{ name: string; input: ReadinessInput }> = [
  { name: "o-se-261313", input: { ...base } },
  {
    name: "o-civil-233211",
    input: { ...base, currentCountry: "Turkey", age: "35", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 5 },
  },
];

const STATE_PREFERRED_SUBCLASSES: Record<string, StateOccupationSubclass[]> = {
  ACT: ["190", "491"],
  NT: ["491", "190"],
  QLD: ["190"],
  WA: ["190", "491"],
  NSW: ["190"],
  SA: ["190", "491"],
  TAS: ["491", "190"],
  VIC: ["190"],
};

async function runOccupationMatchChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  for (const profile of OCCUPATION_MATCH_PROFILES) {
    for (const locale of LOCALES) {
      const label = `occupation-match ${profile.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const input: ReadinessInput = { ...profile.input, locale };
      const report = runReadinessEngine(input);
      const states = report.stateNominationTracker?.states ?? [];
      if (states.length !== 8) { f(`expected 8 states in the tracker, got ${states.length}`); continue; }

      const anzscoCode = input.occupation!.match(/(\d{6})/)![1];
      const reportId = `occ-match-${profile.name}-${locale}`;
      rows.set(reportId, {
        id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
        agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
      });
      const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
      if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const pages = (await extractPdfPages(bytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
      const raw = pages.join("\n");
      await writeFile(path.join(outDir, `occ-match-${profile.name}-${locale}.txt`), raw);
      const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
      const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : t);

      for (const state of states) {
        // Every one of the 8 states must carry a note -- the occupation resolves to a real ANZSCO code here.
        if (!state.occupationMatchNote) { f(`${state.code}: no occupationMatchNote on the engine's own state object`); continue; }

        // Independently recompute the expected line (the same function the engine calls) and require it to
        // appear verbatim in the extracted PDF text -- proves the route -> PDF pipeline actually surfaces it,
        // not just that the engine computed it.
        const subclasses = STATE_PREFERRED_SUBCLASSES[state.code];
        if (!subclasses) { f(`${state.code}: no known preferredVisaTypes fixture for this test`); continue; }
        const expectedLine = occupationMatchLine(locale, matchOccupationToStateAllSubclasses(anzscoCode, state.code, subclasses));
        if (state.occupationMatchNote !== expectedLine) {
          f(`${state.code}: engine's occupationMatchNote != independently recomputed line\n    engine:   "${state.occupationMatchNote}"\n    expected: "${expectedLine}"`);
        }
        if (!sq(flat).includes(sq(expectedLine))) {
          f(`${state.code}: expected line not found verbatim in the extracted PDF text: "${expectedLine.slice(0, 120)}..."`);
        }
      }
      if (!caseFailed) console.log("  ✅ ok");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Medical registration (GP 253111) + 191 income requirement. The AHPRA line must quote the Medical Board fees
// from src/data/health-registration/img-pathways.json with their "effective 1 August 2026" citation; the AMC /
// ECFMG / college line must never carry a number (the source document publishes none); and the 491 -> 191
// Bridge to PR text must describe the ATO notices-of-assessment requirement with no dollar figure (the subclass
// 191 document: "There is no minimum income requirement").
// ─────────────────────────────────────────────────────────────────────────────

const GP_PROFILE: ReadinessInput = {
  ...base,
  currentCountry: "Turkey",
  age: "38",
  occupation: "General Practitioner 253111",
  occupationConfirmed: "yes",
  englishLevel: "competent",
  qualificationLevel: "Bachelor's Degree",
  sponsorOrFamily: undefined,
  offshoreExperienceYears: 6,
  migrationGoals: ["direct_pr"],
};

async function runMedicalRegistrationChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const medical = resolveMedicalRegistration({ anzscoCode: "253111" });
  if (medical.pathwayId !== "expedited-specialist" || medical.totalAud !== 1661 + 1102) {
    fail(`GP 253111 should resolve to the Expedited Specialist pathway at AUD 2,763 (1,661 + 1,102); got ${medical.pathwayId} AUD ${medical.totalAud}`);
  }
  for (const locale of LOCALES) {
    const label = `medical-registration gp-253111/${locale}`;
    console.log(`\n=== ${label} ===`);
    let caseFailed = false;
    const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
    const input: ReadinessInput = { ...GP_PROFILE, locale };
    const report = runReadinessEngine(input);

    // Engine-level: the roadmap rows themselves.
    const skills = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
    // src/lib/readiness-engine.ts renders "AUD" as "澳元" in zh-Hans amount cells.
    const expectedAmount = locale === "zh-Hans" ? medicalRegistrationAmountLabel(medical).replace(/AUD/g, "澳元") : medicalRegistrationAmountLabel(medical);
    const expectedBreakdown = medicalRegistrationFeeBreakdown(medical, locale);
    if (!skills) f("no skills_assessment row in the Financial Roadmap");
    else {
      if (skills.amountLabel !== expectedAmount) f(`AHPRA row amount is "${skills.amountLabel}", expected "${expectedAmount}"`);
      if (skills.amountMin !== 2763 || skills.amountMax !== 2763 || skills.estimated) f(`AHPRA row must be an exact, non-estimated AUD 2,763 (got ${skills.amountMin}-${skills.amountMax}, estimated=${skills.estimated})`);
      if (!skills.explanation.startsWith(expectedBreakdown)) f(`AHPRA row explanation must open with the cited fee breakdown "${expectedBreakdown}"`);
      if (/2[,.]?500|\b850\b/.test(`${skills.amountLabel} ${skills.explanation}`)) f("AHPRA row still carries the old AUD 2,500 / 850 placeholder");
    }
    const deferred = deferredFeesLine(medical, locale);
    const deferredRow = report.financialRoadmap.find((i) => i.category === deferred.category);
    if (!deferredRow) f("no separate AMC / ECFMG / college row in the Financial Roadmap");
    else {
      if (deferredRow.kind !== undefined || deferredRow.amountMin !== undefined || deferredRow.amountMax !== undefined) f("the AMC / ECFMG / college row must carry no kind and no amount (it must never enter a total)");
      if (/\d/.test(`${deferredRow.amountLabel} ${deferredRow.explanation}`)) f(`the AMC / ECFMG / college row shows a number: "${deferredRow.amountLabel}"`);
    }

    // 191 income requirement (Bridge to PR), engine level.
    const to191 = report.progressionPathways.find((p) => p.from === "491" && p.to === "191");
    if (!to191) f("no 491 -> 191 Bridge to PR item for this profile");
    else {
      if (!/notices of assessment/.test(to191.explanation)) f(`191 item does not describe the ATO notices of assessment requirement: "${to191.explanation}"`);
      if (/53[,.\s]?900|AUD\s*\d|\$\s*\d|\d[\d,.]*\s*澳元/.test(to191.explanation)) f(`191 item still states an income figure: "${to191.explanation}"`);
      if (!/(3 years|3 yıl|3 年)/.test(to191.explanation)) f("191 item lost the 3-year designated regional area requirement");
    }

    // PDF-level: the same text must reach the real route's PDF output.
    const reportId = `medical-${locale}`;
    rows.set(reportId, {
      id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
      agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
    });
    const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
    if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const pages = (await extractPdfPages(bytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
    const raw = pages.join("\n");
    await writeFile(path.join(outDir, `medical-gp-253111-${locale}.txt`), raw);
    const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
    const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : flatten(t));
    const has = (t: string) => sq(flat).includes(sq(t));

    if (!has(expectedAmount)) f(`AHPRA amount not found in the PDF: "${expectedAmount}"`);
    if (!has(expectedBreakdown)) f(`AHPRA fee breakdown + citation not found verbatim in the PDF: "${expectedBreakdown}"`);
    if (!has("effective 1 August 2026")) f('"effective 1 August 2026" citation missing from the PDF');
    for (const n of ["2,763", "1,661", "1,102"]) if (!flat.includes(n)) f(`Medical Board figure ${n} missing from the PDF`);
    if (/AUD\s*2[,.]?500\b/.test(flat)) f("PDF still shows the old AUD 2,500 college placeholder");
    if (!has(deferred.amountLabel)) f(`AMC / ECFMG / college line not found in the PDF: "${deferred.amountLabel}"`);
    // Whatever follows the deferred line's category up to its amount text must hold no figure either.
    const at = sq(flat).indexOf(sq(deferred.category));
    if (at >= 0) {
      const window = sq(flat).slice(at, at + sq(deferred.category).length + sq(deferred.amountLabel).length + 20);
      if (/\d{2,}|AUD\s*\d|\$\s*\d/.test(window.replace(sq(deferred.category), ""))) f(`AMC / ECFMG / college line is followed by a number in the PDF: "${window}"`);
    } else f("AMC / ECFMG / college category not found in the PDF");
    const processLead = MEDICAL_REGISTRATION_PROCESS[locale].split(locale === "zh-Hans" ? "。" : ". ")[0];
    if (!has(processLead)) f(`sourced process description not found in the PDF (FAQ / guide): "${processLead}"`);
    if (/53[,.\s]?900/.test(flat)) f("PDF still mentions the 53,900 income threshold");
    if (!/notices\s*of\s*assessment/.test(flat)) f("PDF does not describe the 191 ATO notices of assessment requirement");

    if (!caseFailed) console.log(`  ✅ ok (AHPRA ${expectedAmount.slice(0, 60)}...; AMC/college line unpriced; 191 = ATO notices)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Nursing skills assessment (Anmac). A Registered Nurse (Medical) 254418 persona must show the Anmac Full skills
// assessment AUD 595 with its Anmac.pdf p.26 citation and the stated 6–8 week wait in the real PDF; none of the 15
// ANMAC occupations may still carry the old AUD 1,000 placeholder; Enrolled Nurse (overseas) gets no amount.
// ─────────────────────────────────────────────────────────────────────────────

const NURSE_PROFILE: ReadinessInput = {
  ...base,
  currentCountry: "United Kingdom",
  age: "31",
  occupation: "Registered Nurse (Medical) 254418",
  occupationConfirmed: "yes",
  englishLevel: "proficient",
  qualificationLevel: "Bachelor's Degree",
  sponsorOrFamily: undefined,
  offshoreExperienceYears: 5,
  migrationGoals: ["direct_pr"],
};

async function runNursingChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  // Registry: no placeholder left.
  for (const p of anmacAuthority.pathways) {
    for (const fee of p.fees) {
      if (fee.amountAUD === 1000 || fee.estimated) fail(`anmac.ts pathway ${p.pathwayId} still carries the AUD 1,000 / estimated placeholder`);
    }
    if (p.processingTimeWeeks) fail(`anmac.ts pathway ${p.pathwayId} has a processingTimeWeeks the document does not state`);
  }

  // Engine: every one of the 15 ANMAC occupations, overseas-qualified and Australian-qualified.
  let checked = 0;
  for (const occ of anmacAuthority.occupations) {
    for (const qualificationAwardedInAustralia of [false, true]) {
      const report = runReadinessEngine({ ...NURSE_PROFILE, occupation: `${occ.title} ${occ.anzscoCode}`, qualificationAwardedInAustralia, locale: "en" });
      const row = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
      const label = `${occ.anzscoCode} ${occ.title} (${qualificationAwardedInAustralia ? "AU-qualified" : "overseas"})`;
      checked++;
      if (!row) { fail(`${label}: no skills_assessment row`); continue; }
      if (!/ANMAC/.test(row.category)) fail(`${label}: skills row is not the ANMAC row: "${row.category}"`);
      if (row.amountMin === 1000 || row.amountMax === 1000 || /1[,.]?000\b/.test(row.amountLabel) || row.estimated) fail(`${label}: still shows the AUD 1,000 placeholder ("${row.amountLabel}")`);
      if (/12 wk|REASONABLE PLACEHOLDER|Estimate only/i.test(row.explanation)) fail(`${label}: explanation still carries the placeholder wording`);
      const expected = qualificationAwardedInAustralia ? 395 : FULL_SKILLS_ASSESSMENT_CODES.has(occ.anzscoCode!) ? 595 : undefined;
      if (row.amountMin !== expected || row.amountMax !== expected) fail(`${label}: amount ${row.amountMin}-${row.amountMax}, expected ${expected ?? "none (needs human verification)"}`);
      if (expected === undefined && !/needs human verification/.test(row.explanation)) fail(`${label}: unmapped row must say "needs human verification"`);
    }
  }
  console.log(`\n=== nursing: ${checked} ANMAC occupation/qualification combinations checked at engine level ===`);

  const full = resolveAnmacAssessment({ anzscoCode: "254418" });
  if (full.assessmentId !== "full" || full.fee?.amountAud !== 595) fail(`254418 should resolve to the Full skills assessment AUD 595; got ${full.assessmentId} ${full.fee?.amountAud}`);

  for (const locale of LOCALES) {
    const label = `nursing rn-254418/${locale}`;
    console.log(`\n=== ${label} ===`);
    let caseFailed = false;
    const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
    const input: ReadinessInput = { ...NURSE_PROFILE, locale };
    const report = runReadinessEngine(input);
    const skills = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
    // src/lib/readiness-engine.ts renders "AUD" as "澳元" in zh-Hans amount cells.
    const expectedAmount = locale === "zh-Hans" ? anmacAmountLabel(full, locale).replace(/AUD/g, "澳元") : anmacAmountLabel(full, locale);
    const citation = locale === "tr" ? "Anmac.pdf, s.26" : locale === "zh-Hans" ? "Anmac.pdf，第 26 页" : "Anmac.pdf, p.26";
    if (!skills) f("no skills_assessment row");
    else {
      if (skills.amountLabel !== expectedAmount) f(`ANMAC row amount "${skills.amountLabel}", expected "${expectedAmount}"`);
      if (skills.amountMin !== 595 || skills.amountMax !== 595 || skills.estimated) f(`ANMAC row must be an exact, non-estimated AUD 595 (got ${skills.amountMin}-${skills.amountMax}, estimated=${skills.estimated})`);
      if (!skills.explanation.includes(citation)) f(`ANMAC row explanation lacks the "${citation}" citation`);
      if (!skills.explanation.includes(anmacFeeCitation(full.fee!, locale))) f(`ANMAC row explanation lacks "${anmacFeeCitation(full.fee!, locale)}"`);
    }
    const registration = nursingRegistrationLine(locale);
    const regRow = report.financialRoadmap.find((i) => i.category === registration.category);
    if (!regRow) f("no separate nursing registration (Ahpra/NMBA) row");
    else if (regRow.kind !== undefined || regRow.amountMin !== undefined) f("nursing registration row must carry no kind and no amount (never in a total)");

    const reportId = `nursing-${locale}`;
    rows.set(reportId, {
      id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
      agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
    });
    const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
    if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const pages = (await extractPdfPages(bytes)).map((p) => p.replace(/L o g i V i s a\s*/g, "").replace(/\d+ \/ \d+\s*Generated by[^\n]*\n?/g, "").replace(/-- \d+ of \d+ --/g, ""));
    const raw = pages.join("\n");
    await writeFile(path.join(outDir, `nursing-rn-254418-${locale}.txt`), raw);
    const flat = locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
    const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : flatten(t));
    const has = (t: string) => sq(flat).includes(sq(t));

    if (!has(expectedAmount)) f(`ANMAC amount not found in the PDF: "${expectedAmount}"`);
    if (!has(anmacFeeCitation(full.fee!, locale))) f(`ANMAC fee + citation not found verbatim in the PDF: "${anmacFeeCitation(full.fee!, locale)}"`);
    if (!has("6–8")) f("stated 6–8 week wait time missing from the PDF");
    // A standalone AUD 1,000 -- not the start of a range such as the RMA line's "AUD 1,000–2,500".
    if (/AUD\s*1[,.]?000\b(?!\s*[–-]\s*\d)|澳元\s*1[,.]?000\b(?!\s*[–-]\s*\d)|\b1[,.]?000\s*澳元/.test(flat)) f("PDF still shows the old AUD 1,000 placeholder");
    if (/REASONABLE PLACEHOLDER|Estimate only -- verify current processing/i.test(flat)) f("PDF still carries the placeholder wording");
    const processLead = ANMAC_ASSESSMENT_PROCESS[locale].split(locale === "zh-Hans" ? "。" : ". ")[0];
    if (!has(processLead)) f(`sourced Anmac process description not found in the PDF (FAQ / guide): "${processLead}"`);
    if (!has(registration.category)) f(`nursing registration line not found in the PDF: "${registration.category}"`);

    if (!caseFailed) console.log(`  ✅ ok (ANMAC ${expectedAmount}, ${citation}, 6–8 weeks; registration line unpriced except AUD 410)`);
  }
}

/**
 * CPA Australia prices its qualification assessment by where the applicant applies from (onshore AUD 565, offshore
 * AUD 514, Singapore AUD 560). The report must quote the applicant's own figure -- read from the PDF bytes, not the
 * report object. Also: an Occupational Therapist's PDF names the assessing body OTC, never the professional
 * association (Occupational Therapy Australia).
 */
async function runLocationFeeAndOtcChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const accountant: ReadinessInput = { ...base, occupation: "Accountant (General) 221111", occupationConfirmed: "yes", qualificationLevel: "Bachelor's Degree", sponsorOrFamily: undefined, offshoreExperienceYears: 3 };
  const cases: Array<{ name: string; currentCountry: string; expected: number; other: number[]; locales: readonly Locale[] }> = [
    { name: "offshore-IN", currentCountry: "IN", expected: 514, other: [565, 560], locales: LOCALES },
    { name: "onshore-AU", currentCountry: "AU", expected: 565, other: [514, 560], locales: LOCALES },
    { name: "onshore-Australia-name", currentCountry: "Australia", expected: 565, other: [514, 560], locales: ["en"] },
    { name: "singapore-SG", currentCountry: "SG", expected: 560, other: [565, 514], locales: ["en"] },
  ];
  const render = async (reportId: string, input: ReadinessInput, report: ReadinessReport, locale: Locale, file: string) => {
    rows.set(reportId, {
      id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
      agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
    });
    const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
    if (res.status !== 200) return null;
    const raw = (await extractPdfPages(new Uint8Array(await res.arrayBuffer()))).join("\n");
    await writeFile(path.join(outDir, file), raw);
    return locale === "zh-Hans" ? squashAll(raw) : flatten(raw);
  };

  for (const c of cases) {
    for (const locale of c.locales) {
      const label = `cpa ${c.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const input: ReadinessInput = { ...accountant, currentCountry: c.currentCountry, locale };
      const report = runReadinessEngine(input);
      const row = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
      if (!row || !/CPA/.test(row.category)) { f(`no CPA skills_assessment row (got "${row?.category}")`); continue; }
      if (row.amountMin !== c.expected || row.amountMax !== c.expected) f(`roadmap amount ${row.amountMin}-${row.amountMax}, expected ${c.expected}`);
      const flat = await render(`cpa-${c.name}-${locale}`, input, report, locale, `cpa-${c.name}-${locale}.txt`);
      if (flat === null) { f("route did not return the PDF"); continue; }
      // zh-Hans renders "AUD" as "澳元" in amount cells.
      const amount = (n: number) => new RegExp(`(AUD|澳元)\\s*${n}\\b|\\b${n}\\s*澳元`);
      if (!amount(c.expected).test(flat)) f(`PDF does not show AUD ${c.expected}`);
      for (const n of c.other) if (amount(n).test(flat)) f(`PDF shows AUD ${n} (another location's CPA fee)`);
      if (!caseFailed) console.log(`  ✅ ok (current country ${c.currentCountry} -> CPA AUD ${c.expected} in the PDF)`);
    }
  }

  const label = "otc 252411/en";
  console.log(`\n=== ${label} ===`);
  const input: ReadinessInput = { ...base, occupation: "Occupational Therapist 252411", occupationConfirmed: "yes", sponsorOrFamily: undefined, locale: "en" };
  const report = runReadinessEngine(input);
  const flat = await render("otc-252411-en", input, report, "en", "otc-252411-en.txt");
  if (flat === null) fail(`${label}: route did not return the PDF`);
  else {
    let caseFailed = false;
    if (!/Occupational Therapy Council of Australia/.test(flat)) { caseFailed = true; fail(`${label}: PDF does not name the Occupational Therapy Council of Australia`); }
    if (/Occupational Therapy Australia|otaus\.com\.au/.test(flat)) { caseFailed = true; fail(`${label}: PDF names Occupational Therapy Australia (the professional association) as the assessing body`); }
    if (!caseFailed) console.log("  ✅ ok (assessing body: Occupational Therapy Council of Australia)");
  }
}

/**
 * The 5 occupations where the Skills Assessment Finder and the report used to name different assessing authorities.
 * Each PDF must name the authority the Home Affairs skilled occupation list (and the authority's own document) gives,
 * matching the tool page -- and not the body it used to show.
 */
async function runToolPageAuthorityChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const cases = [
    { occupation: "External Auditor 221213", id: "CPA", name: "CPA Australia Ltd", not: /Chartered Accountants Australia and New Zealand \(CA-ANZ\)/ },
    { occupation: "Financial Market Dealer 222211", id: "VETASSESS", name: "Vocational Education and Training Assessment Services", not: /CPA Australia Ltd/ },
    { occupation: "Landscape Architect 232112", id: "VETASSESS", name: "Vocational Education and Training Assessment Services", not: /Architects Accreditation Council/ },
    { occupation: "Metal Fabricator 322311", id: "TRA", name: "Trades Recognition Australia", not: /General Professional Authority/ },
    { occupation: "Airconditioning and Refrigeration Mechanic 342111", id: "TRA", name: "Trades Recognition Australia", not: /General Professional Authority/ },
  ];
  for (const c of cases) {
    const code = c.occupation.slice(-6);
    const label = `authority ${code}/en`;
    console.log(`\n=== ${label} ===`);
    let caseFailed = false;
    const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
    const input: ReadinessInput = { ...base, occupation: c.occupation, occupationConfirmed: "yes", sponsorOrFamily: undefined, locale: "en" };
    const report = runReadinessEngine(input);
    const row = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
    if (!row?.category.includes(`(${c.id})`)) f(`roadmap skills row is "${row?.category}", expected ${c.id}`);
    const reportId = `authority-${code}-en`;
    rows.set(reportId, {
      id: reportId, email: "qa@example.com", locale: "en", report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
      agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
    });
    const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
    if (res.status !== 200) { f(`route returned HTTP ${res.status}`); continue; }
    const raw = (await extractPdfPages(new Uint8Array(await res.arrayBuffer()))).join("\n");
    await writeFile(path.join(outDir, `authority-${code}-en.txt`), raw);
    const flat = flatten(raw);
    if (!flat.includes(`${c.name} (${c.id})`)) f(`PDF does not name "${c.name} (${c.id})"`);
    if (c.not.test(flat)) f(`PDF still names ${c.not.source}`);
    if (!caseFailed) console.log(`  ✅ ok (${c.name} (${c.id}))`);
  }
}

/**
 * (1) The Financial Roadmap's skills-assessment sentence ("Skills assessment (<authority>): ...") is built from the
 * roadmap row's category. It must read as one clean label in every language: no "((by Assessing Authority))" (the
 * row with no priced pathway -- VETASSESS) and no "技能评估（技能评估 — ...）" (ANMAC / AHPRA rows in zh-Hans).
 * (2) TRA occupations the TRA guidelines put on the Offshore Skills Assessment Program (OSAP) are quoted the OSAP fee,
 * not the standard AUD 795 MSA: every applicant for the four licensed occupations (pp.1-2, 4, 7-10), and applicants
 * whose passport is listed for the occupation (p.3, pp.7-10).
 */
async function runRoadmapLabelAndOsapChecks(
  GET: (req: Request, ctx: { params: Promise<{ reportId: string }> }) => Promise<Response>,
  rows: Map<string, Record<string, unknown>>,
  outDir: string,
  fail: (msg: string) => void
) {
  const render = async (reportId: string, input: ReadinessInput, locale: Locale) => {
    const report = runReadinessEngine(input);
    rows.set(reportId, {
      id: reportId, email: "qa@example.com", locale, report_json: JSON.parse(JSON.stringify(report)), input_json: JSON.parse(JSON.stringify(input)),
      agent_id: null, is_unlocked: true, full_name: "Test Persona", preview_data: null,
    });
    const res = await GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });
    if (res.status !== 200) return { report, flat: null as string | null };
    const raw = (await extractPdfPages(new Uint8Array(await res.arrayBuffer()))).join("\n");
    await writeFile(path.join(outDir, `${reportId}.txt`), raw);
    return { report, flat: locale === "zh-Hans" ? squashAll(raw) : flatten(raw) };
  };
  const doubled = /\(\s*\(|（\s*（|技能评估（\s*技能评估|Skills assessment \(\s*Skills Assessment|Beceri değerlendirmesi \(\s*Beceri Değerlendirmesi/;

  const labelCases = [
    { name: "vetassess-222211", occupation: "Financial Market Dealer 222211", authority: "Vocational Education and Training Assessment Services (VETASSESS)" },
    { name: "vetassess-232112", occupation: "Landscape Architect 232112", authority: "Vocational Education and Training Assessment Services (VETASSESS)" },
    { name: "anmac-254418", occupation: "Registered Nurse (Medical) 254418", authority: "Australian Nursing and Midwifery Accreditation Council (ANMAC)" },
    { name: "ahpra-253111", occupation: "General Practitioner 253111", authority: "Australian Health Practitioner Regulation Agency (AHPRA)" },
  ];
  for (const c of labelCases) {
    for (const locale of LOCALES) {
      const label = `roadmap-label ${c.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const { flat } = await render(`label-${c.name}-${locale}`, { ...base, occupation: c.occupation, occupationConfirmed: "yes", sponsorOrFamily: undefined, locale }, locale);
      if (flat === null) { f("route did not return the PDF"); continue; }
      const m = flat.match(doubled);
      if (m) f(`doubled label in the PDF: "...${flat.slice(Math.max(0, m.index! - 40), m.index! + 60)}..."`);
      const lead = locale === "tr" ? "Beceri değerlendirmesi (" : locale === "zh-Hans" ? "技能评估（" : "Skills assessment (";
      const sq = (t: string) => (locale === "zh-Hans" ? squashAll(t) : flatten(t));
      if (!flat.includes(sq(`${lead}${c.authority}`))) f(`the cost sentence does not read "${lead}${c.authority}..."`);
      if (!caseFailed) console.log(`  ✅ ok (${lead}${c.authority}...)`);
    }
  }

  // OSAP: the four licensed occupations for any passport; Chef for a listed (IN) vs unlisted (TR) passport.
  const p1 = "3,120–5,320";
  const osapCases: Array<{ name: string; occupation: string; passport: string; osap: boolean; page: number }> = [
    { name: "342111", occupation: "Airconditioning and Refrigeration Mechanic 342111", passport: "TR", osap: true, page: 7 },
    { name: "341111", occupation: "Electrician (General) 341111", passport: "TR", osap: true, page: 8 },
    { name: "341112", occupation: "Electrician (Special Class) 341112", passport: "GB", osap: true, page: 8 },
    { name: "334111", occupation: "Plumber (General) 334111", passport: "TR", osap: true, page: 10 },
    { name: "351311-IN", occupation: "Chef 351311", passport: "IN", osap: true, page: 7 },
    { name: "351311-TR", occupation: "Chef 351311", passport: "TR", osap: false, page: 7 },
  ];
  for (const c of osapCases) {
    for (const locale of LOCALES) {
      const label = `osap ${c.name}/${locale}`;
      console.log(`\n=== ${label} ===`);
      let caseFailed = false;
      const f = (m: string) => { caseFailed = true; fail(`${label}: ${m}`); };
      const input: ReadinessInput = {
        ...base, occupation: c.occupation, occupationConfirmed: "yes", sponsorOrFamily: undefined, passportCountry: c.passport,
        currentCountry: c.passport, qualificationLevel: "Certificate", qualificationAwardedInAustralia: false, offshoreExperienceYears: 5, locale,
      };
      const { report, flat } = await render(`osap-${c.name}-${locale}`, input, locale);
      const row = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
      if (!row || !/\(TRA\)/.test(row.category)) { f(`no TRA skills row ("${row?.category}")`); continue; }
      const [min, max] = c.osap ? [3120, 5320] : [795, 795];
      if (row.amountMin !== min || row.amountMax !== max) f(`roadmap amount ${row.amountMin}-${row.amountMax}, expected ${min}-${max}`);
      if (flat === null) { f("route did not return the PDF"); continue; }
      const amount = (t: string) => new RegExp(`(AUD|澳元)\\s*${t.replace(/[–-]/g, "[–-]")}`);
      const pageRef = locale === "tr" ? `s.${c.page}` : locale === "zh-Hans" ? `第${c.page}页` : `p.${c.page}`;
      if (c.osap) {
        if (!amount(p1).test(flat)) f(`PDF does not show the OSAP Pathway 1 fee AUD ${p1}`);
        if (/(AUD|澳元)\s*795\b/.test(flat)) f("PDF still quotes the standard AUD 795 MSA fee");
        if (!/OSAP/.test(flat)) f("PDF does not name the Offshore Skills Assessment Program (OSAP)");
      } else {
        if (!/(AUD|澳元)\s*795\b/.test(flat)) f("PDF does not show the standard AUD 795 MSA fee");
        if (!amount("2,020–5,320").test(flat)) f("PDF does not mention the OSAP range for listed passports");
      }
      if (!flat.includes(pageRef)) f(`PDF does not cite the TRA OSAP list page (${pageRef})`);
      if (!caseFailed) console.log(`  ✅ ok (${c.osap ? `OSAP AUD ${p1}` : "MSA AUD 795 + OSAP note"}, ${pageRef})`);
    }
  }
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
          await checkPdf(ctx, bytes, locale, persona, JSON.parse(JSON.stringify(report)), path.join(outDir, `route-${persona.name}-${locale}`), persona.blocked, persona.input.age);
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

  runClientPdfImportCheck((m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Occupation <-> state occupation-list match line
  await runOccupationMatchChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Medical registration fees (GP 253111) + the 191 income requirement
  await runMedicalRegistrationChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Nursing skills assessment (Anmac): RN 254418 AUD 595 cited; no AUD 1,000 placeholder on any ANMAC occupation
  await runNursingChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // CPA fee by applicant location (offshore 514 / onshore 565 / Singapore 560); OT assessing body named OTC
  await runLocationFeeAndOtcChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // The 5 occupations where the tool page and the report used to name different assessing authorities
  await runToolPageAuthorityChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Roadmap skills-assessment label (no "((...))" / "技能评估（技能评估 — ...）"); TRA OSAP fee where TRA requires it
  await runRoadmapLabelAndOsapChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Unsupported labels, one authority, estimate qualifier
  await runAuthorityChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // One score and one ranking (LLM stubbed with hostile output)
  await runPathwayChecks(GET, rows, outDir, (m) => {
    failed = true;
    console.error("  ❌ " + m);
  });

  // Friction Level derived from the score gap
  await runFrictionChecks(GET, rows, outDir, (m) => {
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
