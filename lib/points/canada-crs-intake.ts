/**
 * The Canada Assessment's CRS intake: the answers the form collects for the Comprehensive Ranking System, their validation, and the assessment
 * of what can be calculated from them. Pure: no server-only imports; used by the form (client), the submit action and the engine.
 *
 * Rules:
 *  - Every factor the verified implementation (lib/points/calculate-canada-crs.ts) can score is collected. Nothing is invented.
 *  - A factor that was not answered is "not calculated", never zero-filled into the figure. The CRS score is reported ONLY when every
 *    factor was answered ("complete"); otherwise the result is "partial" and the sum of the factors that were calculated is labelled as such.
 *  - Spouse or partner answers are collected only when a spouse or partner will accompany the applicant.
 */
import { calculateCanadaCRS } from "@/lib/points/calculate-canada-crs";
import type {
  CanadaAgeBracket,
  CanadaCRSInput,
  CanadaCRSResult,
  CanadaEducationLevel,
  CanadaSpouseEducationLevel,
  CanadianWorkExperienceYears,
  CLBLevel,
  SecondLanguageCLBBand,
  SpouseCanadianWorkExperienceYears,
} from "@/lib/points/canada-types";

export const ABILITIES = ["speaking", "listening", "reading", "writing"] as const;
export type Ability = (typeof ABILITIES)[number];

export const CRS_CLB_LEVELS = ["less_than_CLB4", "CLB_4", "CLB_5", "CLB_6", "CLB_7", "CLB_8", "CLB_9", "CLB_10_plus"] as const satisfies readonly CLBLevel[];
export const CRS_SECOND_BANDS = ["CLB4_or_less", "CLB5_6", "CLB7_8", "CLB9_plus"] as const satisfies readonly SecondLanguageCLBBand[];
export const CRS_EDUCATION_LEVELS = [
  "less_than_secondary", "secondary_diploma", "one_year_post_secondary", "two_year_post_secondary",
  "bachelors_or_3yr_program", "two_or_more_credentials_one_3yr_plus", "masters_or_professional_degree", "doctoral_phd",
] as const satisfies readonly CanadaEducationLevel[];
export const CRS_SPOUSE_EDUCATION_LEVELS = [
  "less_than_secondary", "secondary", "one_year_post_secondary", "two_year_post_secondary",
  "bachelors_or_3yr", "two_or_more_credentials", "masters_or_professional", "doctoral",
] as const satisfies readonly CanadaSpouseEducationLevel[];
export const CRS_CREDENTIAL_COUNTS = ["none", "one", "two_or_more"] as const;
export const CRS_CANADIAN_STUDY = ["none", "one_to_two_year_credential", "three_year_plus_credential"] as const;
export const CRS_SPOUSE_WORK = ["none_or_less_1yr", "1_year", "2_years", "3_years", "4_years", "5_plus_years"] as const satisfies readonly SpouseCanadianWorkExperienceYears[];
export const YES_NO = ["yes", "no"] as const;

type Levels = Record<Ability, string>;

/** What the form submits (every value a string; "" = not answered). Stored on the report input as `canadaCrs`. */
export type CanadaCrsEntry = {
  spouse: string;
  firstLanguage: Levels;
  /** "none" = no second-language results; "tested" = results for the four abilities below. */
  secondLanguage: string;
  secondLanguageAbilities: Levels;
  education: string;
  credentials: string;
  certificateOfQualification: string;
  sibling: string;
  canadianStudy: string;
  provincialNomination: string;
  spouseEducation: string;
  spouseLanguage: Levels;
  spouseCanadianWork: string;
};

const blankLevels = (): Levels => ({ speaking: "", listening: "", reading: "", writing: "" });
export const blankCanadaCrsEntry = (): CanadaCrsEntry => ({
  spouse: "", firstLanguage: blankLevels(), secondLanguage: "", secondLanguageAbilities: blankLevels(), education: "", credentials: "",
  certificateOfQualification: "", sibling: "", canadianStudy: "", provincialNomination: "", spouseEducation: "", spouseLanguage: blankLevels(), spouseCanadianWork: "",
});

/** Form field names: one per answer. */
export const CRS_FIELD = {
  spouse: "crsSpouse",
  firstLanguage: (a: Ability) => `crsFirst_${a}`,
  secondLanguage: "crsSecondLanguage",
  secondLanguageAbility: (a: Ability) => `crsSecond_${a}`,
  education: "crsEducation",
  credentials: "crsCredentials",
  certificateOfQualification: "crsCertificate",
  sibling: "crsSibling",
  canadianStudy: "crsCanadianStudy",
  provincialNomination: "crsNomination",
  spouseEducation: "crsSpouseEducation",
  spouseLanguage: (a: Ability) => `crsSpouseLang_${a}`,
  spouseCanadianWork: "crsSpouseWork",
} as const;

const oneOf = <T extends string>(allowed: readonly T[], v: unknown): string => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? v : "");

/** Reads the entry from submitted values; anything not an allowed value reads as "not answered". */
export function parseCanadaCrsEntry(get: (name: string) => unknown): CanadaCrsEntry {
  const levels = (name: (a: Ability) => string, allowed: readonly string[]): Levels =>
    Object.fromEntries(ABILITIES.map((a) => [a, oneOf(allowed, get(name(a)))])) as Levels;
  const secondLanguage = oneOf(["none", "tested"], get(CRS_FIELD.secondLanguage));
  const spouse = oneOf(YES_NO, get(CRS_FIELD.spouse));
  return {
    spouse,
    firstLanguage: levels(CRS_FIELD.firstLanguage, CRS_CLB_LEVELS),
    secondLanguage,
    secondLanguageAbilities: secondLanguage === "tested" ? levels(CRS_FIELD.secondLanguageAbility, CRS_SECOND_BANDS) : blankLevels(),
    education: oneOf(CRS_EDUCATION_LEVELS, get(CRS_FIELD.education)),
    credentials: oneOf(CRS_CREDENTIAL_COUNTS, get(CRS_FIELD.credentials)),
    certificateOfQualification: oneOf(YES_NO, get(CRS_FIELD.certificateOfQualification)),
    sibling: oneOf(YES_NO, get(CRS_FIELD.sibling)),
    canadianStudy: oneOf(CRS_CANADIAN_STUDY, get(CRS_FIELD.canadianStudy)),
    provincialNomination: oneOf(YES_NO, get(CRS_FIELD.provincialNomination)),
    spouseEducation: spouse === "yes" ? oneOf(CRS_SPOUSE_EDUCATION_LEVELS, get(CRS_FIELD.spouseEducation)) : "",
    spouseLanguage: spouse === "yes" ? levels(CRS_FIELD.spouseLanguage, CRS_CLB_LEVELS) : blankLevels(),
    spouseCanadianWork: spouse === "yes" ? oneOf(CRS_SPOUSE_WORK, get(CRS_FIELD.spouseCanadianWork)) : "",
  };
}

/** True when the value looks like a stored entry (older reports and other countries have none). */
export const isCanadaCrsEntry = (v: unknown): v is CanadaCrsEntry => !!v && typeof v === "object" && "firstLanguage" in v && "spouse" in v;

export function canadaAgeBracket(age: string | number | undefined | null): CanadaAgeBracket | null {
  const n = typeof age === "number" ? age : parseInt(String(age ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= 17) return "17_or_less";
  if (n >= 45) return "45_or_more";
  if (n >= 20 && n <= 29) return "20_29";
  return String(n) as CanadaAgeBracket; // 18, 19 and 30-44 each have their own published row
}

/** Whole years of skilled Canadian work -> the CRS row (the form asks for years; part years round down). */
export function canadianWorkBracket(years: number | undefined): CanadianWorkExperienceYears | null {
  if (years === undefined || !Number.isFinite(years) || years < 0) return null;
  const y = Math.floor(years);
  return y < 1 ? "none_or_less_than_1yr" : y >= 5 ? "5_plus_years" : (`${y}_year${y === 1 ? "" : "s"}` as CanadianWorkExperienceYears);
}
export function foreignWorkBracket(years: number | undefined): "none" | "1_2_years" | "3_plus_years" | null {
  if (years === undefined || !Number.isFinite(years) || years < 0) return null;
  const y = Math.floor(years);
  return y < 1 ? "none" : y < 3 ? "1_2_years" : "3_plus_years";
}

const CLB_NUMBER: Record<string, number> = { less_than_CLB4: 0, CLB_4: 4, CLB_5: 5, CLB_6: 6, CLB_7: 7, CLB_8: 8, CLB_9: 9, CLB_10_plus: 10 };
/** The lowest first-language level across the four abilities, or undefined until all four are answered. */
export function lowestClb(levels: Levels): number | undefined {
  const values = ABILITIES.map((a) => CLB_NUMBER[levels[a]]);
  return values.some((v) => v === undefined) ? undefined : Math.min(...(values as number[]));
}
/** The older single qualification value (lib/intake/fields.ts QUALIFICATION_LEVELS) the rest of the product reads, from the CRS education answer. */
export function legacyEducationLevel(education: string): string {
  return education === "less_than_secondary" || education === "secondary_diploma" ? "High School"
    : education === "one_year_post_secondary" || education === "two_year_post_secondary" ? "Diploma"
      : education === "bachelors_or_3yr_program" || education === "two_or_more_credentials_one_3yr_plus" ? "Bachelor"
        : education === "masters_or_professional_degree" ? "Master's Degree (Coursework)"
          : education === "doctoral_phd" ? "PhD" : "";
}
/** The older single marital value for a spouse answer. */
export const legacySponsorOrFamily = (spouse: string): string => (spouse === "yes" ? "Spouse or common-law partner (accompanying)" : spouse === "no" ? "Single / No Spouse" : "");

/** The single legacy `englishLevel` value ("clb7", or "none" when the lowest level is below CLB 4) the rest of the product reads. */
export function legacyEnglishLevel(levels: Levels): string {
  const low = lowestClb(levels);
  return low === undefined ? "" : low < 4 ? "none" : `clb${low}`;
}

/** The wording of each answer, in the form and in the report (English: the Canada Assessment and report are English-only in this release). */
export const CRS_LABELS = {
  clb: { less_than_CLB4: "CLB 3 or lower, or no result", CLB_4: "CLB 4", CLB_5: "CLB 5", CLB_6: "CLB 6", CLB_7: "CLB 7", CLB_8: "CLB 8", CLB_9: "CLB 9", CLB_10_plus: "CLB 10 or higher" },
  secondBand: { CLB4_or_less: "CLB 4 or lower", CLB5_6: "CLB 5 or 6", CLB7_8: "CLB 7 or 8", CLB9_plus: "CLB 9 or higher" },
  education: {
    less_than_secondary: "Less than secondary school (high school)",
    secondary_diploma: "Secondary diploma (high school graduation)",
    one_year_post_secondary: "One-year degree, diploma or certificate",
    two_year_post_secondary: "Two-year degree, diploma or certificate",
    bachelors_or_3yr_program: "Bachelor's degree, or a degree, diploma or certificate of three or more years",
    two_or_more_credentials_one_3yr_plus: "Two or more credentials, at least one of them a program of three or more years",
    masters_or_professional_degree: "Master's degree, or a professional degree needed to practise a licensed profession",
    doctoral_phd: "Doctoral level university degree (PhD)",
  },
  credentials: { none: "No post-secondary credential", one: "One post-secondary credential", two_or_more: "Two or more post-secondary credentials" },
  canadianStudy: { none: "None", one_to_two_year_credential: "A one- or two-year post-secondary credential from a Canadian institution", three_year_plus_credential: "A post-secondary credential of three or more years (or a master's, professional or doctoral degree) from a Canadian institution" },
  spouseEducation: {
    less_than_secondary: "Less than secondary school", secondary: "Secondary diploma", one_year_post_secondary: "One-year post-secondary credential", two_year_post_secondary: "Two-year post-secondary credential",
    bachelors_or_3yr: "Bachelor's degree, or a credential of three or more years", two_or_more_credentials: "Two or more credentials, one of three or more years", masters_or_professional: "Master's or professional degree", doctoral: "Doctoral level degree (PhD)",
  },
  spouseWork: { none_or_less_1yr: "Less than 1 year", "1_year": "1 year", "2_years": "2 years", "3_years": "3 years", "4_years": "4 years", "5_plus_years": "5 years or more" },
  yesNo: { yes: "Yes", no: "No" },
} as const;

export type CrsFactorId =
  | "age" | "education" | "firstLanguage" | "secondLanguage" | "canadianWorkExperience"
  | "spouseOrPartnerFactors" | "skillTransferability"
  | "siblingInCanada" | "frenchLanguage" | "canadianStudy" | "provincialNomination";

export const CRS_FACTOR_LABEL: Record<CrsFactorId, string> = {
  age: "Age",
  education: "Level of education",
  firstLanguage: "First official language (four abilities)",
  secondLanguage: "Second official language (four abilities)",
  canadianWorkExperience: "Canadian work experience",
  spouseOrPartnerFactors: "Spouse or partner factors",
  skillTransferability: "Skill transferability factors",
  siblingInCanada: "Brother or sister in Canada",
  frenchLanguage: "French-language skills (additional points)",
  canadianStudy: "Study in Canada (additional points)",
  provincialNomination: "Provincial or territorial nomination",
};
export const CRS_FACTOR_ORDER: CrsFactorId[] = ["age", "education", "firstLanguage", "secondLanguage", "canadianWorkExperience", "spouseOrPartnerFactors", "skillTransferability", "siblingInCanada", "frenchLanguage", "canadianStudy", "provincialNomination"];

export type CanadaCrsAssessment = {
  /** complete: every factor was answered and the score is the calculated CRS score; partial: at least one factor was not answered; none: nothing could be calculated. */
  status: "complete" | "partial" | "none";
  /** The CRS score under the verified rules: only when status is "complete". */
  total?: number;
  /** The sum of the factors that WERE calculated, when status is "partial". It is not a CRS score. */
  partialSum?: number;
  calculated: Array<{ id: CrsFactorId; label: string; points: number }>;
  notCalculated: Array<{ id: CrsFactorId; label: string }>;
  configVersion: string;
  /** The answers entered, as label / value pairs for the report. */
  entered: Array<{ label: string; value: string }>;
  result?: CanadaCRSResult;
};

const levelText = (levels: Levels, map: Record<string, string>): string | null => (ABILITIES.every((x) => !!levels[x]) ? ABILITIES.map((x) => `${x[0].toUpperCase()}${x.slice(1)} ${map[levels[x]]}`).join("; ") : null);

/** The answers entered as label / value pairs (an unanswered question is left out, never shown as a value). */
export function enteredCrsAnswers(e: CanadaCrsEntry): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string | null | undefined) => { if (value) out.push({ label, value }); };
  add("Spouse or partner who will accompany you", e.spouse ? CRS_LABELS.yesNo[e.spouse as "yes" | "no"] : null);
  add("First official language results (per ability)", levelText(e.firstLanguage, CRS_LABELS.clb));
  add("Second official language results", e.secondLanguage === "none" ? "No second-language results" : levelText(e.secondLanguageAbilities, CRS_LABELS.secondBand));
  add("Level of education", CRS_LABELS.education[e.education as keyof typeof CRS_LABELS.education]);
  add("Number of post-secondary credentials", CRS_LABELS.credentials[e.credentials as keyof typeof CRS_LABELS.credentials]);
  add("Certificate of qualification in a skilled trade", e.certificateOfQualification ? CRS_LABELS.yesNo[e.certificateOfQualification as "yes" | "no"] : null);
  add("Brother or sister in Canada (citizen or permanent resident, 18 or older)", e.sibling ? CRS_LABELS.yesNo[e.sibling as "yes" | "no"] : null);
  add("Study in Canada", CRS_LABELS.canadianStudy[e.canadianStudy as keyof typeof CRS_LABELS.canadianStudy]);
  add("Provincial or territorial nomination", e.provincialNomination ? CRS_LABELS.yesNo[e.provincialNomination as "yes" | "no"] : null);
  if (e.spouse === "yes") {
    add("Spouse or partner: level of education", CRS_LABELS.spouseEducation[e.spouseEducation as keyof typeof CRS_LABELS.spouseEducation]);
    add("Spouse or partner: first official language results (per ability)", levelText(e.spouseLanguage, CRS_LABELS.clb));
    add("Spouse or partner: Canadian work experience", CRS_LABELS.spouseWork[e.spouseCanadianWork as keyof typeof CRS_LABELS.spouseWork]);
  }
  return out;
}

export type CanadaCrsAnswers = {
  entry: CanadaCrsEntry | undefined;
  age: string | undefined;
  /** Years of skilled work in Canada / outside Canada, as the form asks (the experience fields of step 3). */
  canadianWorkYears: number | undefined;
  foreignWorkYears: number | undefined;
};

const asLevel = (v: string): CLBLevel => v as CLBLevel;

/** What can be calculated from the answers, factor by factor. Never throws and never guesses an unanswered factor. */
export function assessCanadaCrs(a: CanadaCrsAnswers): CanadaCrsAssessment {
  const e = a.entry ?? blankCanadaCrsEntry();
  const age = canadaAgeBracket(a.age);
  const spouseAnswered = e.spouse === "yes" || e.spouse === "no";
  const hasSpouse = e.spouse === "yes";
  const firstAnswered = ABILITIES.every((x) => !!e.firstLanguage[x]);
  const secondAnswered = e.secondLanguage === "none" || (e.secondLanguage === "tested" && ABILITIES.every((x) => !!e.secondLanguageAbilities[x]));
  const canadianWork = canadianWorkBracket(a.canadianWorkYears);
  const foreignWork = foreignWorkBracket(a.foreignWorkYears);
  const spouseAnswers = e.spouseEducation && ABILITIES.every((x) => !!e.spouseLanguage[x]) && e.spouseCanadianWork;

  // Which factors can be scored: the core tables differ with and without a spouse or partner, so nothing is scored until that is answered.
  const can: Record<CrsFactorId, boolean> = {
    age: spouseAnswered && age !== null,
    education: spouseAnswered && !!e.education,
    firstLanguage: spouseAnswered && firstAnswered,
    secondLanguage: spouseAnswered && secondAnswered,
    canadianWorkExperience: spouseAnswered && canadianWork !== null,
    spouseOrPartnerFactors: spouseAnswered && (!hasSpouse || !!spouseAnswers),
    skillTransferability: spouseAnswered && firstAnswered && canadianWork !== null && foreignWork !== null && !!e.credentials && !!e.certificateOfQualification,
    siblingInCanada: !!e.sibling,
    frenchLanguage: firstAnswered && secondAnswered,
    canadianStudy: !!e.canadianStudy,
    provincialNomination: !!e.provincialNomination,
  };

  // Fill unanswered inputs with neutral values ONLY to run the calculator; their factors are excluded from the sums below.
  const second = e.secondLanguage === "tested"
    ? Object.fromEntries(ABILITIES.map((x) => [x, (e.secondLanguageAbilities[x] || "none") as SecondLanguageCLBBand | "none"])) as Record<Ability, SecondLanguageCLBBand | "none">
    : { speaking: "none", listening: "none", reading: "none", writing: "none" } as Record<Ability, SecondLanguageCLBBand | "none">;
  const first = Object.fromEntries(ABILITIES.map((x) => [x, asLevel(e.firstLanguage[x] || "not_selected")])) as Record<Ability, CLBLevel>;
  const lowestFirst = lowestClb(e.firstLanguage);
  const secondAllSeven = ABILITIES.every((x) => second[x] === "CLB7_8" || second[x] === "CLB9_plus");
  const french: CanadaCRSInput["frenchAbility"] = e.secondLanguage === "tested" && secondAllSeven && lowestFirst !== undefined
    ? (lowestFirst >= 5 ? "NCLC7_plus_english_CLB5_plus" : "NCLC7_plus_english_CLB4_or_less")
    : "none";
  const input: CanadaCRSInput = {
    hasSpouseOrPartner: hasSpouse,
    age: age ?? "not_selected",
    education: (e.education || "not_selected") as CanadaEducationLevel,
    firstLanguageAbilityScores: first,
    secondLanguageBand: "none",
    secondLanguageAbilityScores: second,
    canadianWorkExperience: canadianWork ?? "none_or_less_than_1yr",
    spouse: hasSpouse && spouseAnswers
      ? {
          education: e.spouseEducation as CanadaSpouseEducationLevel,
          firstLanguageAbilityScores: Object.fromEntries(ABILITIES.map((x) => [x, asLevel(e.spouseLanguage[x])])) as Record<Ability, CLBLevel>,
          canadianWorkExperience: e.spouseCanadianWork as SpouseCanadianWorkExperienceYears,
        }
      : undefined,
    postSecondaryCredentialCount: (e.credentials || "none") as CanadaCRSInput["postSecondaryCredentialCount"],
    foreignWorkExperienceYears: foreignWork ?? "none",
    hasCertificateOfQualification: e.certificateOfQualification === "yes",
    hasSiblingInCanada: e.sibling === "yes",
    frenchAbility: french,
    canadianPostSecondaryCredentialYears: (e.canadianStudy || "none") as CanadaCRSInput["canadianPostSecondaryCredentialYears"],
    hasProvincialNomination: e.provincialNomination === "yes",
  };
  const r = calculateCanadaCRS(input);
  const points: Record<CrsFactorId, number> = {
    age: r.breakdown.coreHumanCapital.age,
    education: r.breakdown.coreHumanCapital.education,
    firstLanguage: r.breakdown.coreHumanCapital.firstLanguage,
    secondLanguage: r.breakdown.coreHumanCapital.secondLanguage,
    canadianWorkExperience: r.breakdown.coreHumanCapital.canadianWorkExperience,
    spouseOrPartnerFactors: r.breakdown.spouseFactors.total,
    skillTransferability: r.breakdown.skillTransferability.total,
    siblingInCanada: r.breakdown.additionalPoints.sibling,
    frenchLanguage: r.breakdown.additionalPoints.french,
    canadianStudy: r.breakdown.additionalPoints.canadianEducation,
    provincialNomination: r.breakdown.additionalPoints.provincialNomination,
  };
  const calculated = CRS_FACTOR_ORDER.filter((id) => can[id]).map((id) => ({ id, label: CRS_FACTOR_LABEL[id], points: points[id] }));
  const notCalculated = CRS_FACTOR_ORDER.filter((id) => !can[id]).map((id) => ({ id, label: CRS_FACTOR_LABEL[id] }));
  const sum = calculated.reduce((s, f) => s + f.points, 0);
  if (!notCalculated.length && !r.notCalculated.length) return { status: "complete", total: r.totalScore, calculated, notCalculated, configVersion: r.configVersion, entered: enteredCrsAnswers(e), result: r };
  return { status: calculated.length ? "partial" : "none", ...(calculated.length ? { partialSum: sum } : {}), calculated, notCalculated, configVersion: r.configVersion, entered: enteredCrsAnswers(e) };
}

/** The factors the Assessment collects that the verified implementation cannot score (none today); kept explicit so a gap is visible rather than silent. */
export const CRS_FACTORS_NOT_IMPLEMENTED: string[] = [];
