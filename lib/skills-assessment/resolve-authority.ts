import occupationsData from "@/src/data/occupations.json";
import { getAuthorityById, getSkillsAssessmentAuthority } from "./index";
import { getAssessingAuthority } from "./occupation-authority-map";
import { normalizeOccupationCode, type SkillsAssessmentAuthority } from "./types";

/**
 * THE one place the assessing authority for an occupation is resolved.
 *
 * Every section that names an authority -- the Application Guide, FAQ, Financial
 * Roadmap, Reality Check (incl. the ACS experience-deduction note), the Skills
 * Assessment status, the lodgement checklist and the invariants check -- calls
 * resolveAssessingAuthority() and reads the registry entry
 * (lib/skills-assessment/authorities/*.ts). src/data/occupations.json's own
 * `authority` / `critical_warning` fields are NOT read for naming an authority:
 * they use a different vocabulary (e.g. "MedBA", "AMC pathway ...") and disagree
 * with the registry for some codes (see findAuthorityConflicts()).
 */

export type ResolvedAuthority = {
  authorityId: string;
  authorityName: string;
  authority: SkillsAssessmentAuthority | null;
  /** True when the universal fallback (VETASSESS / General Professional Authority) was used. */
  isGeneralFallback: boolean;
  source: "registry-code" | "keyword" | "general";
};

export function resolveAssessingAuthority(occupation: string | undefined): ResolvedAuthority {
  const byCode = getSkillsAssessmentAuthority(occupation);
  if (byCode) {
    return {
      authorityId: byCode.authorityId,
      authorityName: byCode.authorityName,
      authority: byCode,
      isGeneralFallback: false,
      source: "registry-code",
    };
  }
  const fuzzy = getAssessingAuthority(occupation);
  return {
    authorityId: fuzzy.authorityId,
    authorityName: fuzzy.authorityName,
    authority: getAuthorityById(fuzzy.authorityId),
    isGeneralFallback: fuzzy.isGeneralFallback,
    source: fuzzy.isGeneralFallback ? "general" : "keyword",
  };
}

/** The one way an authority is named in prose: "Australian Computer Society (ACS)". */
export function authorityDisplayName(resolved: ResolvedAuthority): string {
  return resolved.source === "registry-code" ? `${resolved.authorityName} (${resolved.authorityId})` : resolved.authorityName;
}

// ── Authority vocabulary in the occupation dataset ─────────────────────────
// Dataset `authority` strings and acronyms found in `critical_warning` text, mapped to the registry's
// authorityId family. "AMC" (Australian Medical Council) is deliberately its own family: it is a different
// body from AHPRA / the Medical Board, which is exactly the conflict to surface, not to resolve here.

const DATASET_TOKENS: Array<{ re: RegExp; family: string }> = [
  { re: /\bACS\b/, family: "ACS" },
  { re: /Engineers Australia|\bEA\b/, family: "EA" },
  { re: /\bVETASSESS\b/, family: "VETASSESS" },
  { re: /\bTRA\b/, family: "TRA" },
  { re: /\bANMAC\b/, family: "ANMAC" },
  { re: /\bMedBA\b|\bAHPRA\b|Medical Board/, family: "AHPRA" },
  { re: /\bAMC\b|Australian Medical Council/, family: "AMC" },
  { re: /\bCAANZ\b|\bCA ANZ\b/, family: "CA-ANZ" },
  { re: /\bCPAA?\b|CPA Australia/, family: "CPA" },
  { re: /\bIPA\b/, family: "IPA" },
  { re: /\bCASA\b/, family: "CASA" },
  { re: /\bADC\b/, family: "ADC" },
  { re: /\bAIMS\b/, family: "AIMS" },
  { re: /\bOTC\b/, family: "OTC" },
  { re: /\bAACA\b/, family: "AACA" },
];

function familiesIn(text: string | undefined): string[] {
  if (!text) return [];
  return [...new Set(DATASET_TOKENS.filter((t) => t.re.test(text)).map((t) => t.family))];
}

type DatasetOccupation = { anzsco_code: string; occupation_name: string; authority: string | null; critical_warning?: string | null };
const DATASET = (occupationsData as { occupations: DatasetOccupation[] }).occupations;

/** Authority families the dataset names for a code (its `authority` field plus acronyms in its `critical_warning`). */
export function datasetAuthorityFamilies(code: string): { fromAuthorityField: string[]; fromWarning: string[] } {
  const row = DATASET.find((o) => o.anzsco_code === code);
  return { fromAuthorityField: familiesIn(row?.authority ?? undefined), fromWarning: familiesIn(row?.critical_warning ?? undefined) };
}

/**
 * The occupation-level warning (dataset `critical_warning`), or undefined when it names an assessing body other
 * than the one this report resolves for the occupation -- a report must name ONE authority per occupation.
 */
export function occupationWarningFor(warning: string | undefined, resolved: ResolvedAuthority): string | undefined {
  if (!warning) return undefined;
  const named = familiesIn(warning);
  if (named.length === 0) return warning;
  return named.every((f) => f === resolved.authorityId) ? warning : undefined;
}

export type AuthorityConflict = {
  anzscoCode: string;
  title: string;
  /** Every distinct authority the code names, with where it names it. */
  named: Array<{ authority: string; where: "registry" | "dataset authority field" | "dataset critical_warning" }>;
};

/**
 * Codes where the codebase names two different assessing authorities: the registry (authorities/*.ts, incl. a
 * code listed under more than one authority) versus the occupation dataset (authority field and warning text).
 * Deliberately does not decide which is correct.
 */
export function findAuthorityConflicts(registry: readonly SkillsAssessmentAuthority[]): AuthorityConflict[] {
  const registryByCode = new Map<string, Set<string>>();
  for (const a of registry) {
    for (const o of a.occupations) {
      const code = normalizeOccupationCode(o.anzscoCode);
      if (!code) continue;
      if (!registryByCode.has(code)) registryByCode.set(code, new Set());
      registryByCode.get(code)!.add(a.authorityId);
    }
  }
  const conflicts: AuthorityConflict[] = [];
  const codes = new Set<string>([...registryByCode.keys()]);
  for (const code of codes) {
    const named: AuthorityConflict["named"] = [];
    for (const id of registryByCode.get(code) ?? []) named.push({ authority: id, where: "registry" });
    const ds = datasetAuthorityFamilies(code);
    for (const f of ds.fromAuthorityField) named.push({ authority: f, where: "dataset authority field" });
    for (const f of ds.fromWarning) named.push({ authority: f, where: "dataset critical_warning" });
    // A code legitimately listed under several bodies that the dataset lists identically (e.g. accountants:
    // CPA / CA ANZ / IPA) is not a conflict. Conflict = the registry and the dataset's authority field name
    // different sets, or the warning text names a body that neither of them does.
    const reg = new Set(named.filter((n) => n.where === "registry").map((n) => n.authority));
    const field = new Set(named.filter((n) => n.where === "dataset authority field").map((n) => n.authority));
    const warn = named.filter((n) => n.where === "dataset critical_warning").map((n) => n.authority);
    const sameSets = field.size === 0 || (reg.size === field.size && [...reg].every((x) => field.has(x)));
    const warningStrays = warn.some((w) => !reg.has(w) && !field.has(w));
    if (!sameSets || warningStrays) {
      conflicts.push({
        anzscoCode: code,
        title: DATASET.find((o) => o.anzsco_code === code)?.occupation_name ?? "",
        named,
      });
    }
  }
  return conflicts.sort((a, b) => a.anzscoCode.localeCompare(b.anzscoCode));
}
