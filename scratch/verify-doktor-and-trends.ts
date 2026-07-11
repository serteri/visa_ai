import "dotenv/config";

import { chromium } from "playwright";

import { findOccupationRecord } from "@/lib/readiness/occupation-eligibility";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").trim();

async function verifyDoktorFormFlow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/tr/full-check`, { waitUntil: "networkidle" });

    const occupationInput = page.locator("#waitlist-occupation");
    await occupationInput.fill("Doktor");

    const options = page.locator("li");
    await options.first().waitFor({ state: "visible", timeout: 15000 });

    const optionTexts = (await options.allInnerTexts()).slice(0, 8);

    const bestDoctorOption = options
      .filter({ hasText: /Pratisyen Hekim|Uzman Hekim|Specialist Physician|Medical Practitioners/i })
      .first();

    await bestDoctorOption.click();

    const hiddenCode = await page.locator('input[name="occupation"]').inputValue();

    const report = runReadinessEngine({
      locale: "tr",
      country: "AU",
      mainGoal: "Doktor uygunluk doğrulaması",
      currentCountry: "Turkiye",
      passportCountry: "Turkiye",
      age: "31",
      occupation: hiddenCode,
      englishLevel: "superior",
      qualificationLevel: "Bachelor's Degree",
      annualSalaryAud: 120000,
      sponsorOrFamily: "single",
      occupationConfirmed: "yes",
      offshoreExperienceYears: 6,
      onshoreExperienceYears: 0,
    });

    const plainDoktorReport = runReadinessEngine({
      locale: "tr",
      country: "AU",
      mainGoal: "Doktor ambiguity check",
      currentCountry: "Turkiye",
      passportCountry: "Turkiye",
      age: "31",
      occupation: "Doktor",
      englishLevel: "superior",
      qualificationLevel: "Bachelor's Degree",
      annualSalaryAud: 120000,
      sponsorOrFamily: "single",
      occupationConfirmed: "yes",
      offshoreExperienceYears: 6,
      onshoreExperienceYears: 0,
    });

    return {
      optionTexts,
      selectedHiddenCode: hiddenCode,
      selectedResolvedCode: findOccupationRecord(hiddenCode)?.anzsco_code ?? null,
      selectedEligibility: report.assessmentState.occupationEligibility,
      selectedEligibilityReason: report.assessmentState.occupationEligibilityReason,
      plainDoktorResolvedCode: findOccupationRecord("Doktor")?.anzsco_code ?? null,
      plainDoktorEligibility: plainDoktorReport.assessmentState.occupationEligibility,
      plainDoktorEligibilityReason: plainDoktorReport.assessmentState.occupationEligibilityReason,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}

function verifyHistoricalUnmatchedFallback() {
  const unmatchedInputs = ["Doktor", "Uzay Büyücüsü", "Galaktik Veri Simyacısı"];

  return unmatchedInputs.map((occupation) => {
    const report = runReadinessEngine({
      locale: "tr",
      country: "AU",
      mainGoal: "Unmatched trend fallback doğrulaması",
      currentCountry: "Turkiye",
      passportCountry: "Turkiye",
      age: "31",
      occupation,
      englishLevel: "superior",
      qualificationLevel: "Bachelor's Degree",
      annualSalaryAud: 120000,
      sponsorOrFamily: "single",
      occupationConfirmed: "yes",
      offshoreExperienceYears: 6,
      onshoreExperienceYears: 0,
    });

    return {
      occupationInput: occupation,
      resolvedCode: findOccupationRecord(occupation)?.anzsco_code ?? null,
      matchedOccupationGroup: report.premiumSections.historicalInvitationTrends.matchedOccupationGroup,
      anzscoCode: report.premiumSections.historicalInvitationTrends.anzscoCode,
      estimateCount: report.premiumSections.historicalInvitationTrends.estimates.length,
      containsSoftwareEngineer: /software engineer|261313/i.test(
        `${report.premiumSections.historicalInvitationTrends.matchedOccupationGroup} ${report.premiumSections.historicalInvitationTrends.anzscoCode}`
      ),
    };
  });
}

function scanCommonAliasGap() {
  const probes = [
    { term: "doctor", locale: "en" },
    { term: "doktor", locale: "tr" },
    { term: "医生", locale: "zh-Hans" },
    { term: "nurse", locale: "en" },
    { term: "hemşire", locale: "tr" },
    { term: "护士", locale: "zh-Hans" },
    { term: "accountant", locale: "en" },
    { term: "muhasebeci", locale: "tr" },
    { term: "会计", locale: "zh-Hans" },
    { term: "teacher", locale: "en" },
    { term: "öğretmen", locale: "tr" },
    { term: "老师", locale: "zh-Hans" },
    { term: "engineer", locale: "en" },
    { term: "mühendis", locale: "tr" },
    { term: "工程师", locale: "zh-Hans" },
  ] as const;

  return probes.map((probe) => {
    const resolved = findOccupationRecord(probe.term);
    return {
      term: probe.term,
      locale: probe.locale,
      resolved: Boolean(resolved),
      resolvedCode: resolved?.anzsco_code ?? null,
      resolvedTitle: resolved?.occupation_name ?? null,
    };
  });
}

async function main() {
  const doktorFlow = await verifyDoktorFormFlow();
  const unmatchedTrendChecks = verifyHistoricalUnmatchedFallback();
  const aliasGapScan = scanCommonAliasGap();

  console.log(
    JSON.stringify(
      {
        doktorFlow,
        unmatchedTrendChecks,
        aliasGapScan,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
