import "dotenv/config";

import { chromium } from "playwright";

import occupationsData from "@/src/data/occupations.json";
import anzscoListData from "@/src/data/anzsco-list.json";
import { findOccupationRecord, getEligibleSkilledSubclasses } from "@/lib/readiness/occupation-eligibility";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

type OccupationRow = {
  anzsco_code: string;
  occupation_name: string;
  visa_lists?: string[];
};

type LocalizedRow = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
};

type CategoryPick = {
  category: string;
  code: string;
  canonicalTitle: string;
  localizedTitleTr: string;
};

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").trim();

const OCCUPATIONS = (occupationsData as { occupations: OccupationRow[] }).occupations;
const LOCALIZED = (anzscoListData as any[]).map((row) => ({
  code: row.code,
  title: row.title_en || row.title || "",
  title_tr: row.title_tr,
  title_zh: row.title_zh,
})) as LocalizedRow[];
const LOCALIZED_BY_CODE = new Map(LOCALIZED.map((row) => [row.code, row]));
const OCCUPATIONS_IN_AUTOCOMPLETE = OCCUPATIONS.filter((row) => LOCALIZED_BY_CODE.has(row.anzsco_code));

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((word) => t.includes(word));
}

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot pick from empty array.");
  }
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function toPick(row: OccupationRow, category: string): CategoryPick {
  const localized = LOCALIZED_BY_CODE.get(row.anzsco_code);
  return {
    category,
    code: row.anzsco_code,
    canonicalTitle: row.occupation_name,
    localizedTitleTr: localized?.title_tr ?? localized?.title ?? row.occupation_name,
  };
}

function buildPicks(): CategoryPick[] {
  const managerPrimaryPool = OCCUPATIONS_IN_AUTOCOMPLETE.filter(
    (row) => row.anzsco_code.startsWith("1") && hasAny(row.occupation_name, ["manager"])
  );
  const managerPool = managerPrimaryPool.length
    ? managerPrimaryPool
    : OCCUPATIONS_IN_AUTOCOMPLETE.filter((row) => row.anzsco_code.startsWith("1"));

  const healthPrimaryPool = OCCUPATIONS_IN_AUTOCOMPLETE.filter(
    (row) => row.anzsco_code.startsWith("2") && hasAny(row.occupation_name, [
      "doctor",
      "physician",
      "nurse",
      "medical",
      "dentist",
      "midwife",
      "pharmacist",
      "therapist",
    ])
  );
  const healthPool = healthPrimaryPool.length
    ? healthPrimaryPool
    : OCCUPATIONS_IN_AUTOCOMPLETE.filter((row) => row.anzsco_code.startsWith("2"));

  const tradePrimaryPool = OCCUPATIONS_IN_AUTOCOMPLETE.filter(
    (row) =>
      (row.anzsco_code.startsWith("3") || row.anzsco_code.startsWith("4")) &&
      hasAny(row.occupation_name, [
        "electrician",
        "plumber",
        "carpenter",
        "welder",
        "mechanic",
        "technician",
        "fitter",
      ])
  );
  const tradePool = tradePrimaryPool.length
    ? tradePrimaryPool
    : OCCUPATIONS_IN_AUTOCOMPLETE.filter(
        (row) => row.anzsco_code.startsWith("3") || row.anzsco_code.startsWith("4")
      );

  const adminPrimaryPool = OCCUPATIONS_IN_AUTOCOMPLETE.filter(
    (row) =>
      (row.anzsco_code.startsWith("5") || row.anzsco_code.startsWith("6")) &&
      hasAny(row.occupation_name, ["administrative", "clerk", "secretary", "office", "receptionist", "bookkeeper"])
  );
  const adminPool = adminPrimaryPool.length
    ? adminPrimaryPool
    : OCCUPATIONS_IN_AUTOCOMPLETE.filter(
        (row) => row.anzsco_code.startsWith("5") || row.anzsco_code.startsWith("6")
      );

  const extraPool = OCCUPATIONS_IN_AUTOCOMPLETE.filter(
    (row) =>
      !managerPool.some((m) => m.anzsco_code === row.anzsco_code) &&
      !healthPool.some((m) => m.anzsco_code === row.anzsco_code) &&
      !tradePool.some((m) => m.anzsco_code === row.anzsco_code) &&
      !adminPool.some((m) => m.anzsco_code === row.anzsco_code)
  );

  return [
    toPick(pickRandom(managerPool), "manager"),
    toPick(pickRandom(healthPool), "health"),
    toPick(pickRandom(tradePool), "trade_or_technical"),
    toPick(pickRandom(adminPool), "admin"),
    toPick(pickRandom(extraPool), "extra_random"),
  ];
}

async function verifyHiddenValueInUi(picks: CategoryPick[]) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const results: Array<{
      category: string;
      code: string;
      localizedTitleTr: string;
      hiddenOccupationValue: string;
      pass: boolean;
    }> = [];

    for (const pick of picks) {
      await page.goto(`${BASE_URL}/tr/full-check`, { waitUntil: "networkidle" });

      const occupationInput = page.locator("#waitlist-occupation");
      await occupationInput.fill("");
      await occupationInput.fill(pick.code);

      const option = page.locator("li", { hasText: pick.code }).first();
      await option.waitFor({ state: "visible", timeout: 15000 });
      await option.click();

      const hiddenOccupationValue = await page.locator('input[name="occupation"]').inputValue();

      results.push({
        category: pick.category,
        code: pick.code,
        localizedTitleTr: pick.localizedTitleTr,
        hiddenOccupationValue,
        pass: hiddenOccupationValue === pick.code,
      });
    }

    return { ok: true as const, results };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await page.close();
    await browser.close();
  }
}

function verifyEngineEligibility(picks: CategoryPick[]) {
  return picks.map((pick) => {
    const report = runReadinessEngine({
      locale: "tr",
      country: "AU",
      mainGoal: "Genel uygunluk denetimi",
      currentCountry: "Turkiye",
      passportCountry: "Turkiye",
      age: "31",
      occupation: pick.code,
      englishLevel: "superior",
      qualificationLevel: "Bachelor's Degree",
      annualSalaryAud: 120000,
      sponsorOrFamily: "single",
      occupationConfirmed: "yes",
      offshoreExperienceYears: 6,
      onshoreExperienceYears: 0,
    });

    const resolved = findOccupationRecord(pick.code);
    const expected = getEligibleSkilledSubclasses(pick.code).length > 0 ? "eligible" : "ineligible";
    const titleResolvedCode = findOccupationRecord(pick.localizedTitleTr)?.anzsco_code ?? null;

    return {
      category: pick.category,
      code: pick.code,
      localizedTitleTr: pick.localizedTitleTr,
      resolvedCode: resolved?.anzsco_code ?? null,
      titleResolvedCode,
      expectedEligibility: expected,
      actualEligibility: report.assessmentState.occupationEligibility,
      eligibilityReason: report.assessmentState.occupationEligibilityReason,
      pass:
        resolved?.anzsco_code === pick.code &&
        report.assessmentState.occupationEligibility === expected,
    };
  });
}

function auditUnmatchedTrendFallback() {
  const unmatchedInputs = ["Doktor", "Uzay Buyucusu", "Galaktik Veri Simyacisi"];

  return unmatchedInputs.map((occupation) => {
    const report = runReadinessEngine({
      locale: "tr",
      country: "AU",
      mainGoal: "Unmatched trend fallback denetimi",
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
      resolvedOccupationCode: findOccupationRecord(occupation)?.anzsco_code ?? null,
      assessmentOccupationEligibility: report.assessmentState.occupationEligibility,
      historicalMatchedOccupationGroup: report.premiumSections.historicalInvitationTrends.matchedOccupationGroup,
      historicalAnzscoCode: report.premiumSections.historicalInvitationTrends.anzscoCode,
    };
  });
}

function auditDoktorCoverage() {
  const doctorLikeInOccupationRows = OCCUPATIONS.filter((row) =>
    hasAny(row.occupation_name, ["doctor", "physician", "medical practitioner"])
  ).slice(0, 20);

  const doktorLikeInLocalizedTr = LOCALIZED.filter((row) =>
    hasAny(row.title_tr ?? "", ["doktor", "hekim", "tabip"])
  ).slice(0, 20);

  const doktorResolved = findOccupationRecord("Doktor");

  return {
    doktorResolvedCode: doktorResolved?.anzsco_code ?? null,
    doctorLikeOccupationCountIn691: doctorLikeInOccupationRows.length,
    doctorLikeOccupationExamples: doctorLikeInOccupationRows.map((row) => `${row.occupation_name} (${row.anzsco_code})`),
    doktorLikeLocalizedCount: doktorLikeInLocalizedTr.length,
    doktorLikeLocalizedExamples: doktorLikeInLocalizedTr.map((row) => `${row.title_tr ?? row.title} (${row.code})`),
  };
}

async function main() {
  const picks = buildPicks();
  const uiVerification = await verifyHiddenValueInUi(picks);
  const engineVerification = verifyEngineEligibility(picks);
  const unmatchedFallback = auditUnmatchedTrendFallback();
  const doktorCoverage = auditDoktorCoverage();

  console.log(
    JSON.stringify(
      {
        pickedOccupations: picks,
        uiVerification,
        engineVerification,
        unmatchedFallback,
        doktorCoverage,
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
