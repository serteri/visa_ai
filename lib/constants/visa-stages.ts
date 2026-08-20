/**
 * Canonical PR (permanent residence) journey stages for the B2C Applicant
 * Portal's Timeline/Stepper (JourneyTimelineCard). Stored verbatim as
 * VisaJourney.currentStage (prisma/schema.prisma) -- a plain string column,
 * not a Postgres enum, so this array is the single source of truth for
 * valid values, ordering, and display metadata.
 */
export const VISA_STAGES = [
  "PREPARATION",
  "ENGLISH_TEST",
  "SKILLS_ASSESSMENT",
  "EOI_NOMINATION",
  "VISA_LODGE",
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
  EOI_NOMINATION: { titleKey: "portal.stage.eoiNomination", descriptionKey: "portal.stageDesc.eoiNomination" },
  VISA_LODGE: { titleKey: "portal.stage.visaLodge", descriptionKey: "portal.stageDesc.visaLodge" },
};

/** 0-based index of a stage in VISA_STAGES, or -1 if unrecognized (e.g. legacy data). */
export function visaStageIndex(stage: string): number {
  return VISA_STAGES.indexOf(stage as VisaStage);
}

/**
 * Progress percentage for a stage being the user's CURRENT (not-yet-completed)
 * stage -- i.e. how far through the 5-stage journey they are just by having
 * reached this stage. Evenly split: stage 1 of 5 = 20%, ..., stage 5 of 5 =
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
