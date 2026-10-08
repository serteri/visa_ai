import type { Locale } from "@/lib/readiness/types";

export const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

/** The label every line carries. */
export type FactTag = "supplied" | "calculation" | "published_requirement" | "published_program" | "unknown";
/**
 * What the report knows about the information for a requirement, never whether it is met: entered / not entered / not collected by the form.
 * ("Provided" and "Cannot determine" were removed: they read as "met" and as an unexplained outcome.)
 */
export type RequirementStatus = "provided" | "not_provided" | "not_collected";

export const tagsFor = (l: Locale): Record<FactTag, string> => ({
  supplied: T(l, "Supplied by you", "Sizin girdiğiniz", "您提供"),
  calculation: T(l, "Calculation", "Hesaplama", "计算"),
  published_requirement: T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"),
  published_program: T(l, "Published program / historical data", "Yayımlanmış program / geçmiş veri", "已公布的项目 / 历史数据"),
  unknown: T(l, "Unknown", "Bilinmiyor", "未知"),
});

export const statusLabel = (s: RequirementStatus, l: Locale) =>
  s === "provided"
    ? T(l, "Information entered", "Bilgi girildi", "已填写信息")
    : s === "not_provided"
      ? T(l, "Not entered", "Girilmedi", "未填写")
      : T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集");

export const FACT_LABEL: Record<string, [string, string, string]> = {
  occupation: ["Occupation", "Meslek", "职业"],
  age: ["Age", "Yaş", "年龄"],
  englishLevel: ["English level", "İngilizce düzeyi", "英语水平"],
  qualificationLevel: ["Highest qualification", "En yüksek eğitim", "最高学历"],
  qualificationAwardedInAustralia: ["Qualification awarded in Australia", "Eğitim Avustralya'da alındı", "学历在澳大利亚取得"],
  offshoreExperienceYears: ["Employment outside Australia", "Avustralya dışındaki çalışma", "澳大利亚境外工作经验"],
  onshoreExperienceYears: ["Employment in Australia", "Avustralya'daki çalışma", "澳大利亚境内工作经验"],
  sponsorOrFamily: ["Partner status", "Partner durumu", "伴侣情况"],
  occupationConfirmed: ["Skills assessment completed", "Beceri değerlendirmesi tamamlandı", "技能评估已完成"],
  annualSalaryAud: ["Annual salary", "Yıllık maaş", "年薪"],
  currentCountry: ["Current country", "Bulunduğunuz ülke", "当前所在国家"],
  passportCountry: ["Passport country", "Pasaport ülkesi", "护照国家"],
  residenceState: ["State of residence", "İkamet edilen eyalet", "居住的州"],
  preferredState: ["State of interest", "İlgilenilen eyalet", "感兴趣的州"],
  yearsInSponsoredPosition: ["Years under an approved sponsor", "Onaylı sponsor altında yıl", "在经批准的担保方名下的年数"],
};
export const factLabel = (field: string, l: Locale) => {
  const f = FACT_LABEL[field];
  return f ? T(l, f[0], f[1], f[2]) : field;
};

/** "1 year" / "3 years" (Turkish and Chinese do not inflect the unit). */
export const yearsText = (n: number, l: Locale) => {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return l === "tr" ? `${v} yıl` : l === "zh-Hans" ? `${v} 年` : n === 1 ? `${v} year` : `${v} years`;
};

export const money = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/** A short form of a sentence: whole when short, else cut at a clause boundary before max, else at a word. */
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf("，"), head.lastIndexOf("；"), head.lastIndexOf(". "));
  if (clause > max * 0.5) return `${head.slice(0, clause)}${/[一-鿿]/.test(head) ? "。" : "."}`;
  return `${head.replace(/\s+\S*$/, "")}…`;
}

/** The first sentence of a text. */
export const firstSentence = (text: string) => (text.split(/(?<=[.。!?])\s+/)[0] ?? text).trim();
