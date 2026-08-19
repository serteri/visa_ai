import stateNominationData from "@/src/data/state-nomination-status.json";
import { getStateRule } from "@/lib/state-nomination/state-rules-config";
import type {
  AssessmentState,
  Locale,
  PathwayComparison,
  ReadinessInput,
  StateMatchLevel,
  StateNominationState,
  StateNominationStatus,
  StateNominationTracker,
} from "./types";

/** State nomination applies to the 190 (state-nominated) and 491 (regional) subclasses. */
const STATE_NOMINATION_SUBCLASSES = ["190", "491"];

function buildBlockedReason(
  locale: Locale,
  pathwayComparison: PathwayComparison[],
  assessmentState: AssessmentState
): string {
  const blockingPathway = pathwayComparison.find(
    (p) => STATE_NOMINATION_SUBCLASSES.includes(p.subclass) && p.relevance === "ineligible"
  );

  if (blockingPathway) {
    return t(
      locale,
      `State nomination relevance cannot be assessed while the underlying visa pathway is ineligible. See the Visa Viability Ranking section for the full reason.`,
      `Alttaki vize yolu uygun olmadigi surece eyalet adayligi ilgisi degerlendirilemez. Tam neden icin Vize Uygulanabilirlik Siralamasi bolumune bakin.`,
      `在基础签证路径不符合资格的情况下，无法评估州担保相关性。完整原因见"签证可行性排序"部分。`
    );
  }

  return t(
    locale,
    "State nomination relevance cannot be assessed while the underlying visa pathway is unverified. Resolve the missing profile details or occupation verification first.",
    "Alttaki vize yolu dogrulanmadigi surece eyalet adayligi ilgisi degerlendirilemez. Once eksik profil bilgilerini veya meslek dogrulamasini tamamlayin.",
    "在基础签证路径尚未核实的情况下，无法评估州担保相关性。请先补全缺失的资料或完成职业核实。"
  );
}

type StateDatasetRow = {
  code: StateNominationState["code"];
  name: string;
  status: StateNominationStatus;
  offshoreAvailability: "open" | "limited" | "closed";
  onshoreAvailability: "open" | "priority" | "closed";
  minimumPoints: number;
  minimumEnglish: "competent" | "proficient" | "superior";
  minimumExperienceYears: number;
  regionalFocus: boolean;
  preferredVisaTypes: Array<"190" | "491">;
  requiresStateResidence: boolean;
  requiresRecentEmployment: boolean;
  offshoreQuotaPressure: "low" | "medium" | "high" | "closed";
  programWindow: string;
  priorityKeywords: string[];
  specialConditions: string[];
};

const STATE_ROWS = (stateNominationData as { states: StateDatasetRow[] }).states;

const KNOWN_STATE_NOMINATION_STATUSES: readonly StateNominationStatus[] = [
  "Open for Offshore",
  "High Demand",
  "Closed",
  "Onshore Only",
];

/**
 * StateIntelligence.status is a free-form string written by the scraper
 * (app/api/cron/sync-states), not guaranteed to be one of the four literal
 * values the scoring logic and PDF status badges switch on. Only accept it
 * as a display override when it's an exact match; otherwise fall back to
 * the static JSON row rather than pushing an unrecognized status string
 * into strictly-typed rendering.
 */
function asKnownStatus(value: string | undefined): StateNominationStatus | undefined {
  return KNOWN_STATE_NOMINATION_STATUSES.find((known) => known === value);
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function isOffshore(currentCountry?: string): boolean {
  const normalized = normalize(currentCountry);
  if (!normalized) return false;
  return !normalized.includes("australia") && !normalized.includes("australya") && normalized !== "au";
}

function maxExperienceYears(input: ReadinessInput): number {
  return Math.max(input.offshoreExperienceYears ?? 0, input.onshoreExperienceYears ?? 0);
}

function parsePointsEstimate(mainGoal?: string): number | undefined {
  if (!mainGoal) return undefined;
  const match = mainGoal.match(/\b(6[5-9]|[7-9]\d|1\d\d)\b/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function englishBand(level?: string): 0 | 1 | 2 {
  const normalized = normalize(level);
  if (!normalized) return 0;
  if (
    normalized.includes("superior") ||
    normalized.includes("ielts 8") ||
    normalized.includes("pte 79") ||
    normalized.includes("8.0")
  ) {
    return 2;
  }

  if (
    normalized.includes("proficient") ||
    normalized.includes("ielts 7") ||
    normalized.includes("pte 65") ||
    normalized.includes("7.0")
  ) {
    return 1;
  }

  return 0;
}

function requiredEnglishBand(level: StateDatasetRow["minimumEnglish"]): 0 | 1 | 2 {
  if (level === "superior") return 2;
  if (level === "proficient") return 1;
  return 0;
}

function occupationMatches(row: StateDatasetRow, occupation?: string): boolean {
  const normalizedOccupation = normalize(occupation);
  if (!normalizedOccupation) return false;
  return row.priorityKeywords.some((keyword) => normalizedOccupation.includes(keyword));
}

function t(locale: Locale, en: string, tr: string, zh: string): string {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

function buildSummary(args: {
  locale: Locale;
  row: StateDatasetRow;
  matchLevel: StateMatchLevel;
  offshore: boolean;
  occupationIsPriority: boolean;
  experienceGap: boolean;
  regionalGap: boolean;
  pointsGap: boolean;
  englishGap: boolean;
  residenceGap: boolean;
}): string {
  const {
    locale,
    row,
    matchLevel,
    offshore,
    occupationIsPriority,
    experienceGap,
    regionalGap,
    pointsGap,
    englishGap,
    residenceGap,
  } = args;

  if (row.status === "Closed") {
    return t(
      locale,
      `${row.name} is currently treated as closed for nomination, so it is a low-priority state right now.`,
      `${row.name} su anda kapali kabul ediliyor; bu nedenle simdilik dusuk oncelikli bir eyalet.`,
      `${row.name} 当前按关闭处理，因此目前属于低优先级州。`
    );
  }

  if (row.status === "Onshore Only" && offshore) {
    return t(
      locale,
      `${row.name} mainly favours onshore applicants, so your offshore position weakens this option.`,
      `${row.name} esas olarak onshore başvuru sahiplerini tercih ediyor; offshore durumda olduğunuz için bu seçenek zayıflıyor.`,
      `${row.name} 主要偏向境内申请人，因此你的境外状态会削弱这个选项。`
    );
  }

  if (matchLevel === "high") {
    return t(
      locale,
      `${row.name} is one of the stronger nomination fits based on your profile, current location, and occupation signal.`,
      `${row.name}, profiliniz, bulunduğunuz yer ve meslek sinyalinize göre daha güçlü aday eyaletlerden biri.`,
      `${row.name} 根据你的资料、所在地和职业信号，属于更强的提名匹配州之一。`
    );
  }

  if (experienceGap || regionalGap || pointsGap || englishGap || residenceGap) {
    return t(
      locale,
      `${row.name} remains possible, but it looks conditional on profile gaps such as points, English, state ties, or work experience.`,
      `${row.name} halen mümkün görünüyor, ancak puan, İngilizce, eyalet bağlantısı veya deneyim gibi profil boşluklarına bağlı.`,
      `${row.name} 仍有可能，但更依赖分数、英语、州联系或工作经验等条件缺口。`
    );
  }

  return t(
    locale,
    occupationIsPriority
      ? `${row.name} has a usable nomination pathway, but it still looks competitive and condition-based.`
      : `${row.name} is not closed, but your occupation signal looks weaker there right now.`,
    occupationIsPriority
      ? `${row.name} tarafında kullanılabilir bir nomination yolu var, ancak rekabetçi ve koşullu görünüyor.`
      : `${row.name} kapalı değil, ancak meslek sinyaliniz bu eyalette şu an daha zayıf görünüyor.`,
    occupationIsPriority
      ? `${row.name} 存在可用提名路径，但整体仍偏竞争性且附带条件。`
      : `${row.name} 并未关闭，但你的职业信号在该州目前偏弱。`
  );
}

function buildRequirements(args: {
  locale: Locale;
  row: StateDatasetRow;
  offshore: boolean;
  occupationIsPriority: boolean;
  experienceYears: number;
  regionalWilling: boolean;
  pointsEstimate?: number;
  englishScore: 0 | 1 | 2;
  residenceGap: boolean;
}): string[] {
  const {
    locale,
    row,
    offshore,
    occupationIsPriority,
    experienceYears,
    regionalWilling,
    pointsEstimate,
    englishScore,
    residenceGap,
  } = args;
  const requirements: string[] = [];

  if (row.status === "Onshore Only") {
    requirements.push(
      t(locale, "Usually requires an onshore profile.", "Genellikle onshore profil ister.", "通常要求境内身份。")
    );
  }

  if (row.minimumExperienceYears > experienceYears) {
    requirements.push(
      t(
        locale,
        `Target at least ${row.minimumExperienceYears} years of relevant experience.`,
        `En az ${row.minimumExperienceYears} yıl ilgili deneyim hedefleyin.`,
        `建议至少具备 ${row.minimumExperienceYears} 年相关经验。`
      )
    );
  }

  if ((pointsEstimate ?? 0) > 0 && (pointsEstimate ?? 0) < row.minimumPoints) {
    requirements.push(
      t(
        locale,
        `Profile looks safer from about ${row.minimumPoints}+ points in this state.`,
        `Bu eyalette profil genellikle ${row.minimumPoints}+ puan civarında daha güvenli görünür.`,
        `在该州通常约 ${row.minimumPoints}+ 分会更稳。`
      )
    );
  }

  if (englishScore < requiredEnglishBand(row.minimumEnglish)) {
    requirements.push(
      t(
        locale,
        `English signal should ideally reach ${row.minimumEnglish} level.`,
        `İngilizce sinyalinin ideal olarak ${row.minimumEnglish} seviyesine ulaşması gerekir.`,
        `英语信号最好达到 ${row.minimumEnglish} 水平。`
      )
    );
  }

  if (row.regionalFocus && !regionalWilling) {
    requirements.push(
      t(
        locale,
        "Regional commitment would materially improve this state pathway.",
        "Regional taahhüt bu eyalet yolunu belirgin şekilde güçlendirir.",
        "愿意去偏远地区会显著增强该州路径。"
      )
    );
  }

  if (!occupationIsPriority) {
    requirements.push(
      t(
        locale,
        "Your occupation is not a clear priority keyword match in this state.",
        "Mesleğiniz bu eyalette açık bir öncelik eşleşmesi vermiyor.",
        "你的职业在该州中不属于明显优先关键词匹配。"
      )
    );
  }

  if (offshore && row.offshoreAvailability === "limited") {
    requirements.push(
      t(
        locale,
        "Offshore intake appears more selective than standard nomination streams.",
        "Offshore alım standart nomination akışlarına göre daha seçici görünüyor.",
        "境外配额看起来比常规提名渠道更严格。"
      )
    );
  }

  if (residenceGap) {
    requirements.push(
      t(
        locale,
        "Local residence or strong in-state ties would materially improve the nomination case.",
        "Yerel ikamet veya güçlü eyalet bağları nomination ihtimalini belirgin şekilde artırır.",
        "本地居住或较强州联系会明显增强提名机会。"
      )
    );
  }

  row.specialConditions.forEach((condition) => {
    requirements.push(
      t(locale, condition, condition, condition)
    );
  });

  return requirements.slice(0, 3);
}

/** Fields the per-state score formula actually reads (englishBand,
 *  maxExperienceYears) -- not the full AssessmentState.missingFieldLabels
 *  list, which also includes fields (partner status, health/character docs)
 *  that are irrelevant to state-nomination scoring and always show as
 *  "missing" since the intake form never collects them. */
function buildPartialDataWarning(
  locale: Locale,
  assessmentState: AssessmentState
): StateNominationTracker["partialDataWarning"] {
  const missing: string[] = [];
  if (!assessmentState.fieldsPresent.englishLevel) {
    missing.push(t(locale, "English level not provided", "İngilizce seviyesi girilmedi", "未提供英语水平"));
  }
  // Deliberately NOT flagged as missing/incomplete data: a user who left
  // work experience unanswered is making a valid claim of zero years, not
  // leaving the form incomplete -- this used to render as a red "Missing:
  // Work experience not provided" warning here, which incorrectly framed a
  // fresh graduate / no-experience profile as a data error rather than a
  // neutral fact. The score formula already treats unanswered years as 0
  // (maxExperienceYears), so there is nothing actually incomplete to warn
  // about on this axis.

  if (missing.length === 0) return undefined;

  return {
    message: t(
      locale,
      "This estimate was calculated with incomplete information — the actual result may change once missing details are provided.",
      "Bu tahmin eksik bilgiyle hesaplandı — eksik detaylar girildiğinde gerçek sonuç değişebilir.",
      "此估算基于不完整的信息计算得出——补充缺失信息后，实际结果可能会有所变化。"
    ),
    missingFieldLabels: missing,
  };
}

export function calculateStateNominationTracker(
  input: ReadinessInput,
  pathwayComparison: PathwayComparison[],
  assessmentState: AssessmentState
): StateNominationTracker {
  // State nomination is only ever relevant when this assessment actually
  // evaluated the 190/491 pathways -- partner-visa (820/801) and other
  // non-skilled-migration reports never put "190"/"491" into
  // pathwayComparison at all (see buildPartnerReadinessReport in engine.ts),
  // so this section must stay blocked for those regardless of data
  // completeness. Only when 190/491 WERE evaluated do we then check for a
  // REAL hard-ineligibility (age cap, visa-type incompatibility, etc. --
  // anything that isn't purely "below the points threshold"). Points-only
  // ineligibility and incomplete profile data (missing English level / work
  // experience) no longer block it -- see buildPartialDataWarning for how
  // the latter is surfaced instead.
  const hasStateNominationRelevantPathway = pathwayComparison.some((p) =>
    STATE_NOMINATION_SUBCLASSES.includes(p.subclass)
  );
  const hardIneligible = pathwayComparison.some(
    (p) => STATE_NOMINATION_SUBCLASSES.includes(p.subclass) && p.relevance === "ineligible" && p.ineligiblePointsLine === undefined
  );
  const eligibilityBlocked = !hasStateNominationRelevantPathway || hardIneligible;

  if (eligibilityBlocked) {
    return {
      states: [],
      topRecommendedStates: [],
      eligibilityBlocked: true,
      blockedReason: buildBlockedReason(input.locale, pathwayComparison, assessmentState),
      note: t(
        input.locale,
        "State nomination settings change frequently. Treat this as a directional eligibility heatmap, not a formal invitation guarantee.",
        "Eyalet adayligi kosullari sik degisir. Bunu resmi davet garantisi degil, yonlendirici bir uygunluk isi haritasi olarak degerlendirin.",
        "州担保设置经常变化。请将其视为方向性资格热力图，而不是正式邀请保证。"
      ),
    };
  }

  const offshore = isOffshore(input.currentCountry);
  const experienceYears = maxExperienceYears(input);
  const regionalWilling = Boolean(input.regionalWilling);
  const pointsEstimate = parsePointsEstimate(input.mainGoal);
  const englishScore = englishBand(input.englishLevel);

  const states = STATE_ROWS.map((row): StateNominationState => {
    const occupationIsPriority = occupationMatches(row, input.occupation);
    const experienceGap = row.minimumExperienceYears > experienceYears;
    const regionalGap = row.regionalFocus && !regionalWilling;
    const pointsGap = typeof pointsEstimate === "number" ? pointsEstimate < row.minimumPoints : false;
    const englishGap = englishScore < requiredEnglishBand(row.minimumEnglish);
    const residenceGap = row.requiresStateResidence && offshore;

    // Status precedence (highest to lowest):
    //   1. StateNominationConfig (admin panel, app/[locale]/(main)/admin/
    //      states) -- the top "source of truth"; an admin toggling a state
    //      to Closed must be reflected immediately, with no deploy.
    //   2. state-rules-config.ts -- hand-verified from the primary source
    //      document, but static (requires a code change to update).
    //   3. src/data/state-nomination-status.json -- generic heuristic
    //      estimate, the fallback when nothing more authoritative exists.
    // Applied to BOTH the score formula below and the displayed status
    // further down, so a state marked closed always scores and renders as
    // closed, never just shows a "Closed" badge over an unchanged score.
    const adminConfig = input.stateNominationConfig?.[row.code];
    const rule = getStateRule(row.code);
    const effectiveStatus: StateNominationStatus =
      asKnownStatus(adminConfig?.status) ?? rule?.status ?? row.status;

    let score = 55;

    if (effectiveStatus === "Closed") {
      // Admin-confirmed closures and rule-config closures with a "closed"
      // quota pressure both score at the harder floor; a JSON-only closed
      // estimate (no admin/rule confirmation) scores slightly higher since
      // it's a generic guess, not a confirmed program state.
      score = adminConfig?.status === "Closed" || rule?.offshoreQuotaPressure === "closed" ? 6 : 12;
    } else if (effectiveStatus === "Onshore Only") {
      score = offshore ? 18 : 74;
    } else if (effectiveStatus === "Open for Offshore") {
      score = offshore ? 82 : 72;
    } else if (effectiveStatus === "High Demand") {
      score = occupationIsPriority ? 76 : 64;
    }

    if (row.offshoreAvailability === "limited" && offshore) score -= 12;
    if (row.offshoreQuotaPressure === "high") score -= 6;
    if (row.offshoreQuotaPressure === "closed") score -= 18;
    if (occupationIsPriority) score += 8;
    else score -= 8;
    if (experienceGap) score -= 16;
    if (regionalGap) score -= 14;
    if (pointsGap) score -= 14;
    if (englishGap) score -= 10;
    if (residenceGap) score -= 14;
    if (row.requiresRecentEmployment && offshore) score -= 8;
    if (row.preferredVisaTypes.includes("491") && regionalWilling) score += 6;

    score = Math.max(0, Math.min(95, score));

    // Live DB override (see lib/state-intelligence.ts) for this state, if
    // the caller fetched one. Only the *displayed* status/citation fields
    // are overridden here -- the scoring math above already folded in
    // adminConfig/rule via effectiveStatus, so an in-progress or malformed
    // scrape can't silently corrupt the match-score algorithm. adminConfig
    // still wins over a scrape (asKnownStatus(adminConfig?.status) is
    // checked first), matching its top-priority position in effectiveStatus.
    const intel = input.stateIntelligence?.[row.code];
    const displayStatus = asKnownStatus(adminConfig?.status) ?? asKnownStatus(intel?.status) ?? effectiveStatus;

    // ── Real-data hard rules (StateOccupationListEntry + points + onshore
    // status), applied AFTER the heuristic score above and able to override
    // it. Priority: rule 3 (onshore hard block) > rule 1 (not on list) >
    // rule 2 (on list but under points threshold) -- checked in that order
    // so a stricter rule's note isn't clobbered by a weaker one.
    let ruleOverrideNote: string | undefined;

    const occupationMatch = input.stateOccupationMatches?.[row.code];
    // Rule 1: occupation-list data exists for this state AND we positively
    // confirmed the occupation is NOT on it. A missing occupationMatch
    // entry means "no list data for this state" (see getStateOccupationMatches's
    // doc comment) and must NOT trigger this -- that would falsely zero out
    // states we simply haven't synced list data for yet.
    if (occupationMatch && !occupationMatch.onList) {
      score = 2;
      ruleOverrideNote = t(
        input.locale,
        "Your occupation is currently not on this state's skilled list.",
        "Mesleginiz su anda bu eyaletin nitelikli meslek listesinde degil.",
        "您的职业目前不在该州的技术职业清单上。"
      );
    } else if (occupationMatch?.onList && typeof assessmentState.estimatedPoints === "number" && assessmentState.estimatedPoints < row.minimumPoints) {
      // Rule 2: confirmed on the list, but real computed points are below
      // this state's threshold -- heavy penalty, not a full zero (the
      // occupation itself IS eligible, points can still improve).
      score = Math.min(score, 15);
      ruleOverrideNote = t(
        input.locale,
        "Occupation is on the list, but points are below the competitive threshold.",
        "Meslek listede yer aliyor, ancak puan rekabetci esigin altinda.",
        "该职业在清单上，但分数低于具有竞争力的门槛。"
      );
    }

    // Rule 3: onshore-only state and the applicant isn't currently in
    // Australia -- hard block, takes priority over rules 1/2's note.
    if (displayStatus === "Onshore Only" && offshore) {
      score = 0;
      ruleOverrideNote = t(
        input.locale,
        "Requires an onshore profile.",
        "Avustralya icinde bulunma sarti gerektirir.",
        "需要在境内（澳大利亚）申请资料。"
      );
    }

    const matchLevel: StateMatchLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

    // buildSummary/buildRequirements read row.status for their copy -- pass
    // the effective (rule-overridden) status through so the PDF's prose
    // matches the score/badge above instead of the raw JSON estimate.
    const effectiveRow: StateDatasetRow = { ...row, status: effectiveStatus };

    const requirements = buildRequirements({
      locale: input.locale,
      row: effectiveRow,
      offshore,
      occupationIsPriority,
      experienceYears,
      regionalWilling,
      pointsEstimate,
      englishScore,
      residenceGap,
    });

    return {
      code: row.code,
      name: row.name,
      status: displayStatus,
      matchLevel,
      score,
      summary: buildSummary({
        locale: input.locale,
        row: effectiveRow,
        matchLevel,
        offshore,
        occupationIsPriority,
        experienceGap,
        regionalGap,
        pointsGap,
        englishGap,
        residenceGap,
      }),
      // Notes go first so they're always within the PDF/UI's "first 2
      // requirements" note preview (see drawStateNominationTable in
      // lib/readiness/generate-pdf.ts). Order: admin-set customAiNote (top
      // priority, see StateNominationConfig), then the hand-verified
      // state-rules-config note, then the occupation-list/onshore rule
      // override.
      requirements: [adminConfig?.customAiNote, rule?.note, ruleOverrideNote, ...requirements].filter(
        (item): item is string => Boolean(item)
      ),
      officialNote: intel?.officialNote,
      sourceUrl: intel?.sourceUrl,
      lastVerifiedAt: intel?.lastVerifiedAt,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    states,
    topRecommendedStates: states.filter((item) => item.matchLevel !== "low").slice(0, 2),
    eligibilityBlocked: false,
    note: t(
      input.locale,
      "State nomination settings change frequently. Treat this as a directional eligibility heatmap, not a formal invitation guarantee.",
      "Eyalet adayligi kosullari sik degisir. Bunu resmi davet garantisi degil, yonlendirici bir uygunluk isi haritasi olarak degerlendirin.",
      "州担保设置经常变化。请将其视为方向性资格热力图，而不是正式邀请保证。"
    ),
    partialDataWarning: buildPartialDataWarning(input.locale, assessmentState),
  };
}
