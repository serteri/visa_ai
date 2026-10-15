import stateDataset from "@/src/data/state-nomination-status.json";
import { localizeStateFact } from "@/lib/state-nomination/state-keyfact-translations";
import { STATE_NOTE_TRANSLATIONS } from "@/lib/state-nomination/state-note-translations";
import { STATE_RULES } from "@/lib/state-nomination/state-rules-config";

import { carriedOver, field } from "./localized";
import { availabilityFor, normalizeStateStatus } from "./statuses";
import type { ConditionKind, LocalizedField, ResidenceRule, ScoringInputs, StateCondition, StateProgramData, SubclassData } from "./types";

/**
 * The one-time seed (docs/admin-data-design.md D.2): the rows the admin panel starts from, built from what the code holds today
 * (state-rules-config.ts, state-nomination-status.json and the carried-over translations). After the first save in the admin panel
 * the rows are the data; this file is then only the seed and the offline fallback.
 *
 * Pure: no database, no clock (the caller gives the program year and the time), so the dry run, the tests and the fallback agree.
 */

export const SEED_PROGRAM_YEAR = "2026-27";

/** The year the stored content describes. These states have not published 2026-27 settings: their rows hold the latest published year (2025-26). */
const PROGRAM_YEAR_BY_STATE: Record<string, string> = { NSW: "2025-26", VIC: "2025-26", WA: "2025-26", SA: "2025-26", QLD: "2025-26" };

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

/**
 * The reviewed category of each condition that the sentence matcher below gets wrong or cannot decide, and the residence rule of the ones that really
 * state a residence requirement (docs/admin-data-seed-dry-run.md lists every change). A condition not named here keeps the matcher's category and has
 * no residence rule. `rule` is only ever set on a condition that states whether living in the state is required.
 */
type Review = { kind: ConditionKind; rule?: ResidenceRule; subclasses?: Array<"190" | "491"> };
const REVIEW: Record<string, Review> = {
  // NSW
  "NSW:c02": { kind: "process" }, // closure notice
  "NSW:c03": { kind: "process" }, // submitted applications / review of settings
  "NSW:c06": { kind: "residence", rule: "required", subclasses: ["190"] },
  "NSW:c07": { kind: "residence" }, // 491 pathways: residence or employment, offshore residence accepted; no single rule
  // VIC
  "VIC:c06": { kind: "residence", rule: "required", subclasses: ["491"] },
  "VIC:c08": { kind: "other" }, // DHA baseline: age, English, assessment, points
  // WA
  "WA:c03": { kind: "process" }, // latest invitation round data
  "WA:c04": { kind: "other" }, // streams and bonus points
  "WA:c07": { kind: "residence", rule: "not_required" }, // onshore and offshore candidates are eligible
  "WA:c10": { kind: "process" }, // invitation volumes
  // SA
  "SA:c05": { kind: "other" }, // the four streams
  "SA:c06": { kind: "other" }, // onshore eligibility baseline
  "SA:c07": { kind: "residence", rule: "required" },
  "SA:c10": { kind: "other" }, // ranking factors
  // QLD
  "QLD:c02": { kind: "process" }, // 2026-27 not published
  "QLD:c03": { kind: "fee" }, // 2026-27 fees "to be advised"
  "QLD:c04": { kind: "other" }, // subclasses covered
  "QLD:c05": { kind: "other" }, // minimum requirements on the onshore page
  "QLD:c06": { kind: "residence", rule: "required" },
  "QLD:c07": { kind: "residence" }, // commitment after grant, not a precondition
  // NT
  "NT:c03": { kind: "other" }, // the exception itself
  "NT:c04": { kind: "other" }, // definition of "visa deadline"
  // TAS
  "TAS:c10": { kind: "other" }, // DHA baseline
  "TAS:c13": { kind: "residence", rule: "required" }, // Tasmanian Skilled Graduate: 1-2 years living in Tasmania
  "TAS:c14": { kind: "residence", rule: "required" }, // Tasmanian Established Resident: 2-3 years living in Tasmania
  "TAS:c16": { kind: "process" }, // mandatory documents list
  "TAS:c19": { kind: "residence" }, // commitment after approval, not a precondition
  // ACT
  "ACT:c04": { kind: "process" }, // invitation round data
  "ACT:c05": { kind: "other" }, // the two pathways
  "ACT:c06": { kind: "other" }, // occupation list
  "ACT:c07": { kind: "residence", rule: "required" },
  "ACT:c08": { kind: "employment" }, // overseas applicants: work experience and no recent Australian residence
  "ACT:c10": { kind: "residence" }, // commitment after grant, not a precondition
};
export const SEED_CONDITION_REVIEW = REVIEW;

/** What the first seed build did before the review (the matcher's category, and a residence tag by sentence prefix), so the dry run can list every change. */
export const FIRST_BUILD_RESIDENCE_TAGS: Record<string, string> = {
  "TAS:c16": "required",
  "SA:c07": "required",
  "QLD:c06": "required",
  "NSW:c06": "required (190)",
  "VIC:c06": "required (491)",
  "WA:c07": "not_required",
  "ACT:c07": "required",
};

export function matcherKindOf(text: string): ConditionKind {
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
  return keyFacts.map((fact, i) => {
    const id = `c${String(i + 1).padStart(2, "0")}`;
    const review = REVIEW[`${code}:${id}`];
    return {
      id,
      kind: review?.kind ?? matcherKindOf(fact),
      subclasses: review?.subclasses ?? [],
      stream: null,
      text: factField(fact),
      ...(review?.rule ? { residenceRule: review.rule } : {}),
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

function scoringFor(row: DatasetRow, status: string, ruleQuotaPressure: ScoringInputs["ruleQuotaPressure"]): ScoringInputs {
  // Derived from the status so the two can never contradict each other; a legacy status ("High Demand") keeps the dataset's values.
  const derived = availabilityFor(status);
  return {
    offshoreAvailability: derived?.offshore ?? (row.offshoreAvailability as ScoringInputs["offshoreAvailability"]),
    onshoreAvailability: derived?.onshore ?? (row.onshoreAvailability as ScoringInputs["onshoreAvailability"]),
    minimumPoints: row.minimumPoints,
    minimumEnglish: row.minimumEnglish as ScoringInputs["minimumEnglish"],
    minimumExperienceYears: row.minimumExperienceYears,
    regionalFocus: row.regionalFocus,
    preferredVisaTypes: row.preferredVisaTypes as Array<"190" | "491">,
    requiresStateResidence: row.requiresStateResidence,
    requiresRecentEmployment: row.requiresRecentEmployment,
    // One value: the rules file's (the dataset's copy disagreed for TAS and VIC).
    offshoreQuotaPressure: ruleQuotaPressure,
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
      programYear: opts.programYear ?? PROGRAM_YEAR_BY_STATE[row.code] ?? SEED_PROGRAM_YEAR,
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
      scoring: scoringFor(row, status, rule.offshoreQuotaPressure),
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
