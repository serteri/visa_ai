/**
 * The one disclaimer of the information report: on the cover and in the footer of every page (PDF) and at the end of the result page. It
 * replaces the old "automated data analysis ... for strategic planning and visa applications consult a registered migration agent (MARA)"
 * footer, which is removed everywhere. en / tr / zh-Hans.
 */
export const REPORT_DISCLAIMER = {
  en: "General information based on published sources. Not immigration assistance or advice about your visa application. LogiVisa is not a registered migration agent.",
  tr: "Yayımlanmış kaynaklara dayalı genel bilgidir. Göçmenlik yardımı veya vize başvurunuza ilişkin tavsiye değildir. LogiVisa kayıtlı bir göçmenlik danışmanı (migration agent) değildir.",
  "zh-Hans": "基于公开来源的一般信息。不构成移民协助，也不构成针对您签证申请的建议。LogiVisa 不是注册移民代理。",
} as const;

export const reportDisclaimer = (locale: string): string => (locale === "tr" ? REPORT_DISCLAIMER.tr : locale === "zh-Hans" ? REPORT_DISCLAIMER["zh-Hans"] : REPORT_DISCLAIMER.en);
