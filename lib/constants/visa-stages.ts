/**
 * Canonical PR (permanent residence) journey stages for the B2C Applicant
 * Portal's Timeline/Stepper (components/dashboard/journey-timeline.tsx).
 * Stored verbatim as VisaJourney.currentStage (prisma/schema.prisma) -- a
 * plain string column, not a Postgres enum, so this array is the single
 * source of truth for valid values, ordering, and display metadata.
 *
 * STATE_SPONSORSHIP is only relevant to state-nominated pathways (190/491,
 * not 189) but is kept as a normal step in this fixed linear sequence
 * rather than a true conditional branch -- per-visa-subclass branching
 * would need journey.visaType to drive a different stage list per journey,
 * which is a larger feature than this task's scope. A 189 applicant can
 * just advance straight through it.
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

/** 0-based index of a stage in VISA_STAGES, or -1 if unrecognized (e.g. legacy data). */
export function visaStageIndex(stage: string): number {
  return VISA_STAGES.indexOf(stage as VisaStage);
}

/**
 * Progress percentage for a stage being the user's CURRENT (not-yet-completed)
 * stage -- i.e. how far through the 7-stage journey they are just by having
 * reached this stage. Evenly split: stage 1 of 7 ≈ 14%, ..., stage 7 of 7 =
 * 100%. Used both to seed a new journey's initial progress and to recompute
 * progress after updateJourneyStage advances currentStage.
 */
export function progressForStage(stage: VisaStage): number {
  const index = visaStageIndex(stage);
  if (index === -1) return 0;
  return Math.round(((index + 1) / VISA_STAGES.length) * 100);
}

/** The stage after `stage`, or null if `stage` is already the last one. */
export function nextVisaStage(stage: VisaStage): VisaStage | null {
  const index = visaStageIndex(stage);
  if (index === -1 || index >= VISA_STAGES.length - 1) return null;
  return VISA_STAGES[index + 1];
}

/** Per-stage status derived from position relative to the journey's current
 *  stage -- no separate status column exists (or is needed): a journey's
 *  progress is fully described by which single stage it's currently on, so
 *  every earlier stage is COMPLETED, the current one is IN_PROGRESS, and
 *  every later one is PENDING. */
export type VisaStageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export function stageStatus(stage: VisaStage, currentStage: string): VisaStageStatus {
  const currentIndex = visaStageIndex(currentStage);
  const stageIndex = visaStageIndex(stage);
  if (currentIndex === -1 || stageIndex < currentIndex) return "COMPLETED";
  if (stageIndex === currentIndex) return "IN_PROGRESS";
  return "PENDING";
}
