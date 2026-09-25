/**
 * Engineers Australia migration skills assessment fees, read from the git-committed extraction
 * src/data/skills-assessment/engineers-australia-fees.json (scripts/generate-engineers-australia-fees.ts; Engineers
 * Australia's 2026–2027 fee tables, p.7-10; provenance facts ea_* in src/data/fee-provenance.json).
 *
 * Fees vary by PATHWAY (Washington/Sydney/Dublin Accord, Australian accredited qualification, competency
 * demonstration report) and by add-on (relevant skilled employment, overseas engineering PhD) -- not by occupational
 * category. Every fee is stated excluding and including GST, and the document does not say who pays which, so the
 * report shows both ("AUD 940–1,034"). The intake does not capture whether a qualification is accredited, so the
 * report quotes the CDR pathway -- the one for non-accredited qualifications -- and names the lower Accord and
 * Australian-accredited fees. For Engineering Manager (133211) skilled employment "is a mandatory part of the CDR
 * assessment" (p.10), so the report quotes the CDR plus relevant skilled employment fee.
 */
import type { AuthorityFee, LocalizedString } from "./types";
import data from "@/src/data/skills-assessment/engineers-australia-fees.json";

type Fee = (typeof data.fees)[number];
type Locale = "en" | "tr" | "zh-Hans";

export const EA_FEES_SOURCE = {
  document: data.sourceDocument,
  title: data.sourceTitle,
  period: `${data.feePeriod.from}–${data.feePeriod.to}`,
  extractedDate: data.extractedDate,
} as const;
export const EA_FEES: readonly Fee[] = data.fees;
export const EA_PROCESSING = data.processing;

export function eaFee(id: string): Fee {
  const fee = data.fees.find((f) => f.id === id);
  if (!fee) throw new Error(`engineers-australia-fees.json has no "${id}" -- regenerate it (scripts/generate-engineers-australia-fees.ts)`);
  return fee;
}

const money = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
export const eaRange = (f: Fee) => `AUD ${money(f.feeExclGstAud)}–${money(f.feeInclGstAud)}`;

const PATHWAY_NAMES: Record<string, LocalizedString> = {
  accord: { en: "Washington/Sydney/Dublin Accord qualification assessment", tr: "Washington/Sydney/Dublin Accord nitelik değerlendirmesi", "zh-Hans": "华盛顿/悉尼/都柏林协议资格评估" },
  australian: { en: "Australian accredited engineering qualification assessment", tr: "Avustralya akredite mühendislik niteliği değerlendirmesi", "zh-Hans": "澳洲认证工程资格评估" },
  cdr: { en: "Competency demonstration report (CDR)", tr: "Yetkinlik gösterim raporu (CDR)", "zh-Hans": "能力展示报告（CDR）" },
};
const ADD_ONS: Record<string, LocalizedString> = {
  relevant_skilled_employment: { en: "relevant skilled employment", tr: "ilgili nitelikli istihdam", "zh-Hans": "相关技术工作" },
  overseas_phd: { en: "overseas engineering PhD", tr: "yurt dışı mühendislik doktorası", "zh-Hans": "海外工程博士" },
};
const loc = (s: LocalizedString, l: Locale) => (typeof s === "string" ? s : s[l]);

/** Registry fee entries for one pathway: every combination, excl. GST as the amount, the incl. GST figure and page in the note. */
export function eaRegistryFees(pathway: "accord" | "australian" | "cdr"): AuthorityFee[] {
  return data.fees
    .filter((f) => f.pathway === pathway)
    .map((f) => {
      const label = (l: Locale) => [loc(PATHWAY_NAMES[pathway], l), ...f.addOns.map((a) => loc(ADD_ONS[a], l))].join(" + ");
      return {
        label: { en: label("en"), tr: label("tr"), "zh-Hans": label("zh-Hans") },
        amountAUD: f.feeExclGstAud,
        note: {
          en: `excl. GST; AUD ${money(f.feeInclGstAud)} incl. GST (Engineers Australia p.${f.page})`,
          tr: `KDV hariç; KDV dahil AUD ${money(f.feeInclGstAud)} (Engineers Australia s.${f.page})`,
          "zh-Hans": `不含 GST；含 GST 为 AUD ${money(f.feeInclGstAud)}（Engineers Australia 第 ${f.page} 页）`,
        },
      };
    });
}

export type EaAssessment = { pathwayId: "CDR"; fee: Fee; amountMin: number; amountMax: number; manager: boolean };

/** The fee the report quotes: CDR (see above); Engineering Manager 133211 -> CDR + relevant skilled employment. */
export function resolveEngineersAustraliaAssessment(input: { anzscoCode: string | undefined }): EaAssessment {
  const manager = input.anzscoCode === "133211";
  const fee = eaFee(manager ? "ea_cdr_rse" : "ea_cdr");
  return { pathwayId: "CDR", fee, amountMin: fee.feeExclGstAud, amountMax: fee.feeInclGstAud, manager };
}

export function eaAmountLabel(a: EaAssessment, locale: Locale): string {
  const r = eaRange(a.fee);
  if (locale === "tr") return `${r} (${a.manager ? "CDR + ilgili nitelikli istihdam" : "CDR"}; KDV hariç–dahil)`;
  if (locale === "zh-Hans") return `${r}（${a.manager ? "CDR + 相关技术工作" : "CDR"}；不含–含 GST）`;
  return `${r} (${a.manager ? "CDR + relevant skilled employment" : "CDR"}; excl.–incl. GST)`;
}

/** Why this figure, the lower accredited-pathway fees, and the time to an assessor -- each with its page. */
export function eaNote(a: EaAssessment, locale: Locale): string {
  const accord = eaFee(a.manager ? "ea_accord_rse" : "ea_accord");
  const au = eaFee(a.manager ? "ea_australian_rse" : "ea_australian");
  const p = EA_PROCESSING;
  const pages = `${a.fee.page}`;
  if (locale === "tr") {
    return `Engineers Australia ${EA_FEES_SOURCE.period} ücretleri: ${a.manager ? "Engineering Manager için ilgili nitelikli istihdam CDR değerlendirmesinin zorunlu parçasıdır; " : ""}akredite olmayan nitelikler için CDR yolu (s.${pages}). Niteliğiniz akrediteyse: Washington/Sydney/Dublin Accord ${eaRange(accord)}, Avustralya akredite nitelik ${eaRange(au)} (s.${accord.page}). Belge, KDV dahil tutarı kimin ödediğini belirtmiyor. Standart başvurular genellikle ${p.standardWeeksToAssessor} haftada bir değerlendiriciye atanır (s.${p.standardPage}); hızlı işlem (AUD ${money(eaFee("ea_fast_track").feeExclGstAud)} ek) ${p.fastTrackBusinessDaysToAssessor} iş gününde (s.${p.fastTrackPage}) -- sonuç süresi belirtilmemiş.`;
  }
  if (locale === "zh-Hans") {
    return `Engineers Australia ${EA_FEES_SOURCE.period} 年度费用：${a.manager ? "工程经理的 CDR 评估必须包含相关技术工作评估；" : ""}未认证学历适用 CDR 途径（第 ${pages} 页）。如您的学历经认证：华盛顿/悉尼/都柏林协议 ${eaRange(accord)}，澳洲认证学历 ${eaRange(au)}（第 ${accord.page} 页）。文件未说明由谁支付含 GST 的金额。标准申请通常在 ${p.standardWeeksToAssessor} 周内分配给评估员（第 ${p.standardPage} 页）；加急（另付 AUD ${money(eaFee("ea_fast_track").feeExclGstAud)}）在 ${p.fastTrackBusinessDaysToAssessor} 个工作日内（第 ${p.fastTrackPage} 页）——未注明出结果时间。`;
  }
  return `Engineers Australia ${EA_FEES_SOURCE.period} fees: ${a.manager ? "for Engineering Manager, relevant skilled employment is a mandatory part of the CDR assessment; " : ""}the CDR pathway is for qualifications that are not accredited (p.${pages}). If your qualification is accredited: Washington/Sydney/Dublin Accord ${eaRange(accord)}, Australian accredited qualification ${eaRange(au)} (p.${accord.page}). The document does not say who pays the GST-inclusive figure. Standard applications are generally assigned to an assessor within ${p.standardWeeksToAssessor} weeks (p.${p.standardPage}); fast track (AUD ${money(eaFee("ea_fast_track").feeExclGstAud)} extra) within ${p.fastTrackBusinessDaysToAssessor} business days (p.${p.fastTrackPage}) -- no time to an outcome is stated.`;
}
