import visaFees from "@/src/data/visa-fees.json";
import gatesData from "@/src/data/visa-gates.json";
import { calculateAustraliaPoints, POINTS_TABLES } from "@/lib/points/calculate-australia-points";
import type { AustraliaPointsInput } from "@/lib/points/types";
import { STATE_RULES } from "@/lib/state-nomination/state-rules-config";
import { resolveDisplayStatus } from "@/lib/state-nomination/state-status";
import { evaluateVisaGates } from "@/lib/readiness/visa-gates";

/**
 * One source of truth for the AI assistant: the figures and rules the LogiVisa REPORT uses, as structured facts for
 * the system prompt (free and premium). The model must not state a fee, gate or state status that contradicts them;
 * lib/chat/answer-check.ts flags an answer that does.
 *
 *   fees           src/data/visa-fees.json (the Financial Roadmap's VAC figures)
 *   gates          the sourced gate matrix (src/data/visa-gates.json, lib/readiness/visa-gates.ts)
 *   points         lib/points/calculate-australia-points.ts (the report's points table)
 *   states         lib/state-nomination/state-rules-config.ts with the live admin / scraper status, the same
 *                  precedence the report's State Nomination Tracker uses (resolveDisplayStatus)
 *   191            the report's Bridge to PR wording (ATO notices for 3 income years, no minimum income)
 */

type VacRow = { main?: number; partner_18_plus?: number; child_under_18?: number; secondInstalmentEnglish?: number };
const FEES = (visaFees as unknown as { visas: Record<string, { label: string; vac?: VacRow }> }).visas;
const fmt = (n: number) => `AUD ${n.toLocaleString("en-AU")}`;

export type LiveStateData = {
  stateNominationConfig?: Record<string, { status?: string | null; updatedAt?: string }>;
  stateIntelligence?: Record<string, { status?: string }>;
};

/** The VAC row per subclass, as the report shows it (for correction blocks). */
export function engineFeeRow(subclass: string): VacRow | undefined {
  return FEES[subclass]?.vac;
}

/** Fee figures per subclass (every amount the report can quote for that subclass). */
export function engineFeeTable(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [subclass, v] of Object.entries(FEES)) {
    const vac = v.vac ?? {};
    out[subclass] = [vac.main, vac.partner_18_plus, vac.child_under_18, vac.secondInstalmentEnglish].filter((n): n is number => typeof n === "number");
  }
  return out;
}

function feeLines(): string[] {
  return Object.entries(FEES).map(([subclass, v]) => {
    const vac = v.vac ?? {};
    const parts = [
      typeof vac.main === "number" ? `main applicant ${fmt(vac.main)}` : null,
      typeof vac.partner_18_plus === "number" ? `each partner/dependant 18+ ${fmt(vac.partner_18_plus)}` : null,
      typeof vac.child_under_18 === "number" ? `each child under 18 ${fmt(vac.child_under_18)}` : null,
      typeof vac.secondInstalmentEnglish === "number" ? `second instalment ${fmt(vac.secondInstalmentEnglish)} per dependant 18+ without functional English` : null,
    ].filter(Boolean);
    return `- Subclass ${subclass}: ${parts.join("; ")}`;
  });
}

/** The gate matrix's requirements per visa (labels and kinds as the report shows them), in English. */
function gateLines(): string[] {
  const gates = evaluateVisaGates({ locale: "en", country: "AU" }, {}, "en");
  return Object.entries(gates).map(([visa, g]) => {
    const req = g.gates.filter((x) => x.status !== "future").map((x) => x.label);
    const later = g.gates.filter((x) => x.status === "future").map((x) => x.label);
    return `- Subclass ${visa}: must meet ${req.join("; ")}${later.length ? `. Later steps (not eligibility failures): ${later.join("; ")}` : ""}.`;
  });
}

function pointsLines(): string[] {
  const base: AustraliaPointsInput = {
    age: "45_plus",
    english: "competent",
    overseasEmployment: "lt3",
    australianEmployment: "lt1",
    education: "none_or_unsure",
    partner: "none_or_unsure",
  } as AustraliaPointsInput;
  const bonus = (patch: Partial<AustraliaPointsInput>) => calculateAustraliaPoints({ ...base, ...patch }).total189 - calculateAustraliaPoints(base).total189;
  const key = (k: string) =>
    k
      .replace(/^lt(\d+)$/, "under $1")
      .replace(/^(\d+)_(\d+)$/, "$1-$2")
      .replace(/^(\d+)_plus$/, "$1+")
      .replace(/_/g, " ");
  const table = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${key(k)}: ${v}`).join(", ");
  return [
    `- Minimum to lodge an EOI: ${POINTS_TABLES.minimumThreshold} points (189; for 190 / 491 including the required nomination).`,
    `- Age: ${table(POINTS_TABLES.age)}.`,
    `- English: ${table(POINTS_TABLES.english)}.`,
    `- Skilled employment outside Australia (years): ${table(POINTS_TABLES.overseasEmployment)}; in Australia (years): ${table(POINTS_TABLES.australianEmployment)}; employment points combined are capped at 20, and count only with a positive skills assessment.`,
    `- Qualification: ${table(POINTS_TABLES.education)}.`,
    `- Australian study requirement (at least 2 academic years of study in Australia) +${bonus({ australianStudyRequirement: true })}; study in regional Australia +${bonus({ regionalStudy: true })}; specialist education (Australian research masters or doctorate in STEM) +${bonus({ specialistEducation: true })}; Professional Year +${bonus({ professionalYear: true })}; credentialled community language (NAATI) +${bonus({ credentialledCommunityLanguage: true })}.`,
    `- Partner: ${table(POINTS_TABLES.partner)}.`,
    `- Nomination: 190 state nomination +${calculateAustraliaPoints({ ...base, hasStateNomination190: true }).total190 - calculateAustraliaPoints(base).total189}; 491 regional nomination or relative sponsorship +${calculateAustraliaPoints({ ...base, hasNominationOrSponsorship491: true }).total491 - calculateAustraliaPoints(base).total189}.`,
  ];
}

function stateLines(live: LiveStateData = {}): string[] {
  return Object.values(STATE_RULES).map((rule) => {
    const status = resolveDisplayStatus({ admin: live.stateNominationConfig?.[rule.code] ?? undefined, rule, intelStatus: live.stateIntelligence?.[rule.code]?.status }) ?? rule.status;
    return `- ${rule.name} (${rule.code}): ${status} (verified ${rule.lastVerified}).`;
  });
}

const THRESHOLDS = (gatesData as unknown as { thresholds: { CSIT: { value: number; effectiveFrom?: string } } }).thresholds;

/** The [ENGINE FACTS] block for the system prompt. */
export function buildEngineFacts(live: LiveStateData = {}): string {
  return [
    "[ENGINE FACTS] -- the same data the LogiVisa report uses. These are authoritative: where a reference document gives a different fee, gate, threshold or state status, these facts win; never contradict them, and never present a superseded figure.",
    "",
    "Visa application charges (from 1 July 2026):",
    ...feeLines(),
    "",
    "Mandatory requirements per visa (the report's gate matrix, from the Home Affairs pages):",
    ...gateLines(),
    `- Core Skills Income Threshold (CSIT): ${fmt(THRESHOLDS.CSIT.value)}${THRESHOLDS.CSIT.effectiveFrom ? ` from ${THRESHOLDS.CSIT.effectiveFrom}` : ""}.`,
    "- Subclass 191 (permanent, after a 491): live and work in a designated regional area for at least 3 years and provide ATO notices of assessment for 3 income years within the 491's 5 years. There is NO minimum income requirement.",
    "",
    "Points test (the report's points table):",
    ...pointsLines(),
    "",
    "State and territory nomination program status (the report's State Nomination Tracker):",
    ...stateLines(live),
    "- Whether a state lists a particular occupation, and whether it is open to the applicant's location and residence, comes only from the visitor's profile below; without a profile, do not claim an occupation is in demand in any number of states.",
  ].join("\n");
}
