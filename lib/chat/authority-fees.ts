import { listAuthorities, resolveACSPathway, resolveLocalized, selectPrimaryFee } from "@/lib/skills-assessment";
import type { Locale } from "@/lib/readiness/types";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import type { AuthorityFee, SkillsAssessmentAuthority } from "@/lib/skills-assessment/types";
import type { ReadinessInput } from "@/lib/readiness/types";

/**
 * Skills-assessment (assessing authority) fees for the chat: the report's registry (lib/skills-assessment/authorities,
 * each figure with its page in src/data/fee-provenance.json), per authority and per PATHWAY. The fee depends on the
 * pathway (ACS: General Skills AUD 1,498; Post Australian Study AUD 1,136; RPL / Qualification Only AUD 625), so an
 * answer quoting one pathway's figure for another is wrong even though the figure exists. Never invents a figure:
 * a pathway with no AUD fee in the registry has no row.
 */

export type AuthorityFeeRow = {
  authorityId: string;
  authority: string;
  pathwayId: string;
  pathway: string;
  label: string;
  amountAUD: number;
  estimated: boolean;
  /** Where the applicant applies from, for a fee priced by location (onshore = incl. GST, offshore = excl. GST). */
  applicantLocation?: string;
};

const L = (s: Parameters<typeof resolveLocalized>[0], locale: Locale): string => resolveLocalized(s, locale) as string;

function rowsOf(a: SkillsAssessmentAuthority, pathwayId: string, pathway: string, fees: AuthorityFee[], locale: Locale): AuthorityFeeRow[] {
  return fees
    .filter((f) => typeof f.amountAUD === "number" && f.amountAUD > 0)
    .map((f) => ({ authorityId: a.authorityId, authority: a.authorityName, pathwayId, pathway, label: L(f.label, locale), amountAUD: f.amountAUD as number, estimated: f.estimated === true, ...(f.applicantLocation ? { applicantLocation: f.applicantLocation } : {}) }));
}

export function authorityFeeRows(locale: Locale = "en"): AuthorityFeeRow[] {
  const out: AuthorityFeeRow[] = [];
  for (const a of listAuthorities()) {
    if (a.country !== "AU") continue;
    for (const p of a.pathways) out.push(...rowsOf(a, p.pathwayId, L(p.name, locale), p.fees, locale));
    for (const s of a.services ?? []) {
      for (const p of s.pathways) out.push(...rowsOf(a, p.pathwayId, `${L(s.serviceName, locale)} -- ${L(p.name, locale)}`, p.fees, locale));
      out.push(...rowsOf(a, s.serviceId, L(s.serviceName, locale), s.fees ?? [], locale));
    }
    for (const f of a.fees ?? []) out.push(...rowsOf(a, "authority", L(f.label, locale), [f], locale));
  }
  return out;
}

const fmt = (n: number) => `AUD ${n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** One line per authority listing each pathway's fee (figures marked "estimate" are unverified placeholders). */
export function authorityFeeLines(): string[] {
  const byAuthority = new Map<string, AuthorityFeeRow[]>();
  for (const r of authorityFeeRows()) byAuthority.set(r.authorityId, [...(byAuthority.get(r.authorityId) ?? []), r]);
  return [...byAuthority.values()].map((rows) => {
    // One entry per pathway (and fee label); a fee priced by location lists both GST columns.
    const groups = new Map<string, AuthorityFeeRow[]>();
    for (const r of rows) {
      const name = `${r.pathway}${r.label && r.label !== r.pathway && !r.pathway.includes(r.label) ? ` (${r.label})` : ""}`;
      groups.set(name, [...(groups.get(name) ?? []), r]);
    }
    const parts = [...groups.entries()].map(([name, rs]) => {
      const amounts = [...new Map(rs.map((r) => [`${r.applicantLocation ?? ""}|${r.amountAUD}`, r])).values()].map((r) => {
        const where = r.applicantLocation === "onshore" ? " incl. GST if applying from within Australia" : r.applicantLocation === "offshore" ? " excl. GST if applying from outside Australia" : r.applicantLocation ? ` (${r.applicantLocation})` : "";
        return `${fmt(r.amountAUD)}${where}${r.estimated ? " (estimate pending verification)" : ""}`;
      });
      return `${name} ${amounts.join(" / ")}`;
    });
    return `- ${rows[0].authority} (${rows[0].authorityId}): ${parts.join("; ")}`;
  });
}

/** Authority-fee figures per authority id (every amount the registry has for it). */
export function authorityFeeAmounts(): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const r of authorityFeeRows()) m.set(r.authorityId, (m.get(r.authorityId) ?? new Set()).add(r.amountAUD));
  return m;
}

/** The authority names / ids a sentence mentions (registry ids are matched case-sensitively as whole upper-case words). */
export function authoritiesMentioned(text: string): string[] {
  const out: string[] = [];
  for (const a of listAuthorities()) {
    const names = [a.authorityName.split(/\s*[(/]/)[0].trim(), ...(ALIASES[a.authorityId] ?? [])].filter((n) => n.length > 3);
    const byName = names.some((n) => text.toLowerCase().includes(n.toLowerCase()));
    const byId = a.authorityId.length >= 3 && a.authorityId !== "GENERAL" && new RegExp(`(?<![A-Za-z])${a.authorityId.replace("-", "[- ]?")}(?![A-Za-z])`).test(text);
    if (byName || byId) out.push(a.authorityId);
  }
  return out;
}
const ALIASES: Record<string, string[]> = { EA: ["Engineers Australia"], "CA-ANZ": ["Chartered Accountants"], CPA: ["CPA Australia"], IPA: ["Institute of Public Accountants"], VETASSESS: ["VETASSESS"], TRA: ["Trades Recognition Australia"] };

/** The pathways of one authority named in the text (by pathway name or id words), with their fees. */
export function pathwaysMentioned(authorityId: string, text: string): AuthorityFeeRow[] {
  const lower = text.toLowerCase();
  const hit = (r: AuthorityFeeRow) => {
    const name = r.pathway.toLowerCase();
    if (name.length > 3 && lower.includes(name)) return true;
    if (authorityId === "ACS") {
      if (r.pathwayId === "RPL") return /\brpl\b|recognition of prior learning|önceki öğrenmenin|先前学习认可/i.test(text);
      if (r.pathwayId === "GENERAL_SKILLS") return /general skills|genel beceri|通用技能/i.test(text);
      if (r.pathwayId === "POST_AU_STUDY") return /post[- ]australian study|avustralya eğitimi sonrası|澳洲留学后/i.test(text);
      if (r.pathwayId.startsWith("QUALIFICATION_ONLY")) return /qualification only|yalnızca nitelik|仅资格/i.test(text);
    }
    return false;
  };
  return authorityFeeRows().filter((r) => r.authorityId === authorityId && hit(r));
}

export type VisitorAuthorityFee = {
  authorityId: string;
  authority: string;
  pathway: string;
  amountAUD: number;
  estimated: boolean;
  /** The same fee in the other GST column (incl. <-> excl.), also correct for the pathway. */
  otherGstAmountAUD?: number;
};

/**
 * The visitor's own assessing authority and fee, as the report's Financial Roadmap resolves it. ACS: the pathway comes
 * from the intake (resolveACSPathway), exactly as engine.ts does; other authorities: the registry's primary pathway.
 */
export function visitorAuthorityFee(input: Partial<ReadinessInput>, locale: Locale = "en"): VisitorAuthorityFee | undefined {
  try {
    const authority = resolveAssessingAuthority(input.occupation).authority;
    if (!authority || authority.country !== "AU") return undefined;
    let pathway = authority.pathways[0];
    if (authority.authorityId === "ACS") {
      const id = resolveACSPathway({
        qualificationLevel: input.qualificationLevel ?? "",
        completedAtAustralianInstitution: input.qualificationAwardedInAustralia === true,
        yearsOfExperience: (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0),
      });
      pathway = authority.pathways.find((p) => p.pathwayId === id) ?? pathway;
    } else if (authority.authorityId !== "GENERAL") {
      return undefined; // only ACS has an intake-driven pathway resolver here; for the others the pathway is asked, not guessed
    }
    const fee = pathway && selectPrimaryFee(pathway, input.currentCountry);
    if (!pathway || !fee || typeof fee.amountAUD !== "number") return undefined;
    const twin = pathway.fees.find((f) => f.applicantLocation && f.applicantLocation !== fee.applicantLocation && typeof f.amountAUD === "number" && f.label === fee.label);
    return { authorityId: authority.authorityId, authority: authority.authorityName, pathway: L(pathway.name, locale), amountAUD: fee.amountAUD, estimated: fee.estimated === true, ...(twin ? { otherGstAmountAUD: twin.amountAUD } : {}) };
  } catch {
    return undefined;
  }
}
