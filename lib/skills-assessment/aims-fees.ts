/**
 * Australian Institute of Medical Scientists (AIMS) migration assessment fees, read from the git-committed extraction
 * src/data/skills-assessment/aims-fees.json (scripts/generate-aims-fees.ts; fee table p.18-19; provenance facts aims_*
 * in src/data/fee-provenance.json). Each fee has an outside-Australia figure (excluding GST) and a within-Australia
 * figure (including GST) -- "If the applicant's postal / residential address is in Australia, the GST (10%) will
 * apply" -- tagged with applicantLocation so the report quotes the one for the applicant's current country
 * (selectPrimaryFee), like CPA Australia.
 */
import type { AuthorityFee, LocalizedString } from "./types";
import data from "@/src/data/skills-assessment/aims-fees.json";

type Fee = (typeof data.fees)[number];

export const AIMS_FEES_SOURCE = { document: data.sourceDocument, title: data.sourceTitle, extractedDate: data.extractedDate } as const;
export const AIMS_FEES: readonly Fee[] = data.fees;
export const AIMS_PROCESSING = data.processing;
export const AIMS_GST_RULE = data.gstRule;

export function aimsFee(id: string): Fee {
  const fee = data.fees.find((f) => f.id === id);
  if (!fee) throw new Error(`aims-fees.json has no "${id}" -- regenerate it (scripts/generate-aims-fees.ts)`);
  return fee;
}

/** Within-Australia (incl. GST, onshore) then outside-Australia (excl. GST, offshore) registry entries for a fee row. */
export function aimsRegistryFees(id: string, label: LocalizedString): AuthorityFee[] {
  const f = aimsFee(id);
  if (f.withinAustraliaInclGstAud === null || f.outsideAustraliaExclGstAud === null) throw new Error(`${id}: needs both columns`);
  const at = (where: { en: string; tr: string; zh: string }): LocalizedString => ({
    en: `${where.en}; AIMS p.${f.page}`,
    tr: `${where.tr}; AIMS s.${f.page}`,
    "zh-Hans": `${where.zh}；AIMS 第 ${f.page} 页`,
  });
  return [
    { label, amountAUD: f.withinAustraliaInclGstAud, applicantLocation: "onshore", note: at({ en: "incl. GST", tr: "KDV dahil", zh: "含 GST" }) },
    { label, amountAUD: f.outsideAustraliaExclGstAud, applicantLocation: "offshore", note: at({ en: "excl. GST", tr: "KDV hariç", zh: "不含 GST" }) },
  ];
}

/** "Within 6 months" for individual applicants (the current guidelines), in the report's language. */
export const AIMS_PROCESSING_LABEL: LocalizedString = {
  en: `within ${AIMS_PROCESSING.individual.months} months (AIMS pp.${AIMS_PROCESSING.individual.pages.join(", ")}; document verification may extend it)`,
  tr: `${AIMS_PROCESSING.individual.months} ay içinde (AIMS s.${AIMS_PROCESSING.individual.pages.join(", ")}; belge doğrulaması uzatabilir)`,
  "zh-Hans": `${AIMS_PROCESSING.individual.months} 个月内（AIMS 第 ${AIMS_PROCESSING.individual.pages.join("、")} 页；文件核实可能延长）`,
};
