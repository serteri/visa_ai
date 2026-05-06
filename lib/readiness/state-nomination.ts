import stateNominationData from "@/src/data/state-nomination-status.json";
import type {
  Locale,
  ReadinessInput,
  StateMatchLevel,
  StateNominationState,
  StateNominationStatus,
  StateNominationTracker,
} from "./types";

type StateDatasetRow = {
  code: StateNominationState["code"];
  name: string;
  status: StateNominationStatus;
  offshoreAvailability: "open" | "limited" | "closed";
  onshoreAvailability: "open" | "priority" | "closed";
  minimumExperienceYears: number;
  regionalFocus: boolean;
  priorityKeywords: string[];
  specialConditions: string[];
};

const STATE_ROWS = (stateNominationData as { states: StateDatasetRow[] }).states;

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
}): string {
  const { locale, row, matchLevel, offshore, occupationIsPriority, experienceGap, regionalGap } = args;

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
      `${row.name} esas olarak onshore basvuru sahiplerini tercih ediyor; offshore durumda oldugunuz icin bu secenek zayifliyor.`,
      `${row.name} 主要偏向境内申请人，因此你的境外状态会削弱这个选项。`
    );
  }

  if (matchLevel === "high") {
    return t(
      locale,
      `${row.name} is one of the stronger nomination fits based on your profile, current location, and occupation signal.`,
      `${row.name}, profiliniz, bulundugunuz yer ve meslek sinyalinize gore daha guclu aday eyaletlerden biri.`,
      `${row.name} 根据你的资料、所在地和职业信号，属于更强的提名匹配州之一。`
    );
  }

  if (experienceGap || regionalGap) {
    return t(
      locale,
      `${row.name} remains possible, but it looks conditional on extra work experience or regional flexibility.`,
      `${row.name} halen mumkun gorunuyor, ancak ek is tecrubesi veya regional esneklik gerektirebilir.`,
      `${row.name} 仍有可能，但更依赖额外工作经验或偏远地区灵活性。`
    );
  }

  return t(
    locale,
    occupationIsPriority
      ? `${row.name} has a usable nomination pathway, but it still looks competitive and condition-based.`
      : `${row.name} is not closed, but your occupation signal looks weaker there right now.`,
    occupationIsPriority
      ? `${row.name} tarafinda kullanilabilir bir nomination yolu var, ancak rekabetci ve kosullu gorunuyor.`
      : `${row.name} kapali degil, ancak meslek sinyaliniz bu eyalette su an daha zayif gorunuyor.`,
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
}): string[] {
  const { locale, row, offshore, occupationIsPriority, experienceYears, regionalWilling } = args;
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
        `En az ${row.minimumExperienceYears} yil ilgili deneyim hedefleyin.`,
        `建议至少具备 ${row.minimumExperienceYears} 年相关经验。`
      )
    );
  }

  if (row.regionalFocus && !regionalWilling) {
    requirements.push(
      t(
        locale,
        "Regional commitment would materially improve this state pathway.",
        "Regional taahhut bu eyalet yolunu belirgin sekilde guclendirir.",
        "愿意去偏远地区会显著增强该州路径。"
      )
    );
  }

  if (!occupationIsPriority) {
    requirements.push(
      t(
        locale,
        "Your occupation is not a clear priority keyword match in this state.",
        "Mesleginiz bu eyalette acik bir oncelik eslesmesi vermiyor.",
        "你的职业在该州中不属于明显优先关键词匹配。"
      )
    );
  }

  if (offshore && row.offshoreAvailability === "limited") {
    requirements.push(
      t(
        locale,
        "Offshore intake appears more selective than standard nomination streams.",
        "Offshore alim standart nomination akislarina gore daha secici gorunuyor.",
        "境外配额看起来比常规提名渠道更严格。"
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

export function calculateStateNominationTracker(input: ReadinessInput): StateNominationTracker {
  const offshore = isOffshore(input.currentCountry);
  const experienceYears = maxExperienceYears(input);
  const regionalWilling = Boolean(input.regionalWilling);

  const states = STATE_ROWS.map((row): StateNominationState => {
    const occupationIsPriority = occupationMatches(row, input.occupation);
    const experienceGap = row.minimumExperienceYears > experienceYears;
    const regionalGap = row.regionalFocus && !regionalWilling;

    let score = 55;

    if (row.status === "Closed") {
      score = 12;
    } else if (row.status === "Onshore Only") {
      score = offshore ? 18 : 74;
    } else if (row.status === "Open for Offshore") {
      score = offshore ? 82 : 72;
    } else if (row.status === "High Demand") {
      score = occupationIsPriority ? 76 : 64;
    }

    if (row.offshoreAvailability === "limited" && offshore) score -= 12;
    if (occupationIsPriority) score += 8;
    else score -= 8;
    if (experienceGap) score -= 16;
    if (regionalGap) score -= 14;

    score = Math.max(0, Math.min(95, score));

    const matchLevel: StateMatchLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

    return {
      code: row.code,
      name: row.name,
      status: row.status,
      matchLevel,
      score,
      summary: buildSummary({
        locale: input.locale,
        row,
        matchLevel,
        offshore,
        occupationIsPriority,
        experienceGap,
        regionalGap,
      }),
      requirements: buildRequirements({
        locale: input.locale,
        row,
        offshore,
        occupationIsPriority,
        experienceYears,
        regionalWilling,
      }),
    };
  }).sort((a, b) => b.score - a.score);

  return {
    states,
    topRecommendedStates: states.filter((item) => item.matchLevel !== "low").slice(0, 2),
    note: t(
      input.locale,
      "State nomination settings change frequently. Treat this as a directional eligibility heatmap, not a formal invitation guarantee.",
      "Eyalet nomination kosullari sik degisir. Bunu resmi davet garantisi degil, yonlendirici bir uygunluk isi haritasi olarak degerlendirin.",
      "州担保设置经常变化。请将其视为方向性资格热力图，而不是正式邀请保证。"
    ),
  };
}