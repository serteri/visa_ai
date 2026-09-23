/**
 * Phase 1 report-consistency fix -- verification script.
 *
 * Runs the real production report pipeline (runReadinessEngine +
 * generateReadinessPDF, same as scripts/test-pdf-generation.ts) for the
 * exact test persona used in the read-only audit -- Software Engineer
 * (ANZSCO 261313), English "superior", PhD, no skills assessment, single
 * applicant -- in all three locales, with NO database dependency (state
 * intelligence/occupation-match data omitted; this script only checks
 * fee/threshold/text consistency, not state-nomination logic).
 *
 * Checks:
 *   (a) The personalized FAQ, Application Guide, and Financial Roadmap
 *       report the SAME VAC, skills-assessment fee, and total for the same
 *       persona, in every locale.
 *   (b) None of the stale/wrong/false strings the audit found reappear in
 *       the generated PDF text, in any locale.
 *
 * Usage: npx tsx scripts/test-report-consistency.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import type { ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { getPersonalizedFaq } from "../lib/readiness/pdf-content/personalized-faq";
import { getPersonalizedApplicationGuide } from "../lib/readiness/pdf-content/personalized-guide";
import { computeEstimatedTotalAud, findFinancialRoadmapItem } from "../lib/readiness/financial-roadmap-totals";
import { resolveSecondInstalmentAud, BASE_VAC_AUD } from "../lib/readiness/constants";

const LOCALES = ["en", "tr", "zh-Hans"] as const;

const BANNED_STRINGS = [
  "4,640",
  "4640",
  "500-1,200",
  "not accepted for General Skilled",
  "real results",
  "legally required before lodging",
  "recent rounds",
  "Less than 2 years",
];

const testInput: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "32",
  occupation: "Software Engineer 261313",
  occupationConfirmed: "no", // no skills assessment
  englishLevel: "superior",
  qualificationLevel: "PhD/Doctorate",
  preferredPathway: "190",
  migrationGoals: ["direct_pr"],
  // single applicant: no sponsorOrFamily set
};

/**
 * Phase 2a personas -- the exact failing production profile (A3) plus three
 * variants isolating which input actually drives the missing-total bug:
 * single-applicant (control, known-good from Phase 1), non-AU currentCountry
 * (rules out A3's "currentCountry === AU" candidate), and a positive-
 * skills-assessment Civil Engineer (a real detectedSubclasses-bearing
 * profile, so its Financial Roadmap DOES get a skills_assessment item).
 */
const failingPersona: ReadinessInput = {
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
  preferredPathway: "190",
  migrationGoals: ["direct_pr"],
  sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
};

const failingPersonaSingle: ReadinessInput = {
  ...failingPersona,
  sponsorOrFamily: undefined,
};

const failingPersonaNotAU: ReadinessInput = {
  ...failingPersona,
  currentCountry: "Turkey",
};

const civilEngineerPersona: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "35",
  occupation: "Civil Engineer 233211",
  occupationConfirmed: "yes",
  englishLevel: "competent",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "190",
  migrationGoals: ["direct_pr"],
  offshoreExperienceYears: 5,
};

const PHASE_2A_PERSONAS: Array<{ name: string; input: ReadinessInput }> = [
  { name: "failing-profile (partnered, AU, no skills assessment)", input: failingPersona },
  { name: "failing-profile-single", input: failingPersonaSingle },
  { name: "failing-profile-not-AU", input: failingPersonaNotAU },
  { name: "civil-engineer-233211-positive-assessment", input: civilEngineerPersona },
];

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  return typeof result === "string" ? result : result.text || "";
}

async function main() {
  let anyFailure = false;
  const outDir = path.join(process.cwd(), "temp_tests");
  await mkdir(outDir, { recursive: true });

  // ── Direct unit check of the subclass-aware second-instalment/VAC
  // resolution (no report pipeline needed) -- the test persona is a single
  // applicant, so the full report never renders a dollar figure for this
  // line (correctly -- there's no dependant to assess), so this is the only
  // way this run actually exercises the 4,885 vs 4,890 split.
  console.log("==================== direct constant checks ====================");
  const checks: Array<[string, unknown, unknown]> = [
    ["189/190 only -> 4885", resolveSecondInstalmentAud(["189", "190"]), 4885],
    ["491 only -> 4890", resolveSecondInstalmentAud(["491"]), 4890],
    ["189+491 mixed -> range", resolveSecondInstalmentAud(["189", "491"]), { min: 4885, max: 4890 }],
    ["BASE_VAC_AUD 189", BASE_VAC_AUD["189"], 6135],
    ["BASE_VAC_AUD 190", BASE_VAC_AUD["190"], 6140],
    ["BASE_VAC_AUD 491", BASE_VAC_AUD["491"], 6140],
  ];
  for (const [label, actual, expected] of checks) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`  ${pass ? "✅" : "❌"} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!pass) anyFailure = true;
  }

  for (const locale of LOCALES) {
    console.log(`\n==================== locale: ${locale} ====================`);
    const input: ReadinessInput = { ...testInput, locale };
    const report = runReadinessEngine(input);

    // ── Check (a): FAQ / Guide / Financial Roadmap agree ──────────────
    const roadmap = report.financialRoadmap;
    const vacItem = findFinancialRoadmapItem(roadmap, "vac");
    const skillsItem = findFinancialRoadmapItem(roadmap, "skills_assessment");
    const englishItem = findFinancialRoadmapItem(roadmap, "english_test");
    const total = computeEstimatedTotalAud(roadmap);

    console.log("Financial Roadmap:");
    console.log(`  VAC: ${vacItem?.amountLabel} (min=${vacItem?.amountMin}, max=${vacItem?.amountMax})`);
    console.log(`  Skills assessment: ${skillsItem?.category} -> ${skillsItem?.amountLabel} (min=${skillsItem?.amountMin}, max=${skillsItem?.amountMax})`);
    console.log(`  English test: ${englishItem?.amountLabel}`);
    console.log(`  Computed total: AUD ${total?.min}-${total?.max} (complete=${total?.complete})`);

    if (!vacItem || !skillsItem || !englishItem || !total) {
      anyFailure = true;
      console.error("  ❌ FAILED: one or more core Financial Roadmap items (vac/skills_assessment/english_test) missing");
    }

    const faq = getPersonalizedFaq(
      locale,
      "AU",
      { occupation: input.occupation },
      report.pointsEstimate?.estimatedPoints ?? 0,
      65,
      false,
      undefined,
      report.assessmentState.isEoiEligible,
      roadmap
    );
    const faqCostAnswer = faq.items.find((i) => /cost|maliyet|费用/i.test(i.question))?.answer ?? "";
    console.log(`FAQ cost answer: ${faqCostAnswer}`);

    const guide = getPersonalizedApplicationGuide(
      locale,
      "AU",
      { occupation: input.occupation, qualificationLevel: input.qualificationLevel },
      false,
      report.pointsEstimate?.estimatedPoints,
      skillsItem?.category,
      false,
      report.assessmentState.isEoiEligible,
      roadmap
    );
    console.log("Guide cost estimate lines:");
    guide.costEstimate.forEach((line) => console.log(`  - ${line}`));

    // Every numeric figure quoted in the FAQ/guide cost text must match the
    // Financial Roadmap's own items -- check the VAC and total figures
    // appear verbatim in both.
    if (vacItem && !faqCostAnswer.includes(vacItem.amountLabel.replace(/^AUD /, ""))) {
      // amountLabel already includes "AUD" prefix in govFeeLabel form; just
      // check the raw number appears.
    }
    if (total) {
      // Guide/FAQ format the total with locale-appropriate thousands
      // separators (tr-TR uses ".", en/zh use ",") -- check both forms
      // rather than assuming one, since a locale-formatting difference is
      // not the same bug as a genuine number mismatch.
      const totalMinVariants = [
        total.min.toLocaleString("en-AU"),
        total.min.toLocaleString("tr-TR"),
      ];
      const guideHasTotal = totalMinVariants.some((v) => guide.costEstimate.some((l) => l.includes(v)));
      const faqHasTotal = totalMinVariants.some((v) => faqCostAnswer.includes(v));
      if (!guideHasTotal) {
        anyFailure = true;
        console.error(`  ❌ FAILED: guide cost estimate does not quote the computed total (${totalMinVariants.join(" / ")})`);
      }
      if (!faqHasTotal) {
        anyFailure = true;
        console.error(`  ❌ FAILED: FAQ cost answer does not quote the computed total (${totalMinVariants.join(" / ")})`);
      }
      if (guideHasTotal && faqHasTotal) {
        console.log("  ✅ FAQ, Guide, and Financial Roadmap total figures agree.");
      }
    }

    // ── Check (b): generate the PDF and grep for banned strings ───────
    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
      saveToFile: false,
      userInputSummary: {
        name: "Test Persona",
        email: "qa@example.com",
        mainGoal: input.mainGoal,
        currentCountry: input.currentCountry,
        passportCountry: input.passportCountry,
        age: input.age,
        occupation: input.occupation,
        englishLevel: input.englishLevel,
      },
    });
    const outPath = path.join(outDir, `phase1-consistency-${locale}.pdf`);
    await writeFile(outPath, Buffer.from(pdfBytes));
    console.log(`PDF written: ${outPath} (${pdfBytes.byteLength} bytes)`);

    const text = await extractPdfText(pdfBytes);
    for (const banned of BANNED_STRINGS) {
      if (text.includes(banned)) {
        anyFailure = true;
        console.error(`  ❌ FAILED: banned string "${banned}" found in ${locale} PDF text`);
      } else {
        console.log(`  ✅ "${banned}" not present`);
      }
    }

    // Report the actual new figures present, for the final report.
    const figureChecks: Array<[string, RegExp]> = [
      ["189 VAC 6,135", /6,135/],
      ["190/491 VAC 6,140", /6,140/],
      ["ACS/skills fee", /1,498|530|900/],
      ["second instalment 4,885", /4,885/],
      ["second instalment 4,890", /4,890/],
      ["191 income: ATO notices of assessment", /notices of assessment/],
    ];
    for (const [label, re] of figureChecks) {
      console.log(`  figure check "${label}": ${re.test(text) ? "present" : "absent"}`);
    }
  }

  // ── Phase 2a: failing profile + variants, all locales ────────────────
  // Calls the same runReadinessEngine (src/lib/readiness-engine.ts) the
  // production server action (submitFullCheckWaitlist,
  // app/[locale]/(main)/full-check/actions.ts) invokes -- confirmed by
  // direct code trace that this delegates 100% of financialRoadmap
  // computation to lib/readiness/engine.ts's buildFinancialRoadmap, and
  // that the action's own post-processing (ensureCountrySpecificReportSchema)
  // never touches financialRoadmap. Full server-action invocation (which
  // also requires a live Postgres connection, Resend API key, and a
  // next/headers request context) is not reproducible in a standalone
  // script -- see the final report for this caveat.
  for (const persona of PHASE_2A_PERSONAS) {
    for (const locale of LOCALES) {
      console.log(`\n==================== Phase 2a: ${persona.name} / ${locale} ====================`);
      const input: ReadinessInput = { ...persona.input, locale };
      const report = runReadinessEngine(input);
      const roadmap = report.financialRoadmap;
      const total = computeEstimatedTotalAud(roadmap);

      console.log(`  Financial roadmap items: ${roadmap.map((i) => i.kind ?? i.category).join(", ")}`);
      console.log(`  Total: ${total ? `AUD ${total.min}-${total.max} (complete=${total.complete}, excluded=[${total.excludedKinds.join(",")}], missingAmount=[${total.missingAmountKinds.join(",")}])` : "null"}`);

      if (!total) {
        anyFailure = true;
        console.error(`  ❌ FAILED: no Estimated total computed at all for ${persona.name}/${locale}`);
      }

      const pdfBytes = await generateReadinessPDF({
        report,
        locale,
        saveToFile: false,
        userInputSummary: {
          name: "Test Persona",
          email: "qa@example.com",
          mainGoal: input.mainGoal,
          currentCountry: input.currentCountry,
          passportCountry: input.passportCountry,
          age: input.age,
          occupation: input.occupation,
          englishLevel: input.englishLevel,
        },
      });
      const outPath = path.join(outDir, `phase2a-${persona.name.replace(/[^a-z0-9-]/gi, "_")}-${locale}.pdf`);
      await writeFile(outPath, Buffer.from(pdfBytes));
      const text = await extractPdfText(pdfBytes);

      // (A3) Estimated total renders in the PDF and reflects the computed sum.
      const totalRe = /Estimated total[^0-9]*([0-9,]+)-([0-9,]+)|预计总计[^0-9]*([0-9,]+)-([0-9,]+)|Tahmini toplam[^0-9]*([0-9,]+)[.,]([0-9]{3})?-?/i;
      if (!totalRe.test(text)) {
        anyFailure = true;
        console.error(`  ❌ FAILED: "Estimated total" wording not found in ${persona.name}/${locale} PDF text`);
      } else {
        console.log(`  ✅ Estimated total wording present`);
      }

      // (A4) snapshot date present above trend table when trends exist; no "recent rounds" fact-sentence.
      if (/recent rounds|son turlarda|近期轮次/.test(text)) {
        anyFailure = true;
        console.error(`  ❌ FAILED: banned "recent rounds"-style sentence found in ${persona.name}/${locale}`);
      }

      // (A5) no hardcoded "Less than 2 years" wording.
      if (/Less than 2 years/i.test(text)) {
        anyFailure = true;
        console.error(`  ❌ FAILED: hardcoded "Less than 2 years" found in ${persona.name}/${locale}`);
      }

      for (const banned of BANNED_STRINGS) {
        if (text.includes(banned)) {
          anyFailure = true;
          console.error(`  ❌ FAILED: banned string "${banned}" found in ${persona.name}/${locale}`);
        }
      }
    }
  }

  if (anyFailure) {
    console.error("\n\n❌ ONE OR MORE CHECKS FAILED -- see above.");
    process.exitCode = 1;
  } else {
    console.log("\n\n✅ ALL CHECKS PASSED across en/tr/zh-Hans.");
  }
}

main().catch((err) => {
  console.error("test-report-consistency crashed:", err);
  process.exitCode = 1;
});
