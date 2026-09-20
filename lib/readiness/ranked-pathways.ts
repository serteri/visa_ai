import type {
  AssessmentState,
  ConfidenceLevel,
  Locale,
  NominationStream,
  PathwayComparison,
  QualitativeFitTier,
  RankedPathway,
  RankedPathwayRecommendation,
  ReadinessReport,
} from "./types";
import { isPartnerPathwaySelected } from "./engine";
import { describePathwayScore } from "./pathway-scores";
import type { PathwayFit } from "./pathway-ranking";

type RankedPathwayInput = {
  age?: string;
  currentCountry?: string;
  locale?: Locale;
  preferredPathway?: string;
};

const AU_RANKED_VISA_LABELS: Record<"189" | "190" | "491", Record<Locale, string>> = {
  "189": { en: "189 Visa", tr: "189 Vizesi", "zh-Hans": "189 签证" },
  "190": { en: "190 Visa", tr: "190 Vizesi", "zh-Hans": "190 签证" },
  "491": { en: "491 Visa", tr: "491 Vizesi", "zh-Hans": "491 签证" },
};

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(98, Math.round(value)));
}

/**
 * Appends the stream suffix (e.g. " — Direct Entry") to a 186 visa label
 * when the nominationStream is explicitly set.
 */
export function appendNominationStreamSuffix(label: string, nominationStream?: NominationStream): string {
  if (nominationStream === "direct_entry") return `${label} — Direct Entry`;
  if (nominationStream === "trt") return `${label} — TRT`;
  if (nominationStream === "labour_agreement") return `${label} — Labour Agreement`;
  return label;
}

function parseAgeNumber(age?: string): number | undefined {
  if (!age) return undefined;
  const match = age.match(/\d+/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isLikelyOffshore(currentCountry?: string): boolean {
  if (!currentCountry) return false;
  const normalized = currentCountry.trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes("australia") && !normalized.includes("australya") && normalized !== "au";
}

function confidenceToBaseScore(level?: ConfidenceLevel): number {
  if (level === "high") return 74;
  if (level === "medium") return 61;
  if (level === "low") return 47;
  return 55;
}

const CA_PATHWAY_LABELS: Record<string, Record<Locale, string>> = {
  CEC: {
    en: "Canadian Experience Class (CEC)",
    tr: "Canadian Experience Class (CEC)",
    "zh-Hans": "加拿大经验类 (CEC)",
  },
  FSW: {
    en: "Federal Skilled Worker (FSW)",
    tr: "Federal Skilled Worker (FSW)",
    "zh-Hans": "联邦技术工人类 (FSW)",
  },
  FSTP: {
    en: "Federal Skilled Trades (FSTP)",
    tr: "Federal Skilled Trades (FSTP)",
    "zh-Hans": "联邦技工类 (FSTP)",
  },
  PNP: {
    en: "Provincial Nominee Program (PNP)",
    tr: "Provincial Nominee Program (PNP)",
    "zh-Hans": "省提名计划 (PNP)",
  },
  AIP: {
    en: "Atlantic Immigration Program (AIP)",
    tr: "Atlantic Immigration Program (AIP)",
    "zh-Hans": "大西洋移民计划 (AIP)",
  },
  FAMILY_SPONSORSHIP: {
    en: "Family Sponsorship",
    tr: "Aile Sponsorluğu",
    "zh-Hans": "家庭担保",
  },
  BC_SKILLED_WORKER: {
    en: "BC PNP Skills Immigration — Skilled Worker",
    tr: "BC PNP Skills Immigration — Skilled Worker",
    "zh-Hans": "BC省技术移民 — Skilled Worker",
  },
  BC_HEALTH_AUTHORITY: {
    en: "BC PNP Skills Immigration — Health Authority",
    tr: "BC PNP Skills Immigration — Health Authority",
    "zh-Hans": "BC省技术移民 — Health Authority",
  },
  BC_INTL_GRAD: {
    en: "BC PNP Skills Immigration — International Graduate",
    tr: "BC PNP Skills Immigration — International Graduate",
    "zh-Hans": "BC省技术移民 — International Graduate",
  },
  BC_INTL_POSTGRAD: {
    en: "BC PNP Skills Immigration — International Post-Graduate",
    tr: "BC PNP Skills Immigration — International Post-Graduate",
    "zh-Hans": "BC省技术移民 — International Post-Graduate",
  },
  BC_EEBC: {
    en: "BC PNP Express Entry BC (EEBC)",
    tr: "BC PNP Express Entry BC (EEBC)",
    "zh-Hans": "BC省 Express Entry BC (EEBC)",
  },
  AB_OPPORTUNITY: {
    en: "Alberta Opportunity Stream (AOS)",
    tr: "Alberta Opportunity Stream (AOS)",
    "zh-Hans": "阿尔伯塔 Opportunity Stream (AOS)",
  },
  AB_EXPRESS_ENTRY: {
    en: "Alberta Express Entry Stream (AEES)",
    tr: "Alberta Express Entry Stream (AEES)",
    "zh-Hans": "阿尔伯塔 Express Entry Stream (AEES)",
  },
  AB_RURAL_RENEWAL: {
    en: "Alberta Rural Renewal Stream",
    tr: "Alberta Rural Renewal Stream",
    "zh-Hans": "阿尔伯塔 Rural Renewal Stream",
  },
  AB_TOURISM_HOSPITALITY: {
    en: "Alberta Tourism and Hospitality Stream",
    tr: "Alberta Tourism and Hospitality Stream",
    "zh-Hans": "阿尔伯塔 Tourism and Hospitality Stream",
  },
  STREAM_1_SPECIALIZED: {
    en: "Quebec PSTQ Stream 1 — Specialized Skills",
    tr: "Quebec PSTQ Stream 1 — Nitelikli ve Uzmanlaşmış Beceriler",
    "zh-Hans": "魁北克 PSTQ 通道 1 — 专业与高技术技能",
  },
  STREAM_2_INTERMEDIATE: {
    en: "Quebec PSTQ Stream 2 — Intermediate Skills",
    tr: "Quebec PSTQ Stream 2 — Orta Seviye ve Manuel Beceriler",
    "zh-Hans": "魁北克 PSTQ 通道 2 — 中等与手艺技能",
  },
  STREAM_3_REGULATED: {
    en: "Quebec PSTQ Stream 3 — Regulated Professions",
    tr: "Quebec PSTQ Stream 3 — Regüle Meslekler",
    "zh-Hans": "魁北克 PSTQ 通道 3 — 受监管职业",
  },
  STREAM_4_EXCEPTIONAL: {
    en: "Quebec PSTQ Stream 4 — Exceptional Talent",
    tr: "Quebec PSTQ Stream 4 — İstisnai Yetenek",
    "zh-Hans": "魁北克 PSTQ 通道 4 — 杰出人才",
  },
};

function getLocalizedPathwayLabel(subclass: string, locale: Locale, fallback?: string): string {
  if (subclass in AU_RANKED_VISA_LABELS) {
    return AU_RANKED_VISA_LABELS[subclass as keyof typeof AU_RANKED_VISA_LABELS][locale];
  }

  const localizedCaLabel = CA_PATHWAY_LABELS[subclass];
  if (localizedCaLabel) return localizedCaLabel[locale];
  return fallback ?? subclass;
}

function confidenceToCaScore(level?: ConfidenceLevel): number {
  if (level === "high") return 72;
  if (level === "medium") return 58;
  if (level === "low") return 38;
  return 45;
}

export function buildCaRankedPathways(
  report: ReadinessReport,
  locale: Locale = "en"
): RankedPathway[] {
  const pathways: PathwayComparison[] = report.pathwayComparison ?? [];
  if (pathways.length === 0) return [];

  if (!report.assessmentState.canShowNumericRanking) {
    const { note: preliminaryNote, forcedTier } = resolveQualitativeNote(report.assessmentState, locale, "CA");
    const raw = pathways
      .filter((p) => p.subclass && CA_PATHWAY_LABELS[p.subclass])
      .map((p) => ({
        subclass: p.subclass as RankedPathway["subclass"],
        visaLabel: getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
        qualitativeTier: forcedTier ?? confidenceToQualitativeTier(p.confidenceLevel),
        isPreliminaryOnly: true,
        preliminaryNote,
      }));
    const sorted = [...raw].sort(
      (a, b) => qualitativeTierRank(b.qualitativeTier) - qualitativeTierRank(a.qualitativeTier)
    );
    return sorted.map((item) => ({ ...item, recommendationTag: "🔍 Preliminary Signal Only" as const }));
  }

  const crsSignal = report.pointsEstimate?.estimatedPoints ?? 0;

  const raw = pathways
    .filter((p) => p.subclass && CA_PATHWAY_LABELS[p.subclass])
    .map((p) => {
      const base = confidenceToCaScore(p.confidenceLevel);
      return {
        subclass: p.subclass as RankedPathway["subclass"],
        visaLabel: getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
        matchPercentage: clampPercentage(base),
        pointsSignal: crsSignal,
      };
    });

  if (raw.length === 0) return [];

  // Mirrors the AU branch's eoiBlocked gate above (calculateRankedPathways):
  // canShowNumericRanking only guarantees enough data exists to compute a
  // number, not that EOI lodgement is actually unblocked. Never tag a CA
  // pathway "Highly Recommended" while blocked.
  const eoiBlocked = !report.assessmentState.isEoiEligible;

  const sorted = [...raw].sort((a, b) => b.matchPercentage! - a.matchPercentage!);
  return sorted.map((item, index) => ({
    ...item,
    recommendationTag:
      eoiBlocked
        ? "⚠️ High Risk / Low Probability"
        : index === 0
          ? "🌟 Highly Recommended Pathway"
          : index === 1
            ? "⚖️ Alternative Option"
            : "⚠️ High Risk / Low Probability",
  }));
}

function confidenceToQualitativeTier(level?: ConfidenceLevel): QualitativeFitTier {
  if (level === "high") return "Potential fit";
  if (level === "medium") return "Unclear fit";
  return "Unlikely fit";
}

function qualitativeTierRank(tier: QualitativeFitTier): number {
  if (tier === "Potential fit") return 2;
  if (tier === "Unclear fit") return 1;
  return 0;
}

/**
 * Names THE single most fundamental hard gate blocking a numeric ranking,
 * instead of the old generic "Preliminary signal only — points cannot be
 * calculated until X, Y, Z are provided" copy-pasted across all three of
 * 189/190/491 (robotic, and unhelpful since it dumps every missing field at
 * once instead of telling the user what to fix first).
 *
 * Reads assessmentState.eoiIneligibilityReason (the canonical, country-aware
 * blocking reason -- see assessment-state.ts / engine.ts's
 * buildCanadaPointsEstimate) instead of the AU-only fieldsPresent.
 * skillsAssessment / a locally-recomputed points<65 check, both of which
 * are meaningless for CA (fieldsPresent.skillsAssessment is always false
 * for CA, since occupationConfirmed isn't a CA form field -- this
 * previously made every CA profile reaching this function say "Positive
 * Skills Assessment is missing" regardless of the real reason, which for
 * CA is always the language-test gate).
 */
function pickHardGateReason(assessmentState: AssessmentState, country: "AU" | "CA" = "AU", locale: Locale = "en"): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const isCA = country === "CA";
  const reason = assessmentState.eoiIneligibilityReason;

  if (reason === "english") {
    if (isCA) {
      return isTr
        ? "Yol Engellendi: Geçerli bir dil testi sonucu eksik"
        : isZh
          ? "路径受阻：缺少有效的语言考试成绩"
          : "Pathway Blocked: A valid language test result is missing";
    }
    return isTr
      ? "Yol Engellendi: Competent English seviyesi karşılanmadı"
      : isZh
        ? "路径受阻：未达到能力级英语水平"
        : "Pathway Blocked: Competent English level not met";
  }

  if (reason === "skills_assessment") {
    return isTr
      ? "Yol Engellendi: Olumlu Beceri Değerlendirmesi eksik"
      : isZh
        ? "路径受阻：缺少积极的技能评估结果"
        : "Pathway Blocked: Positive Skills Assessment is missing";
  }

  if (reason === "age") {
    return isTr
      ? "Yol Engellendi: Yaş sınırı aşıldı"
      : isZh
        ? "路径受阻：已超过年龄上限"
        : "Pathway Blocked: Age limit exceeded";
  }

  // AU-only: CA has no fixed CRS pass/fail threshold, so
  // eoiIneligibilityReason is never "points" for CA.
  if (reason === "points" && typeof assessmentState.estimatedPoints === "number") {
    return isTr
      ? "Yol Engellendi: Puan barajı karşılanmadı"
      : isZh
        ? "路径受阻：未达到积分门槛"
        : "Pathway Blocked: Points threshold not met";
  }

  const firstMissing = assessmentState.missingFieldLabels[0];
  if (firstMissing) {
    return isTr
      ? `Yol Engellendi: ${firstMissing} eksik`
      : isZh
        ? `路径受阻：缺少${firstMissing}`
        : `Pathway Blocked: ${firstMissing} missing`;
  }

  return isTr
    ? "Yol Engellendi: Profil bilgisi eksik"
    : isZh
      ? "路径受阻：档案信息不完整"
      : "Pathway Blocked: Profile information incomplete";
}

/**
 * Picks the correct user-facing message for a gated (non-numeric) pathway.
 * "ineligible" and "unverified" occupation findings are distinct facts and
 * must not collapse into the generic "missing profile fields" message:
 * - ineligible: a real occupation-dataset match was found and confirmed
 *   NOT relevant to 189/190/491 — the pathway is genuinely unlikely to fit.
 * - unverified (occupation was typed but not found in the dataset): we
 *   simply don't know either way — the pathway's fit is unclear, not ruled
 *   out.
 * - otherwise: fall back to the generic missing-fields explanation (covers
 *   the case where occupation itself was never entered, and CA reports
 *   which are exempt from this AU-specific occupation-eligibility check).
 */
function resolveQualitativeNote(
  assessmentState: AssessmentState,
  locale: Locale,
  country: "AU" | "CA" = "AU"
): { note: string; forcedTier?: QualitativeFitTier } {
  if (assessmentState.occupationEligibility === "ineligible") {
    return { note: assessmentState.occupationEligibilityReason, forcedTier: "Unlikely fit" };
  }
  if (assessmentState.occupationEligibility === "unverified" && assessmentState.fieldsPresent.occupation) {
    return { note: assessmentState.occupationEligibilityReason, forcedTier: "Unclear fit" };
  }
  return { note: pickHardGateReason(assessmentState, country, locale) };
}

/**
 * Reads assessmentState.canShowNumericRanking (the single source of truth
 * computed once in the base engine) so this section can never disagree with
 * the Executive Summary about whether enough data exists for a real number.
 */
function calculateQualitativeRankedPathways(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const { note: preliminaryNote, forcedTier } = resolveQualitativeNote(report.assessmentState, locale);
  const getPathwayConfidence = (subclass: "189" | "190" | "491") =>
    report.pathwayComparison.find((pathway) => pathway.subclass === subclass)?.confidenceLevel;

  const raw: Array<Omit<RankedPathway, "recommendationTag">> = (["189", "190", "491"] as const).map(
    (subclass) => ({
      subclass,
      visaLabel: getLocalizedPathwayLabel(subclass, locale, `${subclass} Visa`),
      qualitativeTier: forcedTier ?? confidenceToQualitativeTier(getPathwayConfidence(subclass)),
      isPreliminaryOnly: true,
      preliminaryNote,
    })
  );

  const sorted = [...raw].sort(
    (a, b) => qualitativeTierRank(b.qualitativeTier!) - qualitativeTierRank(a.qualitativeTier!)
  );

  return sorted.map((item) => ({
    ...item,
    recommendationTag: "🔍 Preliminary Signal Only" as const,
  }));
}

const GATE_BASED_SUBCLASSES = ["500", "485", "482", "186"] as const;

/**
 * 500, 485, 482, and 186 are structurally gate/eligibility-based (a
 * study-intent, graduate-study-completion, employer-sponsorship, or
 * nomination-stream threshold, never a competitive points test), unlike
 * 189/190/491 which are points-tested and only fall back to a qualitative
 * tier when data happens to be missing. So these are always represented as
 * a qualitative tier — never a fabricated matchPercentage — regardless of
 * assessmentState.canShowNumericRanking, which governs the skilled/points
 * lane only.
 *
 * Hard-ineligible cases (e.g. 482's CSIT salary gate, 186's TRT tenure gate
 * or Direct Entry age gate) are deliberately excluded here: those are
 * surfaced instead by generate-pdf.ts's buildIneligiblePathwayEntries,
 * which scans pathwayComparison directly for relevance === "ineligible".
 * Including them here too would just produce a duplicate row (the two get
 * de-duplicated by subclass) — cleaner to leave that case fully owned by
 * the existing sweep. IMPORTANT: buildIneligiblePathwayEntries's own
 * INELIGIBLE_RANKING_SUBCLASSES allow-list must include every subclass
 * added here, or a hard-ineligible entry for that subclass would be
 * dropped from the ranking entirely — caught by neither path.
 */
function buildGateBasedRankedPathways(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const raw: Array<Omit<RankedPathway, "recommendationTag">> = report.pathwayComparison
    .filter(
      (p): p is PathwayComparison & { subclass: (typeof GATE_BASED_SUBCLASSES)[number] } =>
        (GATE_BASED_SUBCLASSES as readonly string[]).includes(p.subclass) && p.relevance !== "ineligible"
    )
    .map((p) => ({
      subclass: p.subclass,
      visaLabel: p.subclass === "186"
        ? appendNominationStreamSuffix(
            getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
            report.nominationStream,
          )
        : getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
      qualitativeTier: confidenceToQualitativeTier(p.confidenceLevel),
      isPreliminaryOnly: true,
      isGateBased: true,
      preliminaryNote: p.reason,
    }));

  const sorted = [...raw].sort(
    (a, b) => qualitativeTierRank(b.qualitativeTier!) - qualitativeTierRank(a.qualitativeTier!)
  );

  return sorted.map((item) => ({
    ...item,
    recommendationTag: "🔍 Preliminary Signal Only" as const,
  }));
}

const FIT_TO_TIER: Record<Exclude<PathwayFit, "blocked">, QualitativeFitTier> = {
  potential_fit: "Potential fit",
  unclear_fit: "Unclear fit",
  unlikely_fit: "Unlikely fit",
};

/**
 * AU 189/190/491 rows, derived ONLY from report.pathwayRanking (pathway-ranking.ts): the order, the fit
 * label and the score sentence come from there. A blocked pathway is always shown as "Blocked" with the
 * same label, in the same order, as every other section.
 */
function buildAuRankedFromRanking(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const ranking = report.pathwayRanking!;
  const numeric = report.assessmentState.canShowNumericRanking;

  // Legacy display percentages (only for unblocked pathways, only when a number may be shown): the
  // same figures as before, but assigned in RANKING order so the percentage can never contradict it.
  let percentages: number[] = [];
  if (numeric) {
    const pointsDelta = Math.max(-10, Math.min(30, ranking.entries[0].score.baseScore - 65));
    const conf = (s: "189" | "190" | "491") =>
      clampPercentage(confidenceToBaseScore(report.pathwayComparison.find((p) => p.subclass === s)?.confidenceLevel) + pointsDelta);
    percentages = ranking.entries.map((e) => conf(e.subclass)).sort((a, b) => b - a);
  }

  let firstRecommendable = true;
  let secondRecommendable = false;
  return ranking.entries.map((entry, index): RankedPathway => {
    const base: Omit<RankedPathway, "recommendationTag"> = {
      subclass: entry.subclass,
      visaLabel: getLocalizedPathwayLabel(entry.subclass, locale, `${entry.subclass} Visa`),
    };
    const note = describePathwayScore(entry.score, locale);
    if (entry.fit === "blocked" || !numeric) {
      return {
        ...base,
        qualitativeTier: entry.fit === "blocked" ? "Blocked" : FIT_TO_TIER[entry.fit],
        blockReason: entry.blockReason ?? undefined,
        isPreliminaryOnly: true,
        preliminaryNote: note,
        recommendationTag: "🔍 Preliminary Signal Only",
      };
    }
    let tag: RankedPathwayRecommendation = "⚠️ High Risk / Low Probability";
    if (entry.recommendable && firstRecommendable) {
      tag = "🌟 Highly Recommended Pathway";
      firstRecommendable = false;
      secondRecommendable = true;
    } else if (entry.recommendable && secondRecommendable) {
      tag = "⚖️ Alternative Option";
      secondRecommendable = false;
    }
    return {
      ...base,
      matchPercentage: percentages[index],
      pointsSignal: entry.score.baseScore,
      preliminaryNote: note,
      recommendationTag: tag,
    };
  });
}

export function calculateRankedPathways(
  report: ReadinessReport,
  input: RankedPathwayInput
): RankedPathway[] {
  // Same hard scope boundary as detectSubclasses() in engine.ts: when the
  // user explicitly selected the Partner visa (820/801) pathway, the
  // qualitative-fallback branch below would otherwise still show 189/190/491
  // "Unlikely fit" rows unconditionally (it maps over a fixed triplet
  // regardless of what was actually detected) — reintroducing, in the Visa
  // Viability Ranking section, the exact bug just fixed in pathwayComparison.
  if (isPartnerPathwaySelected(input)) return [];

  const locale = input.locale ?? "en";
  const gateBasedPathways = buildGateBasedRankedPathways(report, locale);
  const detectedSubclasses = report.detectedSubclasses ?? report.pathwayComparison.map((pathway) => pathway.subclass);
  const skilledDetected = detectedSubclasses.some((subclass) =>
    ["189", "190", "491"].includes(subclass)
  );

  // AU with a score set: the single ranking decides order, fit and label.
  if (report.pathwayRanking && skilledDetected) {
    return [...buildAuRankedFromRanking(report, locale), ...gateBasedPathways];
  }

  // No score set (no estimate could be computed): the qualitative fallback is the only honest output.
  return [...calculateQualitativeRankedPathways(report, locale), ...gateBasedPathways];
}
