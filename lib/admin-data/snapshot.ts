import type { StateRuleStatus } from "@/lib/state-nomination/state-rules-config";

import { buildSeedPrograms, STATE_ORDER } from "./seed";
import type { AdminStateData, StateDatasetRowView, StateProgramData, StateRuleView } from "./types";

/**
 * The snapshot: the admin rows turned into the shapes the readers already use (the rule config of the state, the dataset row of the score
 * formula), so the report, the chat, the residence code and the monitor read the admin's data without changing how they work.
 * The admin row IS the state's data: there is no date comparison against any other source.
 */

export function ruleViewOf(p: StateProgramData): StateRuleView {
  return {
    code: p.stateCode,
    name: p.stateName,
    status: p.status as StateRuleStatus,
    note: p.notes.en,
    offshoreQuotaPressure: p.scoring.ruleQuotaPressure,
    aiSummary: p.aiSummary.en,
    keyFacts: p.conditions.map((c) => c.text.en),
    lastVerified: p.lastVerifiedAt.slice(0, 10),
    sourceDocument: p.sourceText,
    notes: p.notes,
    conditions: p.conditions,
    exceptions: p.exceptions,
    openingDate: p.openingDate,
    programYear: p.programYear,
    officialUrl: p.officialUrl,
    subclasses: p.subclasses,
    keyFactFields: p.conditions.map((c) => c.text),
  };
}

export function datasetRowOf(p: StateProgramData): StateDatasetRowView {
  const s = p.scoring;
  return {
    code: p.stateCode,
    name: p.stateName,
    lastVerified: p.lastVerifiedAt.slice(0, 10),
    status: p.status,
    offshoreAvailability: s.offshoreAvailability,
    onshoreAvailability: s.onshoreAvailability,
    minimumPoints: s.minimumPoints,
    minimumEnglish: s.minimumEnglish,
    minimumExperienceYears: s.minimumExperienceYears,
    regionalFocus: s.regionalFocus,
    preferredVisaTypes: s.preferredVisaTypes,
    requiresStateResidence: s.requiresStateResidence,
    requiresRecentEmployment: s.requiresRecentEmployment,
    offshoreQuotaPressure: s.offshoreQuotaPressure,
    programWindow: s.programWindow,
    specialConditions: s.specialConditions.map((c) => c.en),
    specialConditionFields: s.specialConditions,
  };
}

export function toSnapshot(programs: Record<string, StateProgramData>, source: AdminStateData["source"], generatedAt: string): AdminStateData {
  const order = [...STATE_ORDER, ...Object.keys(programs).filter((c) => !STATE_ORDER.includes(c)).sort()];
  const present = order.filter((c) => programs[c]);
  return {
    source,
    generatedAt,
    programs,
    rules: Object.fromEntries(present.map((c) => [c, ruleViewOf(programs[c])])),
    dataset: present.map((c) => datasetRowOf(programs[c])),
  };
}

let seedCache: AdminStateData | null = null;
/** The snapshot built from the bundled seed: the default of every reader (so nothing needs a database) and the fallback when the database cannot be read. */
export function seedStateData(): AdminStateData {
  if (!seedCache) seedCache = toSnapshot(buildSeedPrograms(), "seed", "seed");
  return seedCache;
}

/** A copy of a snapshot with some programs replaced (tests and the admin preview). */
export function withPrograms(data: AdminStateData, patch: Record<string, Partial<StateProgramData>>): AdminStateData {
  const programs = { ...data.programs };
  for (const [code, p] of Object.entries(patch)) programs[code] = { ...programs[code], ...p } as StateProgramData;
  return toSnapshot(programs, data.source, data.generatedAt);
}

/** The state's rule view in a snapshot (undefined for a code the snapshot does not hold). */
export const ruleIn = (data: AdminStateData, code: string): StateRuleView | undefined => data.rules[code];
