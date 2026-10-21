/**
 * The Canada report's one disclaimer: on the cover and in the footer of every page. The Canadian counterpart of lib/reports/report-disclaimer.ts,
 * naming the Canadian regulated professions (RCIC, lawyer) and none of the Australian ones. en / tr / zh-Hans.
 */
export const CANADA_REPORT_DISCLAIMER = {
  en: "General information based on published sources. Not immigration assistance or advice about your application. LogiVisa is not a licensed immigration consultant (RCIC) or a lawyer.",
  tr: "Yayımlanmış kaynaklara dayalı genel bilgidir. Göçmenlik yardımı veya başvurunuza ilişkin tavsiye değildir. LogiVisa lisanslı bir göçmenlik danışmanı (RCIC) veya avukat değildir.",
  "zh-Hans": "基于公开来源的一般信息。不构成移民协助，也不构成针对您申请的建议。LogiVisa 不是持牌移民顾问（RCIC），也不是律师。",
} as const;

export const canadaDisclaimer = (locale: string): string => (locale === "tr" ? CANADA_REPORT_DISCLAIMER.tr : locale === "zh-Hans" ? CANADA_REPORT_DISCLAIMER["zh-Hans"] : CANADA_REPORT_DISCLAIMER.en);
