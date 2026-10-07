/**
 * What the visitor entered, one row per intake field the report reads (and the gate matrix's `intakeFields` name): the
 * "profile facts supplied" and the "what you entered" column of the requirement map. value = null means not provided --
 * never a default, never a zero. Pure; localised labels for the enumerations.
 */
import { AU_ENGLISH_LEVEL_OPTIONS, EDUCATION_OPTIONS, optionLabel } from "@/lib/intake/fields";
import { partnerAnswerOf, skillsAssessmentAnswerOf } from "./input-status";
import type { Locale, ReadinessInput } from "./types";

export type SuppliedFact = { field: string; value: string | null };

const L = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);
const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== "";

const QUAL_ALIASES: Record<string, string> = { "Bachelor's Degree": "Bachelor", "Master's Degree (Coursework)": "Master's Degree (Research)", "PhD/Doctorate": "PhD" };

function qualificationText(level: string, locale: Locale): string {
  if (level === "Master's Degree (Coursework)") return L(locale, "Master's (Coursework)", "Yüksek Lisans (Ders)", "授课型硕士");
  const opt = EDUCATION_OPTIONS.find((o) => o.value === (QUAL_ALIASES[level] ?? level));
  return opt ? optionLabel(opt, locale) : level;
}

const yn = (b: boolean | undefined, l: Locale) => (b === undefined ? null : b ? L(l, "Yes", "Evet", "是") : L(l, "No", "Hayır", "否"));
const years = (n: number | undefined, l: Locale) => (n === undefined ? null : L(l, `${n} year${n === 1 ? "" : "s"}`, `${n} yıl`, `${n} 年`));

const PARTNER_TEXT: Record<string, [string, string, string]> = {
  single: ["Single / no dependants", "Bekar / bağımlı yok", "单身 / 无家属"],
  skilled: ["Partner with Competent English and a positive skills assessment", "Competent İngilizceli ve olumlu beceri değerlendirmeli partner", "伴侣具备胜任英语且技能评估为正面"],
  competent_english: ["Partner with Competent English only", "Yalnızca Competent İngilizceli partner", "伴侣仅具备胜任英语"],
  no_functional_english: ["Partner / dependants without Functional English", "İşlevsel İngilizcesi olmayan partner / bağımlılar", "伴侣 / 家属无功能性英语"],
};

export function buildSuppliedFacts(input: ReadinessInput, locale: Locale): SuppliedFact[] {
  const english = AU_ENGLISH_LEVEL_OPTIONS.find((o) => o.value === (input.englishLevel ?? "").trim().toLowerCase());
  const skills = skillsAssessmentAnswerOf(input);
  const partner = partnerAnswerOf(input.sponsorOrFamily);
  const pt = partner === "unknown" ? null : PARTNER_TEXT[partner];
  return [
    { field: "occupation", value: has(input.occupation) ? String(input.occupation).trim() : null },
    { field: "age", value: has(input.age) ? String(input.age).trim() : null },
    { field: "englishLevel", value: english ? optionLabel(english, locale) : has(input.englishLevel) ? String(input.englishLevel) : null },
    { field: "qualificationLevel", value: has(input.qualificationLevel) ? qualificationText(String(input.qualificationLevel), locale) : null },
    { field: "qualificationAwardedInAustralia", value: yn(input.qualificationAwardedInAustralia, locale) },
    { field: "offshoreExperienceYears", value: years(input.offshoreExperienceYears, locale) },
    { field: "onshoreExperienceYears", value: years(input.onshoreExperienceYears, locale) },
    { field: "sponsorOrFamily", value: pt ? L(locale, pt[0], pt[1], pt[2]) : null },
    { field: "occupationConfirmed", value: skills === "yes" ? L(locale, "Yes", "Evet", "是") : skills === "no" ? L(locale, "No", "Hayır", "否") : null },
    { field: "annualSalaryAud", value: input.annualSalaryAud !== undefined && input.annualSalaryAud !== null ? `AUD ${Number(input.annualSalaryAud).toLocaleString("en-AU")}` : null },
    { field: "currentCountry", value: has(input.currentCountry) ? String(input.currentCountry).trim() : null },
    { field: "passportCountry", value: has(input.passportCountry) ? String(input.passportCountry).trim() : null },
    { field: "residenceState", value: has(input.residenceState) ? String(input.residenceState) : null },
    { field: "preferredState", value: has(input.preferredState) ? String(input.preferredState) : null },
    { field: "yearsInSponsoredPosition", value: years(input.yearsInSponsoredPosition, locale) },
  ];
}
