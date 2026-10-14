import { seedStateData } from "@/lib/admin-data/snapshot";
import type { AdminStateData, LocalizedField } from "@/lib/admin-data/types";

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
  /** The same sentence with its translations. */
  factField?: LocalizedField;
  /** The state's source document(s). */
  source?: string;
};

/**
 * The residence rule of a state, from the explicit `residenceRule` flag on its residence condition (lib/admin-data/types.ts StateCondition).
 * A state with no such flag, or "not_stated", is "not_confirmed". Never inferred from the text.
 */
export function stateResidenceRule(code: string, data: AdminStateData = seedStateData()): StateResidenceRule {
  const rule = data.rules[code];
  const cond = rule?.conditions.find((c) => c.kind === "residence" && c.residenceRule && c.residenceRule !== "not_stated");
  if (!cond || !cond.residenceRule || cond.residenceRule === "not_stated") return { requirement: "not_confirmed", source: rule?.sourceDocument };
  return {
    requirement: cond.residenceRule,
    fact: cond.text.en,
    factField: cond.text,
    source: rule?.sourceDocument,
    ...(cond.subclasses.length === 1 ? { subclasses: cond.subclasses } : {}),
  };
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
