import type { AssessmentState, DataCompletenessLevel, Locale, PathwayComparison, ReadinessInput } from "./types";

function fieldLabel(key: keyof AssessmentState["fieldsPresent"], locale: Locale): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const labels: Record<keyof AssessmentState["fieldsPresent"], [string, string, string]> = {
    age: ["Age", "Yaş", "年龄"],
    englishLevel: ["English level", "İngilizce seviyesi", "英语水平"],
    englishTestEvidence: ["English test evidence", "İngilizce sınav kanıtı", "英语考试证明"],
    occupation: ["Occupation", "Meslek", "职业"],
    skillsAssessment: ["Skills assessment outcome", "Beceri değerlendirme sonucu", "职业评估结果"],
    workExperienceYears: ["Work experience years", "İş deneyimi (yıl)", "工作经验年限"],
    partnerStatus: ["Partner status", "Partner durumu", "配偶/伴侣状态"],
    stateNomination: ["State/regional nomination status", "Eyalet/bölgesel adaylık durumu", "州/地区提名状态"],
    healthCharacterDocs: ["Health and character documents", "Sağlık ve karakter belgeleri", "体检与品格证明文件"],
  };
  const [en, tr, zh] = labels[key];
  return isTr ? tr : isZh ? zh : en;
}

/**
 * Computes the single source of truth for assessment confidence, once per
 * report. Every downstream section (Executive Summary, Visa Viability
 * Ranking, Pathway Comparison, Evidence Snapshot) must read from this
 * instead of independently re-deriving whether enough data exists to show
 * a specific number.
 *
 * Note: the intake form does not currently collect partner status, state
 * nomination status, or health/character document status, so those three
 * fields are always reported as absent. They are surfaced for transparency
 * (missingFieldLabels, disclosure copy) but are NOT required for
 * dataCompletenessLevel to reach "sufficient" — the DHA points test treats
 * "no partner" / "not yet nominated" as valid values, not missing data, and
 * PointsEstimate.note already discloses that bonus factors are excluded.
 */
export function buildAssessmentState(
  input: ReadinessInput,
  pathwayComparison: PathwayComparison[],
  estimatedPoints: number | undefined,
  locale: Locale
): AssessmentState {
  const fieldsPresent: AssessmentState["fieldsPresent"] = {
    age: Boolean(input.age),
    englishLevel: Boolean(input.englishLevel),
    englishTestEvidence: (input.englishTestTaken ?? "").trim().toLowerCase() === "yes",
    occupation: Boolean(input.occupation),
    skillsAssessment: (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes",
    workExperienceYears: input.offshoreExperienceYears !== undefined || input.onshoreExperienceYears !== undefined,
    partnerStatus: false,
    stateNomination: false,
    healthCharacterDocs: false,
  };

  const missingFieldLabels = (Object.keys(fieldsPresent) as Array<keyof typeof fieldsPresent>)
    .filter((key) => !fieldsPresent[key])
    .map((key) => fieldLabel(key, locale));

  const hasCoreSignal = fieldsPresent.age && fieldsPresent.englishLevel;
  const hasSubstantiveProfile =
    hasCoreSignal &&
    fieldsPresent.occupation &&
    (fieldsPresent.skillsAssessment || fieldsPresent.workExperienceYears);

  let dataCompletenessLevel: DataCompletenessLevel;
  if (!fieldsPresent.age && !fieldsPresent.englishLevel) {
    dataCompletenessLevel = "minimal";
  } else if (hasSubstantiveProfile) {
    dataCompletenessLevel = "sufficient";
  } else {
    dataCompletenessLevel = "partial";
  }

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const hardGateFlags = pathwayComparison
    .filter((pathway) => pathway.relevance === "ineligible")
    .map((pathway) =>
      isTr
        ? `Alt sınıf ${pathway.subclass}: ${pathway.reason}`
        : isZh
          ? `子类别 ${pathway.subclass}：${pathway.reason}`
          : `Subclass ${pathway.subclass}: ${pathway.reason}`
    );

  const canShowNumericRanking = dataCompletenessLevel === "sufficient" && estimatedPoints !== undefined;

  return {
    fieldsPresent,
    missingFieldLabels,
    dataCompletenessLevel,
    hardGateFlags,
    estimatedPoints,
    canShowNumericRanking,
  };
}
