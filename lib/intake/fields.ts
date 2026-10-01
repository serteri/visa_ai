import type { AuStateCode, ReadinessInput } from "@/lib/readiness/types";

/**
 * Intake field definitions and validation shared by the full intake form (app/[locale]/(main)/full-check: the step
 * components, and the server action that validates the submission) and the in-chat quick profile card
 * (components/ChatQuickProfileCard.tsx, app/api/chat/profile). One list per field, so both collect the same values.
 */

type L = { en: string; tr: string; zh: string };
export type FieldOption = { value: string; label: L };
export const optionLabel = (o: FieldOption, locale: string) => (locale === "tr" ? o.label.tr : locale === "zh-Hans" ? o.label.zh : o.label.en);

/** AU English level (the points-test bands). */
export const AU_ENGLISH_LEVEL_OPTIONS: FieldOption[] = [
  { value: "none", label: { en: "No test", tr: "Test almadım", zh: "未测试" } },
  { value: "competent", label: { en: "Competent (IELTS 6)", tr: "Competent (IELTS 6)", zh: "胜任 (雅思6)" } },
  { value: "proficient", label: { en: "Proficient (IELTS 7)", tr: "Proficient (IELTS 7)", zh: "熟练 (雅思7)" } },
  { value: "superior", label: { en: "Superior (IELTS 8+)", tr: "Superior (IELTS 8+)", zh: "优秀 (雅思8+)" } },
];
/** Every English value the server accepts (the form's select offers the AU list above). */
export const ENGLISH_LEVEL_VALUES = ["none", "competent", "proficient", "superior"] as const;

/** Highest qualification, as offered on the form. */
export const EDUCATION_OPTIONS: FieldOption[] = [
  { value: "High School", label: { en: "High School", tr: "Lise", zh: "高中" } },
  { value: "Diploma", label: { en: "Diploma / Trade", tr: "Diploma / Trade", zh: "文凭/技工" } },
  { value: "Bachelor", label: { en: "Bachelor's Degree", tr: "Lisans", zh: "学士" } },
  { value: "Master's Degree (Research)", label: { en: "Master's (Research)", tr: "Yüksek Lisans (Araştırma)", zh: "研究型硕士" } },
  { value: "PhD", label: { en: "PhD/Doctorate", tr: "Doktora", zh: "博士" } },
];
/** Every qualification value the server accepts (older form versions sent the longer names). */
export const QUALIFICATION_LEVELS: NonNullable<ReadinessInput["qualificationLevel"]>[] = [
  "High School",
  "Bachelor's Degree",
  "Master's Degree (Coursework)",
  "Master's Degree (Research)",
  "PhD/Doctorate",
  "PhD",
  "Bachelor",
  "Diploma",
  "Certificate",
  "Other",
];

export const AU_STATE_CODES: AuStateCode[] = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

/** Current visa (quick profile card): the subclasses the engine and the gate matrix know, plus none / other. */
export const CURRENT_VISA_OPTIONS: FieldOption[] = [
  { value: "none", label: { en: "No Australian visa / outside Australia", tr: "Avustralya vizesi yok / Avustralya dışında", zh: "无澳大利亚签证 / 不在澳大利亚" } },
  { value: "500", label: { en: "Student visa (subclass 500)", tr: "Öğrenci vizesi (subclass 500)", zh: "学生签证（500）" } },
  { value: "485", label: { en: "Temporary Graduate visa (subclass 485)", tr: "Geçici Mezun vizesi (subclass 485)", zh: "临时毕业生签证（485）" } },
  { value: "482", label: { en: "Skills in Demand / TSS visa (subclass 482 / 457)", tr: "Skills in Demand / TSS vizesi (subclass 482 / 457)", zh: "技能需求 / TSS 签证（482 / 457）" } },
  { value: "491", label: { en: "Skilled Work Regional visa (subclass 491)", tr: "Bölgesel Nitelikli Çalışma vizesi (subclass 491)", zh: "偏远地区技术工作签证（491）" } },
  { value: "820", label: { en: "Partner visa (subclass 820)", tr: "Partner vizesi (subclass 820)", zh: "伴侣签证（820）" } },
  { value: "600", label: { en: "Visitor visa (subclass 600)", tr: "Ziyaretçi vizesi (subclass 600)", zh: "访客签证（600）" } },
  { value: "other", label: { en: "Other visa", tr: "Diğer vize", zh: "其他签证" } },
];
export const CURRENT_VISA_VALUES = CURRENT_VISA_OPTIONS.map((o) => o.value);

/** The form's experience-years rule: empty = not entered; otherwise a number from 0 to 50. */
export function parseExperienceYears(value: unknown): { ok: true; value: number | undefined } | { ok: false } {
  if (value === null || value === undefined) return { ok: true, value: undefined };
  const s = String(value).trim();
  if (!s) return { ok: true, value: undefined };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? { ok: true, value: n } : { ok: false };
}

export function isEnglishLevel(v: unknown): v is (typeof ENGLISH_LEVEL_VALUES)[number] {
  return typeof v === "string" && (ENGLISH_LEVEL_VALUES as readonly string[]).includes(v);
}
export function isQualificationLevel(v: unknown): v is NonNullable<ReadinessInput["qualificationLevel"]> {
  return typeof v === "string" && (QUALIFICATION_LEVELS as string[]).includes(v);
}
export function isAuStateCode(v: unknown): v is AuStateCode {
  return typeof v === "string" && (AU_STATE_CODES as string[]).includes(v);
}

/** Current country, as the intake form offers it (step 1). */
export const INTAKE_COUNTRIES = [
  { code: "AU", label: { en: "Australia", tr: "Avustralya", "zh-Hans": "澳大利亚" } },
  { code: "TR", label: { en: "Turkey", tr: "Türkiye", "zh-Hans": "土耳其" } },
  { code: "IN", label: { en: "India", tr: "Hindistan", "zh-Hans": "印度" } },
  { code: "CN", label: { en: "China", tr: "Çin", "zh-Hans": "中国" } },
  { code: "GB", label: { en: "United Kingdom", tr: "Birleşik Krallık", "zh-Hans": "英国" } },
  { code: "US", label: { en: "United States", tr: "Amerika Birleşik Devletleri", "zh-Hans": "美国" } },
  { code: "CA", label: { en: "Canada", tr: "Kanada", "zh-Hans": "加拿大" } },
  { code: "NZ", label: { en: "New Zealand", tr: "Yeni Zelanda", "zh-Hans": "新西兰" } },
  { code: "PK", label: { en: "Pakistan", tr: "Pakistan", "zh-Hans": "巴基斯坦" } },
  { code: "BD", label: { en: "Bangladesh", tr: "Bangladeş", "zh-Hans": "孟加拉国" } },
  { code: "NP", label: { en: "Nepal", tr: "Nepal", "zh-Hans": "尼泊尔" } },
  { code: "PH", label: { en: "Philippines", tr: "Filipinler", "zh-Hans": "菲律宾" } },
  { code: "VN", label: { en: "Vietnam", tr: "Vietnam", "zh-Hans": "越南" } },
  { code: "ID", label: { en: "Indonesia", tr: "Endonezya", "zh-Hans": "印度尼西亚" } },
  { code: "MY", label: { en: "Malaysia", tr: "Malezya", "zh-Hans": "马来西亚" } },
  { code: "SG", label: { en: "Singapore", tr: "Singapur", "zh-Hans": "新加坡" } },
  { code: "ZA", label: { en: "South Africa", tr: "Güney Afrika", "zh-Hans": "南非" } },
  { code: "BR", label: { en: "Brazil", tr: "Brezilya", "zh-Hans": "巴西" } },
  { code: "MX", label: { en: "Mexico", tr: "Meksika", "zh-Hans": "墨西哥" } },
  { code: "DE", label: { en: "Germany", tr: "Almanya", "zh-Hans": "德国" } },
  { code: "FR", label: { en: "France", tr: "Fransa", "zh-Hans": "法国" } },
  { code: "IT", label: { en: "Italy", tr: "İtalya", "zh-Hans": "意大利" } },
  { code: "ES", label: { en: "Spain", tr: "İspanya", "zh-Hans": "西班牙" } },
  { code: "OTHER", label: { en: "Other", tr: "Diğer", "zh-Hans": "其他" } },
] as const;
