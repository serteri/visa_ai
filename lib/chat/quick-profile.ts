import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { canonicalizeOccupationInput } from "@/lib/readiness/occupation-eligibility";
import { CURRENT_VISA_VALUES, isAuStateCode, isEnglishLevel, isQualificationLevel, parseExperienceYears } from "@/lib/intake/fields";

/**
 * The in-chat quick profile card: the key intake fields for a premium visitor who has no linked report. Validated with
 * the intake form's own rules (lib/intake/fields.ts), turned into a ReadinessInput, run through the REPORT engine, and
 * stored against the visitor (ChatVisitorProfile). The chat then answers from the engine's result -- points
 * breakdown, gate results per visa, available states, benchmark gaps -- exactly as it does from a stored report.
 */

export type QuickProfileFields = {
  age: string;
  occupation: string;
  englishLevel: string;
  qualificationLevel: string;
  /** "yes" | "no": the highest qualification was completed in Australia. */
  qualificationAwardedInAustralia: "yes" | "no";
  onshoreExperienceYears?: number;
  offshoreExperienceYears?: number;
  /** "yes" | "no": a positive skills assessment is on file. */
  skillsAssessment: "yes" | "no";
  currentCountry: string;
  /** Required when currentCountry is "AU" (the intake's rule). */
  residenceState?: string;
  currentVisa: string;
};

type Msg = { en: string; tr: string; zh: string };
const pick = (locale: Locale, m: Msg) => (locale === "tr" ? m.tr : locale === "zh-Hans" ? m.zh : m.en);
const REQUIRED: Msg = { en: "This field is required.", tr: "Bu alan zorunludur.", zh: "此项为必填。" };
const INVALID: Msg = { en: "Please choose a valid option.", tr: "Lütfen geçerli bir seçenek seçin.", zh: "请选择有效选项。" };
const AGE: Msg = { en: "Enter an age between 16 and 80.", tr: "16 ile 80 arasında bir yaş girin.", zh: "请输入 16 到 80 之间的年龄。" };
const YEARS: Msg = {
  en: "Experience years must be a number greater than or equal to 0.",
  tr: "Deneyim yılı 0 veya daha büyük bir sayı olmalıdır.",
  zh: "工作年限必须是大于或等于 0 的数字。",
};

export function validateQuickProfile(
  raw: Record<string, unknown>,
  locale: Locale
): { ok: true; fields: QuickProfileFields } | { ok: false; errors: Record<string, string> } {
  const s = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : raw[k] === undefined || raw[k] === null ? "" : String(raw[k]).trim());
  const errors: Record<string, string> = {};

  const ageNum = Number(s("age"));
  if (!s("age")) errors.age = pick(locale, REQUIRED);
  else if (!Number.isInteger(ageNum) || ageNum < 16 || ageNum > 80) errors.age = pick(locale, AGE);

  const occupation = canonicalizeOccupationInput(s("occupation"));
  if (!occupation) errors.occupation = pick(locale, REQUIRED);

  if (!s("englishLevel")) errors.englishLevel = pick(locale, REQUIRED);
  else if (!isEnglishLevel(s("englishLevel"))) errors.englishLevel = pick(locale, INVALID);

  if (!s("qualificationLevel")) errors.qualificationLevel = pick(locale, REQUIRED);
  else if (!isQualificationLevel(s("qualificationLevel"))) errors.qualificationLevel = pick(locale, INVALID);

  const inAu = s("qualificationAwardedInAustralia");
  if (inAu !== "yes" && inAu !== "no") errors.qualificationAwardedInAustralia = pick(locale, REQUIRED);

  const on = parseExperienceYears(raw.onshoreExperienceYears);
  const off = parseExperienceYears(raw.offshoreExperienceYears);
  if (!on.ok) errors.onshoreExperienceYears = pick(locale, YEARS);
  if (!off.ok) errors.offshoreExperienceYears = pick(locale, YEARS);

  const sa = s("skillsAssessment");
  if (sa !== "yes" && sa !== "no") errors.skillsAssessment = pick(locale, REQUIRED);

  const currentCountry = s("currentCountry");
  if (!currentCountry) errors.currentCountry = pick(locale, REQUIRED);
  const residenceState = s("residenceState");
  if (currentCountry === "AU" && !isAuStateCode(residenceState)) errors.residenceState = pick(locale, REQUIRED);

  const currentVisa = s("currentVisa");
  if (!currentVisa) errors.currentVisa = pick(locale, REQUIRED);
  else if (!CURRENT_VISA_VALUES.includes(currentVisa)) errors.currentVisa = pick(locale, INVALID);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      age: String(ageNum),
      occupation,
      englishLevel: s("englishLevel"),
      qualificationLevel: s("qualificationLevel"),
      qualificationAwardedInAustralia: inAu as "yes" | "no",
      ...(on.ok && on.value !== undefined ? { onshoreExperienceYears: on.value } : {}),
      ...(off.ok && off.value !== undefined ? { offshoreExperienceYears: off.value } : {}),
      skillsAssessment: sa as "yes" | "no",
      currentCountry,
      ...(currentCountry === "AU" ? { residenceState } : {}),
      currentVisa,
    },
  };
}

/** The engine input for the card's fields, built the way the intake action builds it for the same answers. */
export function quickProfileToInput(f: QuickProfileFields, locale: Locale): ReadinessInput {
  const studentOrGraduate = f.currentVisa === "500" || f.currentVisa === "485";
  return {
    locale,
    country: "AU",
    mainGoal: "",
    age: f.age,
    occupation: f.occupation,
    englishLevel: f.englishLevel,
    qualificationLevel: f.qualificationLevel as ReadinessInput["qualificationLevel"],
    qualificationAwardedInAustralia: f.qualificationAwardedInAustralia === "yes",
    ...(f.onshoreExperienceYears !== undefined ? { onshoreExperienceYears: f.onshoreExperienceYears } : {}),
    ...(f.offshoreExperienceYears !== undefined ? { offshoreExperienceYears: f.offshoreExperienceYears } : {}),
    occupationConfirmed: f.skillsAssessment,
    currentCountry: f.currentCountry,
    ...(f.residenceState ? { residenceState: f.residenceState as ReadinessInput["residenceState"] } : {}),
    currentVisaSubclass: f.currentVisa,
    // The skilled pathways the report evaluates for a "direct PR" goal; a student / graduate also gets the 485.
    migrationGoals: ["direct_pr"],
    ...(studentOrGraduate ? { hasGraduateVisaPathwayIntent: true } : {}),
  };
}

/** The card's fields back from a stored engine input (for editing). */
export function inputToQuickProfile(input: Partial<ReadinessInput>): Partial<QuickProfileFields> {
  return {
    age: input.age,
    occupation: input.occupation,
    englishLevel: input.englishLevel,
    qualificationLevel: input.qualificationLevel,
    qualificationAwardedInAustralia: input.qualificationAwardedInAustralia === true ? "yes" : input.qualificationAwardedInAustralia === false ? "no" : undefined,
    onshoreExperienceYears: input.onshoreExperienceYears,
    offshoreExperienceYears: input.offshoreExperienceYears,
    skillsAssessment: input.occupationConfirmed === "yes" ? "yes" : input.occupationConfirmed === "no" ? "no" : undefined,
    currentCountry: input.currentCountry,
    residenceState: input.residenceState,
    currentVisa: input.currentVisaSubclass,
  };
}

export interface QuickProfileStore {
  get(visitorId: string): Promise<{ inputJson: unknown; reportJson: unknown; updatedAt: Date } | null>;
  save(visitorId: string, input: ReadinessInput, report: ReadinessReport): Promise<void>;
}

/** A missing table (scripts/add-chat-profile-table.ts not run yet) reads as "no quick profile". */
export function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === "P2021" || /chat_visitor_profiles|does not exist|42P01/i.test(String(e?.message ?? ""));
}
