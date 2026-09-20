import type { Locale } from "../types";

/**
 * The two-part AU skills-assessment claim shown in the EOI STATUS banner and
 * the executive summary. One source so the banner and the summary cannot
 * drift apart (or repeat themselves) again:
 *   1. skilled-employment points are not counted until a positive assessment
 *      is confirmed;
 *   2. a positive assessment is also required before a visa application can
 *      be lodged.
 */
export function skillsAssessmentClaim(locale: Locale): { pointsNotCounted: string; requiredBeforeLodging: string; joiner: string } {
  if (locale === "tr") {
    return {
      pointsNotCounted: "Beceriye dayalı istihdam puanları, olumlu bir Beceri Değerlendirmesi onaylanana kadar bu raporda sayılmaz.",
      requiredBeforeLodging: "Bir vize başvurusu yapılabilmesi için ayrıca olumlu bir Beceri Değerlendirmesi gereklidir.",
      joiner: " ",
    };
  }
  if (locale === "zh-Hans") {
    return {
      pointsNotCounted: "在获得正面的技能评估结果之前，本报告不计入技能就业积分。",
      requiredBeforeLodging: "此外，提交签证申请前也需要获得正面的技能评估结果。",
      joiner: "",
    };
  }
  return {
    pointsNotCounted: "Skilled-employment points are not counted in this report until a positive Skills Assessment is confirmed.",
    requiredBeforeLodging: "A positive Skills Assessment is also required before a visa application can be lodged.",
    joiner: " ",
  };
}

/** Both sentences, joined for the locale. */
export function skillsAssessmentClaimText(locale: Locale): string {
  const c = skillsAssessmentClaim(locale);
  return `${c.pointsNotCounted}${c.joiner}${c.requiredBeforeLodging}`;
}
