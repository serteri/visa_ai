import stateDataset from "@/src/data/state-nomination-status.json";
import { localizeStateFact } from "@/lib/state-nomination/state-keyfact-translations";
import { STATE_NOTE_TRANSLATIONS } from "@/lib/state-nomination/state-note-translations";
import { STATE_RULES } from "@/lib/state-nomination/state-rules-config";

import { carriedOver, field } from "./localized";
import { normalizeStateStatus } from "./statuses";
import type { ConditionKind, LocalizedField, ResidenceRule, ScoringInputs, StateCondition, StateProgramData, SubclassData } from "./types";

/**
 * The one-time seed (docs/admin-data-design.md D.2): the rows the admin panel starts from, built from what the code holds today
 * (state-rules-config.ts, state-nomination-status.json and the carried-over translations). After the first save in the admin panel
 * the rows are the data; this file is then only the seed and the offline fallback.
 *
 * Pure: no database, no clock (the caller gives the program year and the time), so the dry run, the tests and the fallback agree.
 */

export const SEED_PROGRAM_YEAR = "2026-27";

type DatasetRow = (typeof stateDataset)["states"][number];
const DATASET = stateDataset.states as DatasetRow[];

/** The order of the 8 states in the dataset (the reports list them in this order). */
export const STATE_ORDER: readonly string[] = DATASET.map((r) => r.code);

const OFFICIAL_URLS: Record<string, string[]> = {
  ACT: [
    "https://www.act.gov.au/migration/home",
    "https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round",
    "https://www.act.gov.au/migration/resources/act-migration-application-fees",
    "https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria",
    "https://www.act.gov.au/migration/skilled-migrants/491-nomination-criteria",
  ],
  NSW: [
    "https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190",
    "https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491",
    "https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists",
  ],
  NT: ["https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination"],
  QLD: [
    "https://www.migration.qld.gov.au/visa-options/skilled-visas/skilled-workers-living-in-queensland",
    "https://www.migration.qld.gov.au/nomination-process/application-process/application-fees",
  ],
  SA: ["https://migration.sa.gov.au/before-applying/visa-options-and-pathways/skilled-migrants", "https://migration.sa.gov.au/news"],
  TAS: ["https://www.migration.tas.gov.au/skilled_migration"],
  VIC: ["https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas"],
  WA: ["https://migration.wa.gov.au/our-services-support/state-nominated-migration-program", "https://migration.wa.gov.au/news"],
};

/** The residence classification the code used to find by matching the start of a key fact (lib/state-nomination/residence-rules.ts), now explicit. */
const RESIDENCE: Record<string, { rule: ResidenceRule; prefix: string; subclasses?: Array<"190" | "491"> }> = {
  TAS: { rule: "required", prefix: "Mandatory documents across all pathways include:" },
  SA: { rule: "required", prefix: "Residence and work (2025-26 settings): Graduates 6 months' SA residence" },
  QLD: { rule: "required", prefix: "Residency/employment test shown on the onshore page: 6 months living and working in regional Queensland" },
  NSW: { rule: "required", prefix: "Subclass 190 residency basis: working 20+ hrs/week in NSW", subclasses: ["190"] },
  VIC: { rule: "required", prefix: "When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria.", subclasses: ["491"] },
  WA: { rule: "not_required", prefix: "2025-26 rules: both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible" },
  ACT: { rule: "required", prefix: "Canberra residents: 190 needs 6 months' Canberra residence" },
};
export const SEED_RESIDENCE_PREFIXES = RESIDENCE;

function kindOf(text: string): ConditionKind {
  if (/resid|living|live and work|lived/i.test(text)) return "residence";
  if (/employ|work|hours|job|income|business/i.test(text)) return "employment";
  if (/study|graduate|course|qualification/i.test(text)) return "study";
  if (/english/i.test(text)) return "english";
  if (/\bfee\b|\bAUD\b|GST/i.test(text)) return "fee";
  if (/points/i.test(text)) return "points";
  if (/invit|apply|lodge|days/i.test(text)) return "process";
  return "other";
}

/** A text with the translations customers already saw (reviewed, provenance "carried_over"). */
function withCarriedTranslations(en: string, translations?: { tr: string; zh: string }): LocalizedField {
  const f = field(en);
  if (translations?.tr) f.tr = carriedOver(translations.tr);
  if (translations?.zh) f["zh-Hans"] = carriedOver(translations.zh);
  return f;
}

function factField(en: string): LocalizedField {
  const tr = localizeStateFact("tr", en);
  const zh = localizeStateFact("zh-Hans", en);
  return withCarriedTranslations(en, tr !== en || zh !== en ? { tr: tr !== en ? tr : "", zh: zh !== en ? zh : "" } : undefined);
}

function conditionsFor(code: string, keyFacts: readonly string[]): StateCondition[] {
  const res = RESIDENCE[code];
  return keyFacts.map((fact, i) => {
    const kind = kindOf(fact);
    const isResidence = Boolean(res && fact.startsWith(res.prefix));
    return {
      id: `c${String(i + 1).padStart(2, "0")}`,
      kind: isResidence ? "residence" : kind,
      subclasses: isResidence && res?.subclasses ? res.subclasses : [],
      stream: null,
      text: factField(fact),
      ...(isResidence && res ? { residenceRule: res.rule } : {}),
      quote: null,
      source: null,
    };
  });
}

const NO_FEE: SubclassData = { subclass: "190", availability: "inherit", allocation: null, allocationUsed: null, feeExclGst: null, feeInclGst: null, gstBasis: "not_stated", feeNote: null, effectiveFrom: null };

/** Fees and allocations that are stated in the repository's sourced data (never invented): the others stay empty with a note saying why. */
function subclassesFor(code: string): SubclassData[] {
  const base = (subclass: "190" | "491", patch: Partial<SubclassData> = {}): SubclassData => ({ ...NO_FEE, subclass, ...patch });
  switch (code) {
    case "ACT":
      return (["190", "491"] as const).map((s) =>
        base(s, { feeExclGst: 325, feeInclGst: 357.5, gstBasis: "stated_by_state", feeNote: field("Fee page (updated 27 July 2026): AUD 325 excl. GST, AUD 357.50 incl. GST. The 2026-27 allocation is not yet confirmed by the Australian Government (2025-26: 800 places for each subclass).") }),
      );
    case "TAS":
      return [
        base("190", { allocation: 1250, feeExclGst: 387, feeInclGst: 425.7, gstBasis: "stated_by_state", feeNote: field("Nomination service fee AUD 387 (AUD 425.70 incl. GST); no ROI fee. Confirmed by the project owner on 13 October 2026.") }),
        base("491", { allocation: 800, feeExclGst: 387, feeInclGst: 425.7, gstBasis: "stated_by_state", feeNote: field("Nomination service fee AUD 387 (AUD 425.70 incl. GST); no ROI fee. Confirmed by the project owner on 13 October 2026.") }),
      ];
    case "NT":
      return [
        base("190", { availability: "closed", feeNote: field("2026-27 NT fees have not been re-confirmed.") }),
        base("491", { availability: "exception", feeNote: field("2026-27 NT fees have not been re-confirmed.") }),
      ];
    case "QLD":
      return (["190", "491"] as const).map((s) => base(s, { feeNote: field("Listed as 'To be advised' on the Migration Queensland application fees page (13 October 2026).") }));
    case "SA":
      return (["190", "491"] as const).map((s) => base(s, { feeNote: field("AUD 394 is listed for this subclass (registration of interest: nil); the page states neither the program year nor the GST treatment.") }));
    case "WA":
      return (["190", "491"] as const).map((s) => base(s, { feeNote: field("AUD 200, non-refundable (2025-26 page); the GST treatment is not stated.") }));
    case "VIC":
      return (["190", "491"] as const).map((s) => base(s, { feeExclGst: 0, feeInclGst: 0, gstBasis: "no_gst", feeNote: field("Registration of interest and nomination are free of charge when the program is open (2025-26 documents).") }));
    default:
      return (["190", "491"] as const).map((s) => base(s, { feeNote: field("No nomination fee figure is published on the pages checked.") }));
  }
}

function scoringFor(row: DatasetRow, ruleQuotaPressure: ScoringInputs["ruleQuotaPressure"]): ScoringInputs {
  return {
    offshoreAvailability: row.offshoreAvailability as ScoringInputs["offshoreAvailability"],
    onshoreAvailability: row.onshoreAvailability as ScoringInputs["onshoreAvailability"],
    minimumPoints: row.minimumPoints,
    minimumEnglish: row.minimumEnglish as ScoringInputs["minimumEnglish"],
    minimumExperienceYears: row.minimumExperienceYears,
    regionalFocus: row.regionalFocus,
    preferredVisaTypes: row.preferredVisaTypes as Array<"190" | "491">,
    requiresStateResidence: row.requiresStateResidence,
    requiresRecentEmployment: row.requiresRecentEmployment,
    offshoreQuotaPressure: row.offshoreQuotaPressure as ScoringInputs["offshoreQuotaPressure"],
    ruleQuotaPressure,
    programWindow: row.programWindow,
    specialConditions: row.specialConditions.map((c) => withCarriedTranslations(c, STATE_NOTE_TRANSLATIONS[c])),
  };
}

/** The NT exception, in the words of the carried-over special condition (it has the translations). */
const NT_EXCEPTION_EN =
  "Exception: onshore subclass 491 for NT Graduate or NT Resident applicants with a visa deadline before 30 September 2027 (substantive visa expiring on or before 30 Sep 2027 and not eligible for subclass 485; turning 45 on or before 30 Sep 2027; or 491 points below 65 because of a birthday on or before 30 Sep 2027)";

/** Where the seed differs from the rules file on purpose, so the dry run can show it. */
export const SEED_STATUS_CHANGES: Record<string, string> = {
  NT: "Suspended / Closed -> Closed with exceptions (the status text the project owner confirmed on 13 October 2026; the exception is now a field)",
};

export function buildSeedPrograms(opts: { programYear?: string } = {}): Record<string, StateProgramData> {
  const programYear = opts.programYear ?? SEED_PROGRAM_YEAR;
  const out: Record<string, StateProgramData> = {};
  for (const row of DATASET) {
    const rule = STATE_RULES[row.code];
    if (!rule) throw new Error(`state-rules-config.ts has no entry for ${row.code}`);
    let status = normalizeStateStatus(rule.status);
    if (row.code === "NT" && status === "Suspended / Closed") status = "Closed with exceptions";
    const urls = OFFICIAL_URLS[row.code] ?? [];
    out[row.code] = {
      stateCode: row.code,
      stateName: rule.name,
      programYear,
      status,
      statusChangedAt: null,
      openingDate: row.code === "TAS" ? "2026-08-17" : null,
      closingDate: null,
      officialUrl: urls[0] ?? null,
      extraUrls: urls.slice(1),
      exceptions:
        row.code === "NT"
          ? { text: withCarriedTranslations(NT_EXCEPTION_EN, STATE_NOTE_TRANSLATIONS[NT_EXCEPTION_EN]), subclass: "491", appliesTo: "onshore", deadline: "2027-09-30" }
          : null,
      notes: withCarriedTranslations(rule.note, STATE_NOTE_TRANSLATIONS[rule.note]),
      aiSummary: field(rule.aiSummary),
      conditions: conditionsFor(row.code, rule.keyFacts),
      scoring: scoringFor(row, rule.offshoreQuotaPressure),
      subclasses: subclassesFor(row.code),
      lastVerifiedAt: `${rule.lastVerified}T00:00:00.000Z`,
      lastVerifiedBy: "seed",
      sourceText: rule.sourceDocument,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return out;
}
