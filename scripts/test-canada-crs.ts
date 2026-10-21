/**
 * The Canada CRS: the verified calculator (lib/points/calculate-canada-crs.ts), the Assessment's intake and its complete / partial states
 * (lib/points/canada-crs-intake.ts), and the engine's report figure. Scenarios are computed by hand from the published tables held in
 * src/data/countries/ca/express-entry.json (Canada.ca: Express Entry CRS criteria); the maximums are IRCC's published ones.
 *
 *   npx tsx scripts/test-canada-crs.ts
 */
import { readFileSync } from "node:fs";

import { calculateCanadaCRS } from "../lib/points/calculate-canada-crs";
import type { CanadaCRSInput } from "../lib/points/canada-types";
import { assessCanadaCrs, blankCanadaCrsEntry, legacyEnglishLevel, parseCanadaCrsEntry, type CanadaCrsEntry } from "../lib/points/canada-crs-intake";
import expressEntry from "../src/data/countries/ca/express-entry.json";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const eq = (got: unknown, want: unknown, msg: string) => check(got === want, msg, `got ${got}, want ${want}`);

const all4 = <T,>(v: T) => ({ speaking: v, listening: v, reading: v, writing: v });
const base: CanadaCRSInput = {
  hasSpouseOrPartner: false, age: "20_29", education: "bachelors_or_3yr_program", firstLanguageAbilityScores: all4("CLB_9"), secondLanguageBand: "none",
  canadianWorkExperience: "2_years", postSecondaryCredentialCount: "one", foreignWorkExperienceYears: "none", hasCertificateOfQualification: false,
  hasSiblingInCanada: false, frenchAbility: "none", canadianPostSecondaryCredentialYears: "none", hasProvincialNomination: false,
};

async function main() {
  const crs = expressEntry.crsScore as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  console.log("1. the published maximums (Canada.ca CRS criteria)");
  const maxOf = (t: Record<string, any>, key: string) => Math.max(...Object.values(t).map((v: any) => v[key])); // eslint-disable-line @typescript-eslint/no-explicit-any
  const core = crs.coreHumanCapitalFactors;
  const secondMax = (spouse: boolean) => Math.min(4 * Math.max(...Object.values(core.secondOfficialLanguage.table) as number[]), spouse ? core.secondOfficialLanguage.maxCombinedWithSpouse : core.secondOfficialLanguage.maxCombinedWithoutSpouse);
  eq(maxOf(core.age.table, "withoutSpouse") + maxOf(core.education.table, "withoutSpouse") + 4 * maxOf(core.firstOfficialLanguage.table, "withoutSpouse") + secondMax(false) + maxOf(core.canadianWorkExperience.table, "withoutSpouse"), 500, "core human capital without a spouse or partner: 500");
  eq(maxOf(core.age.table, "withSpouse") + maxOf(core.education.table, "withSpouse") + 4 * maxOf(core.firstOfficialLanguage.table, "withSpouse") + secondMax(true) + maxOf(core.canadianWorkExperience.table, "withSpouse"), 460, "core human capital with a spouse or partner: 460");
  eq(crs.spouseFactors.education.max + crs.spouseFactors.languageFirstOfficial.maxTotal + crs.spouseFactors.canadianWorkExperience.max, 40, "spouse or partner factors: 40");
  eq(crs.skillTransferabilityFactors.maxTotal, 100, "skill transferability: 100");
  eq(crs.additionalPoints.maxTotal, 600, "additional points: 600");
  eq(crs.maxScore, 1200, "the CRS maximum: 1200");
  const maxProfile: CanadaCRSInput = {
    ...base, age: "20_29", education: "doctoral_phd", firstLanguageAbilityScores: all4("CLB_10_plus"), secondLanguageBand: "none",
    secondLanguageAbilityScores: all4("CLB9_plus"), canadianWorkExperience: "5_plus_years", postSecondaryCredentialCount: "two_or_more", foreignWorkExperienceYears: "3_plus_years",
    hasCertificateOfQualification: true, hasSiblingInCanada: true, frenchAbility: "NCLC7_plus_english_CLB5_plus", canadianPostSecondaryCredentialYears: "three_year_plus_credential", hasProvincialNomination: true,
  };
  eq(calculateCanadaCRS(maxProfile).totalScore, 1200, "a maximum profile without a spouse scores exactly 1200 (every cap applies)");
  eq(calculateCanadaCRS({ ...maxProfile, hasSpouseOrPartner: true, spouse: { education: "doctoral", firstLanguageAbilityScores: all4("CLB_10_plus"), canadianWorkExperience: "5_plus_years" } }).totalScore, 1200, "a maximum profile with a spouse scores exactly 1200");

  console.log("\n2. scenarios computed from the published tables");
  const a = calculateCanadaCRS(base);
  eq(a.breakdown.coreHumanCapital.total, 110 + 120 + 4 * 31 + 53, "single, 29, 3-year degree, CLB 9, 2 years Canadian: core 407");
  eq(a.breakdown.skillTransferability.total, 50, "one credential + CLB 9 (25) + one credential + 2 years Canadian (25) = 50 (education group, cap 50)");
  eq(a.totalScore, 457, "total 457");
  eq(calculateCanadaCRS({ ...base, postSecondaryCredentialCount: "two_or_more" }).breakdown.skillTransferability.total, 50, "two credentials: 50 + 50 = 100 is capped to the education maximum of 50");
  eq(calculateCanadaCRS({ ...base, postSecondaryCredentialCount: "two_or_more", foreignWorkExperienceYears: "3_plus_years" }).breakdown.skillTransferability.total, 100, "education 50 + foreign work experience 50 = 100");
  eq(calculateCanadaCRS({ ...base, firstLanguageAbilityScores: all4("CLB_4") }).breakdown.coreHumanCapital.firstLanguage, 24, "CLB 4 in each ability scores 6 (row 'CLB 4 or 5'), not 0");
  eq(calculateCanadaCRS({ ...base, firstLanguageAbilityScores: all4("CLB_5") }).breakdown.coreHumanCapital.firstLanguage, 24, "CLB 5 in each ability scores 6");
  eq(calculateCanadaCRS({ ...base, education: "secondary_diploma", postSecondaryCredentialCount: "none", canadianWorkExperience: "none_or_less_than_1yr", hasCertificateOfQualification: true, firstLanguageAbilityScores: all4("CLB_4") }).breakdown.skillTransferability.total, 0, "certificate of qualification needs CLB 5: CLB 4 scores nothing");
  eq(calculateCanadaCRS({ ...base, education: "secondary_diploma", postSecondaryCredentialCount: "none", canadianWorkExperience: "none_or_less_than_1yr", hasCertificateOfQualification: true, firstLanguageAbilityScores: all4("CLB_5") }).breakdown.skillTransferability.total, 25, "certificate of qualification with CLB 5: 25");
  eq(calculateCanadaCRS({ ...base, education: "secondary_diploma", postSecondaryCredentialCount: "none", canadianWorkExperience: "none_or_less_than_1yr", hasCertificateOfQualification: true }).breakdown.skillTransferability.total, 50, "certificate of qualification with CLB 7 or more: 50");
  const second = (band: any, spouse = false) => calculateCanadaCRS({ ...base, hasSpouseOrPartner: spouse, secondLanguageAbilityScores: all4(band) }).breakdown.coreHumanCapital.secondLanguage; // eslint-disable-line @typescript-eslint/no-explicit-any
  eq(second("CLB5_6"), 4, "second language, CLB 5-6 in four abilities: 1 each = 4");
  eq(second("CLB7_8"), 12, "second language, CLB 7-8 in four abilities: 3 each = 12");
  eq(second("CLB9_plus"), 24, "second language, CLB 9+ in four abilities: 6 each = 24 (the older code gave 6)");
  eq(second("CLB9_plus", true), 22, "second language with a spouse or partner is capped at 22");
  const sp = (lvl: any) => calculateCanadaCRS({ ...base, hasSpouseOrPartner: true, spouse: { education: "bachelors_or_3yr", firstLanguageAbilityScores: all4(lvl), canadianWorkExperience: "2_years" } }).breakdown.spouseFactors; // eslint-disable-line @typescript-eslint/no-explicit-any
  eq(sp("CLB_9").language, 20, "spouse language, CLB 9+ in four abilities: 5 each = 20");
  eq(sp("CLB_7").language, 12, "spouse language, CLB 7-8: 3 each = 12");
  eq(sp("CLB_5").language, 4, "spouse language, CLB 5-6: 1 each = 4");
  eq(sp("CLB_4").language, 0, "spouse language below CLB 5: 0");
  eq(sp("CLB_9").total, 8 + 20 + 7, "spouse factors: education 8 + language 20 + Canadian work 7 = 35");
  const add = calculateCanadaCRS({ ...maxProfile, hasProvincialNomination: true }).breakdown.additionalPoints;
  eq(add.total, 600, "additional points never exceed 600 (15 + 50 + 30 + 600 is capped)");
  check(calculateCanadaCRS({ ...base, hasSpouseOrPartner: true }).notCalculated.includes("spouseOrPartnerFactors"), "a spouse without details is reported as not calculated by the calculator");

  console.log("\n3. the Assessment intake: complete and partial states");
  const complete: CanadaCrsEntry = {
    ...blankCanadaCrsEntry(), spouse: "no", firstLanguage: all4("CLB_9"), secondLanguage: "none", education: "bachelors_or_3yr_program", credentials: "one",
    certificateOfQualification: "no", sibling: "no", canadianStudy: "none", provincialNomination: "no",
  };
  const full = assessCanadaCrs({ entry: complete, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  check(full.status === "complete" && full.total === 457 && full.notCalculated.length === 0, "every factor answered: status complete, CRS score 457", JSON.stringify({ s: full.status, t: full.total, n: full.notCalculated.map((f) => f.id) }));
  const noWork = assessCanadaCrs({ entry: complete, age: "29", canadianWorkYears: undefined, foreignWorkYears: 0 });
  check(noWork.status === "partial" && noWork.total === undefined && typeof noWork.partialSum === "number", "Canadian work experience not entered: partial, no CRS score", JSON.stringify({ s: noWork.status, t: noWork.total }));
  check(noWork.notCalculated.some((f) => f.id === "canadianWorkExperience") && noWork.notCalculated.some((f) => f.id === "skillTransferability"), "...and names the factors not calculated (work experience, skill transferability)");
  eq(noWork.partialSum, noWork.calculated.reduce((s, f) => s + f.points, 0), "...the partial sum is only the factors that were calculated");
  const spouseless = assessCanadaCrs({ entry: { ...complete, spouse: "" }, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  check(spouseless.status !== "complete" && !spouseless.calculated.some((f) => f.id === "age"), "marital status unanswered: nothing that depends on it is scored (the tables differ with a spouse)");
  const sponly = assessCanadaCrs({ entry: { ...complete, spouse: "yes" }, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  check(sponly.status === "partial" && sponly.notCalculated.some((f) => f.id === "spouseOrPartnerFactors") && sponly.total === undefined, "a spouse without details: partial, spouse factors not calculated, no CRS score");
  const withSpouse = assessCanadaCrs({ entry: { ...complete, spouse: "yes", spouseEducation: "bachelors_or_3yr", spouseLanguage: all4("CLB_9"), spouseCanadianWork: "2_years" }, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  check(withSpouse.status === "complete" && typeof withSpouse.total === "number", "a spouse with every detail: complete");
  check(assessCanadaCrs({ entry: undefined, age: "29", canadianWorkYears: undefined, foreignWorkYears: undefined }).status === "none", "no answers: nothing calculated (status none)");
  const french = assessCanadaCrs({ entry: { ...complete, secondLanguage: "tested", secondLanguageAbilities: all4("CLB7_8") }, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  eq(french.calculated.find((f) => f.id === "frenchLanguage")?.points, 50, "French NCLC 7+ in all four abilities with English CLB 5+: 50 additional points");
  const frenchLow = assessCanadaCrs({ entry: { ...complete, firstLanguage: all4("CLB_4"), secondLanguage: "tested", secondLanguageAbilities: all4("CLB7_8") }, age: "29", canadianWorkYears: 2, foreignWorkYears: 0 });
  eq(frenchLow.calculated.find((f) => f.id === "frenchLanguage")?.points, 25, "French NCLC 7+ with English CLB 4 or lower: 25 additional points");
  eq(assessCanadaCrs({ entry: { ...complete, age: undefined } as never, age: "18", canadianWorkYears: 2, foreignWorkYears: 0 }).calculated.find((f) => f.id === "age")?.points, 99, "age 18 scores 99 (its own row)");
  eq(assessCanadaCrs({ entry: complete, age: "45", canadianWorkYears: 2, foreignWorkYears: 0 }).calculated.find((f) => f.id === "age")?.points, 0, "age 45: 0 points (not a bar)");

  console.log("\n4. the submitted values are validated");
  const parsed = parseCanadaCrsEntry((n) => ({ crsSpouse: "maybe", crsFirst_speaking: "CLB_9", crsFirst_listening: "CLB_99", crsEducation: "doctoral_phd", crsSecondLanguage: "tested", crsSecond_speaking: "CLB5_6" } as Record<string, string>)[n]);
  check(parsed.spouse === "" && parsed.firstLanguage.speaking === "CLB_9" && parsed.firstLanguage.listening === "" && parsed.education === "doctoral_phd", "an unknown value reads as not answered, never as a score");
  check(parsed.secondLanguageAbilities.speaking === "CLB5_6" && parsed.secondLanguageAbilities.reading === "", "second-language abilities are read one by one");
  eq(legacyEnglishLevel(all4("CLB_9")), "clb9", "the legacy English level is the lowest ability (clb9)");
  eq(legacyEnglishLevel({ speaking: "CLB_9", listening: "CLB_7", reading: "CLB_8", writing: "CLB_9" }), "clb7", "...of four unequal abilities, clb7");
  eq(legacyEnglishLevel(all4("less_than_CLB4")), "none", "...none when below CLB 4");

  console.log("\n5. the engine and the report never present a partial figure as the CRS score");
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const input = { locale: "en", country: "CA", age: "29", occupation: "Software developers and programmers (21232)", englishLevel: "clb9", currentCountry: "IN", passportCountry: "IN", onshoreExperienceYears: 2, offshoreExperienceYears: 0 } as never;
  const partialReport: any = runReadinessEngine({ ...(input as object), canadaCrs: { ...complete, certificateOfQualification: "" } } as never); // eslint-disable-line @typescript-eslint/no-explicit-any
  check(partialReport.pointsEstimate.estimatedPoints === undefined && partialReport.pointsEstimate.crs?.status === "partial" && typeof partialReport.pointsEstimate.crs?.partialSum === "number", "partial answers: no estimatedPoints on the report, crs.status 'partial' with a labelled partial sum");
  check(partialReport.assessmentState?.estimatedPoints === undefined, "...and the shared estimatedPoints field is empty");
  const fullReport: any = runReadinessEngine({ ...(input as object), canadaCrs: complete } as never); // eslint-disable-line @typescript-eslint/no-explicit-any
  check(fullReport.pointsEstimate.crs?.status === "complete" && fullReport.pointsEstimate.estimatedPoints === 457, "complete answers: the report carries the calculated CRS score (457)", JSON.stringify(fullReport.pointsEstimate.crs?.status));
  const legacyReport: any = runReadinessEngine(input); // eslint-disable-line @typescript-eslint/no-explicit-any
  check(legacyReport.pointsEstimate.estimatedPoints === undefined && legacyReport.pointsEstimate.crs?.status !== "complete", "an older report with only age and language: never a CRS score");

  console.log("\n6. the data and the code agree");
  const src = readFileSync("lib/points/calculate-canada-crs.ts", "utf8");
  check(/groupCaps/.test(src) && /perAbilityTable/.test(src) && /tableKey/.test(src), "the calculator reads the group caps, the spouse language table and the CLB 4/5 row from the data");
  check(Boolean(crs.skillTransferabilityFactors.groupCaps._verifiedAgainst) && Boolean(crs.spouseFactors.languageFirstOfficial._verifiedAgainst), "each rule added to the data names its source");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
