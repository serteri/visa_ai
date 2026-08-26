import { findOccupationRecord, getEligibleSkilledSubclasses, isAmbiguousOccupationAlias } from "./occupation-eligibility";
import { getEmploymentDataSignals } from "./employment-signals";
import { hasRealEnglishEvidence } from "./english-evidence";
import type {
  AssessmentState,
  DataCompletenessLevel,
  Locale,
  OccupationEligibility,
  PathwayComparison,
  ReadinessInput,
} from "./types";

/**
 * Backed by the 691-entry ANZSCO dataset (src/data/occupations.json), not
 * the small 19-entry SKILLED_OCCUPATIONS seed used for general-info Q&A —
 * that seed is too sparse to gate a paid report's numeric ranking on
 * (common occupations like "Software Engineer" have no entry in it).
 */
function buildOccupationEligibility(
  occupation: string | undefined,
  locale: Locale
): { occupationEligibility: OccupationEligibility; occupationEligibilityReason: string } {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const record = findOccupationRecord(occupation);

  if (!record) {
    if (isAmbiguousOccupationAlias(occupation)) {
      return {
        occupationEligibility: "unverified",
        occupationEligibilityReason: isTr
          ? "Girilen meslek ifadesi birden fazla ANZSCO kaydına karşılık geliyor (ör. Pratisyen Hekim, Uzman Hekim). Lütfen daha spesifik bir meslek seçin veya açılır listeden doğru kaydı seçin."
          : isZh
            ? "输入的职业称谓可能对应多个 ANZSCO 条目（例如全科医生、专科医生）。请提供更具体的职业名称，或从下拉列表选择正确条目。"
            : "The entered occupation term maps to multiple ANZSCO records (e.g., General Practitioner, Specialist Physician). Please provide a more specific occupation or select the correct entry from the dropdown.",
      };
    }

    return {
      occupationEligibility: "unverified",
      occupationEligibilityReason: isTr
        ? "Bu meslek, meslek veritabanımızda doğrulanamadı. Bu, mesleğin uygun olmadığı anlamına gelmez — lütfen resmi ANZSCO/nitelikli meslek listesini kontrol edin veya kayıtlı bir göç danışmanına danışın."
        : isZh
          ? "我们无法在职业数据库中核实该职业。这并不代表该职业不符合资格——请通过官方 ANZSCO/技术职业清单确认，或咨询注册移民代理。"
          : "We could not verify this occupation against our occupation database. This does not necessarily mean it's ineligible — please confirm using the official ANZSCO/skilled occupation list or consult a registered migration agent.",
    };
  }

  const eligibleSubclasses = getEligibleSkilledSubclasses(occupation);

  if (eligibleSubclasses.length > 0) {
    return { occupationEligibility: "eligible", occupationEligibilityReason: "" };
  }

  return {
    occupationEligibility: "ineligible",
    occupationEligibilityReason: isTr
      ? `"${record.occupation_name}" (ANZSCO ${record.anzsco_code}) mesleği, 189/190/491 için ilgili nitelikli meslek listesinde (MLTSSL/STSOL/ROL) görünmüyor.`
      : isZh
        ? `"${record.occupation_name}"（ANZSCO ${record.anzsco_code}）似乎不在 189/190/491 相关的技术职业清单（MLTSSL/STSOL/ROL）上。`
        : `"${record.occupation_name}" (ANZSCO ${record.anzsco_code}) does not appear to be on the relevant skilled occupation list (MLTSSL/STSOL/ROL) for 189/190/491.`,
  };
}

function fieldLabel(key: keyof AssessmentState["fieldsPresent"], locale: Locale): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const labels: Record<keyof AssessmentState["fieldsPresent"], [string, string, string]> = {
    age: ["Age", "Yaş", "年龄"],
    englishLevel: ["English level", "İngilizce seviyesi", "英语水平"],
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
  const employmentSignals = getEmploymentDataSignals(input);
  const fieldsPresent: AssessmentState["fieldsPresent"] = {
    age: Boolean(input.age),
    englishLevel: hasRealEnglishEvidence(input),
    occupation: Boolean(input.occupation),
    skillsAssessment: (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes",
    workExperienceYears: employmentSignals.workExperienceYearsConfirmed,
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

  // This gate is scoped to AU's ANZSCO-based GSM subclasses (189/190/491).
  // Canada's occupation matching uses NOC codes against CEC/FSW/FSTP, which
  // this check has no basis to evaluate, so CA is exempt (vacuously eligible)
  // rather than being incorrectly blocked by an AU-specific subclass list.
  const { occupationEligibility, occupationEligibilityReason } =
    input.country === "CA"
      ? { occupationEligibility: "eligible" as const, occupationEligibilityReason: "" }
      : buildOccupationEligibility(input.occupation, locale);

  const canShowNumericRanking =
    dataCompletenessLevel === "sufficient" &&
    estimatedPoints !== undefined &&
    occupationEligibility === "eligible";

  return {
    employmentDataProvided: employmentSignals.employmentDataProvided,
    employmentDataConfirmed: employmentSignals.workExperienceYearsConfirmed,
    fieldsPresent,
    missingFieldLabels,
    dataCompletenessLevel,
    hardGateFlags,
    estimatedPoints,
    occupationEligibility,
    occupationEligibilityReason,
    canShowNumericRanking,
  };
}
