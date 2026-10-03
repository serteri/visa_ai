/**
 * Australian Computer Society (ACS) skills assessment fees, read from the git-committed transcription
 * src/data/skills-assessment/acs-fees.json (ACS Migration Skills Assessment guide, fee increase effective 3 November
 * 2025: fee table p.1 and the pathway pages 15, 19, 21, 22; provenance facts acs_* in src/data/fee-provenance.json).
 *
 * Every ACS fee is stated EXCLUDING GST. The guide does not say who pays GST, so the report applies the rule it
 * applies for AIMS and Engineers Australia: an applicant in Australia sees the GST-inclusive figure (x 1.10), one
 * outside Australia the GST-exclusive figure (selectPrimaryFee by applicantLocation; no country -> in Australia).
 * That rule is the report's, not ACS's, and every figure that uses it says so. The guide states no processing time.
 */
import type { AuthorityFee, LocalizedString } from "./types";
import data from "@/src/data/skills-assessment/acs-fees.json";

type Fee = (typeof data.fees)[number];
type Locale = "en" | "tr" | "zh-Hans";

export const ACS_FEES_SOURCE = { document: data.sourceDocument, title: data.sourceTitle, extractedDate: data.extractedDate, effectiveFrom: data.effectiveFrom } as const;
export const ACS_FEES: readonly Fee[] = data.fees;
export const ACS_GST_RATE = data.gstRule.gstRate;

export function acsFee(id: string): Fee {
  const fee = data.fees.find((f) => f.id === id);
  if (!fee) throw new Error(`acs-fees.json has no "${id}" -- update src/data/skills-assessment/acs-fees.json from the ACS guide`);
  return fee;
}

/** Excl. GST x 1.10, rounded to the cent (1,498 -> 1,647.80). */
export const acsInclGst = (exclGst: number): number => Math.round(exclGst * (1 + ACS_GST_RATE) * 100) / 100;

const pages = (f: Fee, l: Locale) => (l === "en" ? `ACS p.${f.pages.join(", ")}` : l === "tr" ? `ACS s.${f.pages.join(", ")}` : `ACS 第 ${f.pages.join("、")} 页`);
// Short on purpose: it sits in the fee cell of the report table (the full GST rule is in acsNote).
const note = (f: Fee, incl: boolean): LocalizedString => ({
  en: `${incl ? "incl. GST (report's rule)" : "excl. GST"}; ${pages(f, "en")}`,
  tr: `${incl ? "KDV dahil (raporun kuralı)" : "KDV hariç"}; ${pages(f, "tr")}`,
  "zh-Hans": `${incl ? "含 GST（报告规则）" : "不含 GST"}；${pages(f, "zh-Hans")}`,
});

/** Within-Australia (incl. GST, onshore) then outside-Australia (excl. GST, offshore) registry entries for a fee row. */
export function acsRegistryFees(id: string, label: LocalizedString): AuthorityFee[] {
  const f = acsFee(id);
  return [
    { label, amountAUD: acsInclGst(f.feeExclGstAud), applicantLocation: "onshore", note: note(f, true) },
    { label, amountAUD: f.feeExclGstAud, applicantLocation: "offshore", note: note(f, false) },
  ];
}

/** Authority-level fees: the two appeal levels (not pathway fees). */
export function acsAppealFees(): AuthorityFee[] {
  const level = (id: string, en: string, tr: string, zh: string) => acsRegistryFees(id, { en, tr, "zh-Hans": zh });
  return [...level("acs_appeal_level_1", "Appeal Level 1", "Temyiz Seviye 1", "申诉一级"), ...level("acs_appeal_level_2", "Appeal Level 2", "Temyiz Seviye 2", "申诉二级")];
}

/** What the report and the tool page say where ACS states no processing time. */
export const ACS_PROCESSING_NOT_STATED: LocalizedString = {
  en: "Not stated in the ACS guide",
  tr: "ACS kılavuzunda belirtilmemiş",
  "zh-Hans": "ACS 指南中未说明",
};

const money = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/** The GST rule, the effective date and the appeal fees, for the report row of an ACS pathway. */
export function acsNote(locale: Locale, location: "onshore" | "offshore" | "singapore" | undefined): string {
  const incl = !(location === "offshore" || location === "singapore");
  const a1 = acsFee("acs_appeal_level_1").feeExclGstAud;
  const a2 = acsFee("acs_appeal_level_2").feeExclGstAud;
  const a = (n: number) => `AUD ${money(incl ? acsInclGst(n) : n)}`;
  if (locale === "tr") {
    return `ACS tüm ücretlerini KDV (GST) hariç ve 3 Kasım 2025'ten geçerli olarak belirtir (s.1); KDV'yi kimin ödediğini belirtmez. Rapor, diğer değerlendirme kuruluşları için de uyguladığı kuralı uygular: Avustralya içinden başvuranlara KDV dahil (x1,10), dışından başvuranlara KDV hariç tutar gösterilir; bu kural ACS'nin değil raporundur. Temyiz: Seviye 1 ${a(a1)}, Seviye 2 ${a(a2)} (s.1).`;
  }
  if (locale === "zh-Hans") {
    return `ACS 公布的所有费用均不含 GST，自 2025 年 11 月 3 日起生效（第 1 页），并未说明 GST 由谁承担。报告沿用对其他评估机构同样采用的规则：在澳洲境内申请显示含 GST 金额（x1.10），在境外申请显示不含 GST 金额；该规则由报告采用，并非 ACS 规定。申诉：一级 ${a(a1)}，二级 ${a(a2)}（第 1 页）。ACS 指南未说明处理时间。`;
  }
  return `ACS states all its fees excluding GST, effective 3 November 2025 (p.1), and does not say who pays GST. The report applies the rule it uses for other assessing authorities: applicants in Australia see the GST-inclusive figure (x1.10), applicants outside Australia the GST-exclusive one; the rule is the report's, not ACS's. Appeals: Level 1 ${a(a1)}, Level 2 ${a(a2)} (p.1).`;
}
