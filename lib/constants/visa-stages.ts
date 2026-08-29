/**
 * Canonical PR (permanent residence) journey stages for the B2C Applicant
 * Portal's Timeline/Stepper (components/dashboard/journey-timeline.tsx).
 * Stored verbatim as VisaJourney.currentStage (prisma/schema.prisma) -- a
 * plain string column, not a Postgres enum, so this array is the single
 * source of truth for valid values, ordering, and display metadata.
 */
export const VISA_STAGES = [
  "PREPARATION",
  "ENGLISH_TEST",
  "SKILLS_ASSESSMENT",
  "EOI_LODGEMENT",
  "STATE_SPONSORSHIP",
  "VISA_APPLICATION",
  "VISA_GRANTED",
] as const;

export type VisaStage = (typeof VISA_STAGES)[number];

export function isVisaStage(value: string): value is VisaStage {
  return (VISA_STAGES as readonly string[]).includes(value);
}

/** The only visa types selectable when starting a journey (see
 *  StartJourneyForm in components/dashboard/journey-timeline.tsx) -- picking
 *  from this fixed list, rather than free text, is what lets
 *  getVisaStages() below reliably branch per subclass. */
export const VALID_VISA_TYPES = ["189", "190", "491", "482", "500"] as const;

export type VisaType = (typeof VALID_VISA_TYPES)[number];

export function isVisaType(value: string): value is VisaType {
  return (VALID_VISA_TYPES as readonly string[]).includes(value);
}

/** State/regional nomination only exists for these pathways -- 189
 *  (Skilled Independent), 482 (employer-sponsored), and 500 (student) never
 *  go through a state nomination step. */
const STATE_SPONSORED_VISA_TYPES = new Set<string>(["190", "491"]);

/**
 * The stage sequence for a given visa type. Unknown/legacy visaType values
 * (e.g. a journey created before this dropdown existed, when visaType was
 * free text like "Subclass 189") fall back to the full sequence, matching
 * this app's pre-existing behavior rather than silently hiding a stage for
 * data this function doesn't recognize.
 */
export function getVisaStages(visaType: string): readonly VisaStage[] {
  if (STATE_SPONSORED_VISA_TYPES.has(visaType)) return VISA_STAGES;
  return VISA_STAGES.filter((stage) => stage !== "STATE_SPONSORSHIP");
}

/** i18n keys (public/locales/{locale}.json) for each stage's title/description. */
export const VISA_STAGE_I18N: Record<VisaStage, { titleKey: string; descriptionKey: string }> = {
  PREPARATION: { titleKey: "portal.stage.preparation", descriptionKey: "portal.stageDesc.preparation" },
  ENGLISH_TEST: { titleKey: "portal.stage.englishTest", descriptionKey: "portal.stageDesc.englishTest" },
  SKILLS_ASSESSMENT: {
    titleKey: "portal.stage.skillsAssessment",
    descriptionKey: "portal.stageDesc.skillsAssessment",
  },
  EOI_LODGEMENT: { titleKey: "portal.stage.eoiLodgement", descriptionKey: "portal.stageDesc.eoiLodgement" },
  STATE_SPONSORSHIP: {
    titleKey: "portal.stage.stateSponsorship",
    descriptionKey: "portal.stageDesc.stateSponsorship",
  },
  VISA_APPLICATION: {
    titleKey: "portal.stage.visaApplication",
    descriptionKey: "portal.stageDesc.visaApplication",
  },
  VISA_GRANTED: { titleKey: "portal.stage.visaGranted", descriptionKey: "portal.stageDesc.visaGranted" },
};

/** 0-based index of a stage within `stages` (defaults to the full
 *  VISA_STAGES sequence), or -1 if unrecognized (e.g. legacy data). */
export function visaStageIndex(stage: string, stages: readonly VisaStage[] = VISA_STAGES): number {
  return stages.indexOf(stage as VisaStage);
}

/**
 * Progress percentage for a stage being the user's CURRENT (not-yet-completed)
 * stage -- i.e. how far through the journey they are just by having reached
 * this stage. Evenly split across whichever stage list applies to this
 * journey's visa type (see getVisaStages) -- a 189 journey (6 stages) and a
 * 190 journey (7 stages) both reach 100% on their own last stage.
 */
export function progressForStage(stage: VisaStage, stages: readonly VisaStage[] = VISA_STAGES): number {
  const index = visaStageIndex(stage, stages);
  if (index === -1) return 0;
  return Math.round(((index + 1) / stages.length) * 100);
}

/** The stage after `stage` within `stages`, or null if already the last one. */
export function nextVisaStage(stage: VisaStage, stages: readonly VisaStage[] = VISA_STAGES): VisaStage | null {
  const index = visaStageIndex(stage, stages);
  if (index === -1 || index >= stages.length - 1) return null;
  return stages[index + 1];
}

/** Per-stage status derived from position relative to the journey's current
 *  stage -- no separate status column exists (or is needed): a journey's
 *  progress is fully described by which single stage it's currently on, so
 *  every earlier stage (within `stages`) is COMPLETED, the current one is
 *  IN_PROGRESS, and every later one is PENDING. */
export type VisaStageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export function stageStatus(
  stage: VisaStage,
  currentStage: string,
  stages: readonly VisaStage[] = VISA_STAGES
): VisaStageStatus {
  const currentIndex = visaStageIndex(currentStage, stages);
  const stageIndex = visaStageIndex(stage, stages);
  if (currentIndex === -1 || stageIndex < currentIndex) return "COMPLETED";
  if (stageIndex === currentIndex) return "IN_PROGRESS";
  return "PENDING";
}
