import type { jsPDF } from "jspdf";
import type { ReadinessReport } from "./types";
import type { Locale } from "./types";

/**
 * Shared types for the modular PDF generation system.
 *
 * The PDF generator used to be a 4,286-line monolithic file. It now lives
 * across pdf-sections/ (one file per major section), pdf-components/ (shared
 * visual building blocks), and pdf-content/ (statically authored content
 * strings). Every section receives a {@link PDFContext} which exposes the
 * jsPDF instance and the helpers it needs.
 *
 * This interface is intentionally wide — sections that only need typography
 * can still find charts available to them, because adding helper-method
 * properties is a far less breaking change than adding helper-method
 * arguments every time a section grows.
 */

export type ColorRGB = { r: number; g: number; b: number };

export type AlertLevel = "high" | "medium" | "low";

export interface Alert {
  label: string;
  body: string;
  level: AlertLevel;
}

/**
 * Localized text strings. All section functions take a `text` object so they
 * stay decoupled from `getLocalizedText()` and can be rendered with a
 * stub during early development.
 */
export interface LocalizedText {
  // Cover page
  readonly coverTitle: string;
  readonly coverSubtitle: string;
  readonly coverConfidential: string;
  readonly coverPreparedFor: string;
  readonly coverReference: string;

  // Report overview
  readonly reportOverviewTitle: string;
  readonly reportOverviewIntro: string;
  readonly executiveSummary: string;

  // Glossary
  readonly glossaryTitle: string;
  readonly glossaryIntro: string;

  // Visa system overview
  readonly visaSystemTitle: string;
  readonly visaSystemIntro: string;
  readonly visaSystemKeyPoints: readonly string[];

  // Viability ranking
  readonly visaViabilityRanking: string;
  readonly visaViabilityRankingIntro: string;

  // Pathway comparison
  readonly pathwayComparisonTitle: string;
  readonly pathwayComparisonIntro: string;

  // Checklist
  readonly lodgementReadyChecklist: string;
  readonly lodgementReadyChecklistIntro: string;

  // Points
  readonly pointsBreakdown: string;
  readonly pointsBoosterSimulator: string;
  readonly pointsBoosterSimulatorIntro: string;

  // Financial
  readonly financialRoadmap: string;
  readonly financialRoadmapIntro: string;
  readonly livingCostProjection: string;
  readonly livingCostBothNote: string;

  // Application guide
  readonly applicationGuideTitle: string;
  readonly applicationGuideIntro: string;
  readonly applicationGuideSteps: readonly {
    readonly title: string;
    readonly body: string;
  }[];

  // Common pitfalls
  readonly commonPitfallsTitle: string;
  readonly commonPitfallsIntro: string;
  readonly commonPitfallsItems: readonly string[];

  // FAQ
  readonly faqTitle: string;
  readonly faqIntro: string;
  readonly faqItems: readonly {
    readonly question: string;
    readonly answer: string;
  }[];

  // Resources
  readonly resourcesTitle: string;
  readonly resourcesIntro: string;
  readonly resourcesLinks: readonly { readonly label: string; readonly url: string }[];

  // Audit / action plan
  readonly auditReadyChecklist: string;
  readonly auditReadyChecklistIntro: string;
  readonly immediateActionPlan: string;
  readonly immediateActionPlanIntro: string;

  // Risk indicators
  readonly riskIndicators: string;
  readonly riskBoxIntro: string;
  readonly highRisk: string;
  readonly mediumRisk: string;
  readonly lowRisk: string;

  // Appendices
  readonly appendixA: string;
  readonly appendixAIntro: string;
  readonly appendixB: string;
  readonly appendixBIntro: string;
  readonly appendixC: string;
  readonly appendixCIntro: string;

  // Misc
  readonly anythingElse: string;
  readonly signalSnapshot: string;
  readonly progressionPathways: string;
  readonly progressionPathwaysIntro: string;
  readonly evidenceReadiness: string;
  readonly confidenceExplanation: string;
  readonly pathwayStrengthComparison: string;
  readonly pathwayStrengthIntro: string;
  readonly premiumSections: string;
  readonly premiumSectionsIntro: string;
  readonly downloadablePdf: string;
  readonly downloadablePdfDescription: string;
  readonly strategicGanttChart: string;
  readonly strategicGanttChartIntro: string;
  readonly referenceOnly: string;
  readonly category: string;
  readonly amount: string;
  readonly note: string;
  readonly scenarioTable: string;
  readonly pointsChange: string;
  readonly newTotal: string;
  readonly estimatedPoints: string;
  readonly estimatedWait: string;
  readonly subclass: string;
  readonly typicalPathLabel: string;
  readonly typicalPathExplainer: string;
  readonly signalReasonsLabel: string;
  readonly signalReasonsExplainer: string;
  readonly limitingFactorsLabel: string;
  readonly limitingFactorsExplainer: string;
  readonly monthlyRent: string;
  readonly monthlyGroceries: string;
  readonly monthlyTransport: string;
  readonly monthlyTotal: string;
  readonly stateNominationTracker: string;
  readonly stateNominationTrackerCanada: string;
  readonly topRecommendedStates: string;
  readonly topRecommendedStatesCanada: string;
  readonly stateRadar: string;
  readonly stateRadarCanada: string;
  readonly missingInformation: string;
  readonly actionRequired: string;
  readonly sparseDataNotice: string;
  readonly invitationTrends: string;
  readonly nocEcaSection: string;
  readonly crsTrends: string;
  readonly pnpHeatmap: string;
  readonly advisoryIntro: string;
  readonly stateRadarSubtitle: string;
  readonly belowPointsThreshold: string;
  readonly belowPointsThresholdExplainer: string;
  readonly criticalComplianceAlertLabel: string;
  readonly frictionLevel: string;
  readonly strongestSignal: string;
  readonly secondarySignals: string;
  readonly confidence: string;
  readonly noClearSecondarySignal: string;
  readonly noData: string;

  // Glossary terms and definitions
  readonly glossaryTermConfidence: string;
  readonly glossaryTermStrength: string;
  readonly glossaryTermFriction: string;
  readonly glossaryTermSignalConfidence: string;
  readonly glossaryTermEvidenceLoad: string;
  readonly glossaryTermEvidenceStatus: string;
  readonly glossaryTermPointsGap: string;
  readonly glossaryTermHardGate: string;
  readonly definitionConfidence: string;
  readonly definitionStrength: string;
  readonly definitionFriction: string;
  readonly definitionSignalConfidence: string;
  readonly definitionEvidenceLoad: string;
  readonly definitionEvidenceStatus: string;
  readonly definitionPointsGap: string;
  readonly definitionHardGate: string;

  // Living cost labels
  readonly livingCostSingle: string;
  readonly livingCostFamily: string;
  readonly livingCostProfileLabel: string;

  // Action plan labels
  readonly yourImmediateActionPlan: string;
  readonly nextStepBoxIntro: string;
  readonly important: string;

  // State nomination
  readonly stateCode: string;
  readonly stateStatus: string;
  readonly stateMatch: string;
  readonly stateTrackerIntro: string;
  readonly stateRadarMissingFieldsPrefix: string;

  // Badge labels
  readonly highPotentialBadge: string;
  readonly conditionalBadge: string;
  readonly highRiskBadge: string;
  readonly ineligibleComplianceViolation: string;
  readonly highlyRecommendedPathway: string;
  readonly alternativeOption: string;
  readonly highRiskLowProbability: string;
  readonly preliminarySignalOnly: string;
  readonly qualitativeFitPotential: string;
  readonly qualitativeFitUnclear: string;
  readonly qualitativeFitUnlikely: string;

  // Lodgement checklist
  readonly urgent: string;
  readonly blocked: string;
  readonly ready: string;

  // Points breakdown
  readonly pointsBreakdownTable: string;
  readonly pointsBreakdownIntro: string;
  readonly pointsEarned: string;
  readonly maxPoints: string;
  readonly totalRow: string;
  readonly minimumRequired: string;
  readonly primaryLimitingFactor: string;
  readonly realityCheck: string;
  readonly positionChangers: string;
  readonly pathwayTable: string;
  readonly pathwayFriction: string;
  readonly pathwayFrictionIntro: string;

  // Report overview labels
  readonly notProvided: string;
  readonly generatedDate: string;
  readonly nameLabel: string;
  readonly occupationLabel: string;
  readonly ageLabel: string;
  readonly currentCountryLabel: string;
  readonly englishLevelLabel: string;
  readonly goalLabel: string;
  readonly userInfo: string;
  readonly title: string;
}

/**
 * Feedback text block (separate from LocalizedText because it has a
 * different cadence — used for the closing CTA banner, not section bodies).
 */
export interface FeedbackText {
  readonly note: string;
  readonly cta: string;
}

/**
 * User input summary (a subset of ReadinessInput that the PDF actually reads).
 * Captured separately so the PDF doesn't need to import the full input type.
 */
export interface UserInputSummary {
  name?: string;
  email?: string;
  mainGoal?: string;
  currentCountry?: string;
  passportCountry?: string;
  age?: string;
  occupation?: string;
  preferredPathway?: string;
  biggestConcern?: string;
  estimatedBudgetRange?: string;
  timeline?: string;
  englishLevel?: string;
  annualSalaryAud?: string | null;
  migrationGoals?: string[];
  skillsAssessmentDone?: boolean | null;
  isAustralianQualification?: boolean | null;
  isQualificationRecognized?: boolean | null;
  /** Historical invitation round cutoff data for the user's occupation */
  viability?: {
    cutoffScore: number;
    roundDate: string;
    totalInvited: number;
    occupationTitle: string;
    gap: number;
    viability: "strong" | "viable" | "borderline" | "below_threshold";
  } | null;
}

/**
 * The PDF helper API passed to every section render function.
 *
 * Sections treat this as a black box of "things I can do on the document" —
 * they don't interact with the jsPDF instance directly. That keeps the
 * orchestrator responsible for font registration, page numbers, and global
 * state, and the sections focused on layout.
 */
export interface PDFContext {
  readonly doc: jsPDF;
  readonly report: ReadinessReport;
  readonly locale: Locale;
  readonly text: LocalizedText;
  readonly feedbackText: FeedbackText;
  readonly userInputSummary: UserInputSummary;
  readonly effectiveLocale: Locale;
  readonly cjkFontAvailable: boolean;
  readonly cjkBoldFontAvailable: boolean;
  readonly activeFontName: string;
  readonly activeBoldAvailable: boolean;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly margin: number;
  readonly contentWidth: number;
  readonly contentBottom: number;
  readonly lineHeight: number;
  readonly COLORS: {
    readonly primary: ColorRGB;
    readonly accent: ColorRGB;
    readonly gold: ColorRGB;
    readonly text: ColorRGB;
    readonly lightText: ColorRGB;
    readonly border: ColorRGB;
    readonly tableHeader: ColorRGB;
    readonly zebra: ColorRGB;
    readonly riskHigh: ColorRGB;
    readonly riskMedium: ColorRGB;
    readonly riskLow: ColorRGB;
  };
  readonly FONTS: {
    readonly title: number;
    readonly heading: number;
    readonly subheading: number;
    readonly body: number;
    readonly small: number;
  };

  /**
   * The shared y-position cursor. Sections mutate this by adding to it after
   * each render; the orchestrator reads it back when it needs to know where
   * the next section should start.
   */
  yPosition: number;
  /** Number of pages currently in the document (sections may add pages). */
  pageCount: number;

  // ── Typography helpers ──────────────────────────────────────────────
  setBaseFont(): void;
  setBoldFont(): void;
  safeText(value: string): string;
  cleanNum(value: string): string;
  clipToWidth(value: string, maxWidthMm: number): string;

  // ── Layout helpers ──────────────────────────────────────────────────
  ensurePageSpace(heightNeeded?: number): void;
  drawSeparator(): void;
  addSectionHeading(symbol: string, heading: string): void;
  addTitle(title: string): void;
  addHeading(heading: string): void;
  addBody(text: string, indent?: number): void;
  addSmallText(text: string, indent?: number): void;
  addBulletPoints(items: string[]): void;
  addCriticalAlertText(value: string, indent?: number, color?: ColorRGB): void;
  addPremiumBulletContainer(title: string, items: string[], accent?: ColorRGB): void;
  addPremiumKeyValueContainer(
    title: string,
    rows: Array<[string, string]>,
    accent?: ColorRGB,
  ): void;

  // ── Tables & charts ─────────────────────────────────────────────────
  drawTable(
    headers: string[],
    rows: string[][],
    columnWidths: number[],
    highlightRow?: (rowIndex: number) => ColorRGB | null,
  ): void;
  drawGanttTimeline(): void;
  drawCrsBarChart(): void;
  drawPnpHeatmap(): void;
  drawStateRadar(): void;
  drawFamilyLivingCosts(): void;

  // ── Alerts & boxes ──────────────────────────────────────────────────
  drawAlertCollection(
    title: string,
    intro: string,
    alerts: Alert[],
    type: "risk" | "info",
  ): void;
  drawActionRequiredBox(sectionLabel: string, requiredFields: string[]): void;
  drawAuditChecklistBox(): void;
  drawMissingInfoBox(): void;
  drawSparseDataDisclaimer(): void;
  drawVisualPlaceholder(sectionTitle: string): void;
  formatDifficulty(level: "low" | "medium" | "high" | "extreme"): string;
  formatStrength(level: "limited" | "moderate" | "strong"): string;
  formatSignalConfidence(level: "limited" | "moderate" | "stronger"): string;
  formatConfidenceLevel(level: "low" | "medium" | "high"): string;
  formatLoad(level: "low" | "medium" | "high"): string;
  formatEvidenceStatus(status: "provided" | "missing" | "unclear" | "typically_required"): string;
  formatRecommendationTag(tag: string): string;
  drawAppendixDividerPage(
    letter: string,
    titleEn: string,
    subtitleEn: string,
    titleTr: string,
    titleZh: string,
  ): void;
  drawNocEcaSection(): void;
  drawImmediateActionPlan(): void;
  drawVisaViabilityRanking(): void;
  drawLodgementReadyChecklist(): void;
  drawTopRecommendedStates(): void;
  drawStateNominationTable(): void;
  drawStateNominationBlockedNotice(): void;
  drawPartialDataWarning(): void;
  drawGlossary(): void;
  drawReportOverview(): void;
  drawCoverPage(): void;
  drawPartnerSponsorshipReport(): void;
  drawPointsBreakdownPointerBox(): void;
  drawAuditChecklistBoxInline(): void;
  drawFamilyLivingCostsInline(): void;
  drawGanttTimelineInline(): void;
  drawCrsBarChartInline(): void;
  drawPnpHeatmapInline(): void;
  drawStateRadarInline(): void;
  addViralCTABanner(): void;
  addGlobalFooters(): void;
}

/**
 * A section render function: takes the context, mutates the document, and
 * returns. Sections never call each other directly — the orchestrator is
 * the only thing that knows the order.
 */
export type PDFSection = (ctx: PDFContext) => void;
