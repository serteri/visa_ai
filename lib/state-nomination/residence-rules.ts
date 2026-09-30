import { getStateRule } from "./state-rules-config";

/**
 * Whether a state's ONSHORE nomination streams require living (or living/working) in that state, taken only from the
 * sourced state rules (state-rules-config.ts keyFacts, each from the state's own program document). Never inferred:
 * a state whose sourced facts do not state it is "not_confirmed", and does not count as available to an applicant
 * who lives in another state.
 *
 *  required       the sourced facts require residence / work in the state for its onshore streams;
 *  not_required   the sourced facts say applicants living in other states are eligible;
 *  not_confirmed  the sourced facts do not state an onshore residence rule.
 */
export type ResidenceRequirement = "required" | "not_required" | "not_confirmed";

export type StateResidenceRule = {
  requirement: ResidenceRequirement;
  /**
   * The subclasses the sourced fact covers when it covers only one (NSW: the 190 residency basis; VIC: the 491 onshore
   * rule); the other subclass's residence rule is not confirmed. Absent = both 190 and 491.
   */
  subclasses?: Array<"190" | "491">;
  /** The sourced fact the classification rests on (verbatim from state-rules-config.ts keyFacts), when there is one. */
  fact?: string;
  /** The state's source document(s). */
  source?: string;
};

/** The keyFacts line (by a stable prefix) each classification rests on. */
const RULE_FACTS: Record<string, { requirement: Exclude<ResidenceRequirement, "not_confirmed">; factPrefix: string; subclasses?: Array<"190" | "491"> }> = {
  // Tasmanian residence evidence is a mandatory document on every pathway.
  TAS: { requirement: "required", factPrefix: "Mandatory documents across all pathways include:" },
  SA: { requirement: "required", factPrefix: "Skilled Employment in South Australia stream (onshore only): 12+ months SA residence" },
  QLD: { requirement: "required", factPrefix: "Residency/employment test when open: 6 months living and working in regional Queensland" },
  NSW: { requirement: "required", factPrefix: "Subclass 190 residency basis: working 20+ hrs/week in NSW", subclasses: ["190"] },
  VIC: { requirement: "required", factPrefix: "When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria.", subclasses: ["491"] },
  WA: { requirement: "not_required", factPrefix: "Both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible" },
  // ACT and NT: the sourced facts state only a commitment to live there AFTER the visa grant, not an onshore residence
  // requirement before nomination -> not confirmed.
};

export function stateResidenceRule(code: string): StateResidenceRule {
  const rule = getStateRule(code);
  const spec = RULE_FACTS[code];
  const fact = spec && rule?.keyFacts.find((k) => k.startsWith(spec.factPrefix));
  // The classification only stands while its sourced fact is still in the rules; otherwise it is not confirmed.
  if (!spec || !fact) return { requirement: "not_confirmed", source: rule?.sourceDocument };
  return { requirement: spec.requirement, fact, source: rule?.sourceDocument, ...(spec.subclasses ? { subclasses: spec.subclasses } : {}) };
}

export const STATE_NAMES: Record<string, [string, string, string]> = {
  NSW: ["New South Wales", "Yeni Güney Galler", "新南威尔士州"],
  VIC: ["Victoria", "Victoria", "维多利亚州"],
  QLD: ["Queensland", "Queensland", "昆士兰州"],
  SA: ["South Australia", "Güney Avustralya", "南澳大利亚州"],
  WA: ["Western Australia", "Batı Avustralya", "西澳大利亚州"],
  TAS: ["Tasmania", "Tazmanya", "塔斯马尼亚州"],
  NT: ["Northern Territory", "Kuzey Bölgesi", "北领地"],
  ACT: ["Australian Capital Territory", "Avustralya Başkent Bölgesi", "澳大利亚首都领地"],
};
