import { isEnglishAtMaximum } from "@/lib/points/parse-english";
import type { Locale, PointsActionPlan } from "./types";

/**
 * Shared decision for report prose that suggests "how to raise your points":
 * which levers may be named for THIS applicant. Reads the engine's action plan
 * when the report has one (AU, current reports); for reports stored before the
 * plan existed it falls back to the applicant's English tier so English is at
 * least never suggested at Superior.
 */
export type PointsLevers = {
  /** Engine gain of the English upgrade, or null when English cannot add points. */
  englishGain: number | null;
  /** A state/regional nomination action exists (or no plan to say otherwise). */
  nomination: boolean;
  /** Skilled-employment (experience band) actions exist (or no plan to say otherwise). */
  experience: boolean;
};

export function getPointsLevers(plan: PointsActionPlan | undefined, englishLevel: string | undefined | null): PointsLevers {
  if (plan) {
    const english = plan.actions.find((a) => a.id === "english_upgrade");
    return {
      englishGain: english ? english.gain : null,
      nomination: plan.actions.some((a) => a.id === "state_nomination_190" || a.id === "regional_nomination_491"),
      experience: plan.actions.some((a) => a.id === "overseas_employment" || a.id === "australian_employment"),
    };
  }
  // Legacy report (no plan): only the English tier is known.
  return { englishGain: isEnglishAtMaximum(englishLevel) ? null : 20, nomination: true, experience: true };
}

const T = (locale: Locale, en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);

/**
 * "Fastest ways to improve" phrase list from the levers that exist, in the
 * given locale, e.g. "upgrade English to Superior (+20 pts) or obtain state nomination".
 * Returns "" when nothing can raise the score.
 */
export function fastestWaysPhrase(locale: Locale, levers: PointsLevers, nominationLabel?: string): string {
  const parts: string[] = [];
  if (levers.englishGain !== null) {
    parts.push(
      T(
        locale,
        `upgrade English to Superior (+${levers.englishGain} pts)`,
        `dil seviyenizi 'Superior' seviyesine çıkarın (+${levers.englishGain} puan)`,
        `将语言水平提高到“优秀”级别（+${levers.englishGain}分）`
      )
    );
  }
  if (levers.nomination) {
    parts.push(
      T(
        locale,
        `obtain ${nominationLabel ?? "state"} nomination`,
        `${nominationLabel ?? "eyalet adaylığı"} alın`,
        `获得${nominationLabel ?? "州提名"}`
      )
    );
  }
  if (parts.length === 0) return "";
  return parts.join(locale === "zh-Hans" ? "或" : locale === "tr" ? " veya " : " or ");
}

/**
 * "1) ..., 2) ..." list of the levers that exist, with the engine's gains when
 * the report has an action plan. Returns "" when nothing can raise the score.
 */
export function numberedWays(locale: Locale, plan: PointsActionPlan | undefined, englishLevel: string | undefined | null): string {
  const levers = getPointsLevers(plan, englishLevel);
  const gainsOf = (ids: string[]): string => {
    const g = [...new Set((plan?.actions ?? []).filter((a) => ids.includes(a.id)).map((a) => a.gain))].sort((x, y) => x - y);
    return g.length > 0 ? ` (+${g.join("/")} ${locale === "tr" ? "puan" : locale === "zh-Hans" ? "分" : "pts"})` : "";
  };
  const ways: string[] = [];
  if (levers.englishGain !== null) {
    const unit = locale === "tr" ? "puan" : locale === "zh-Hans" ? "分" : "pts";
    ways.push(T(locale, "Improve English", "Dil puanınızı yükseltin", "提高语言分数") + ` (+${levers.englishGain} ${unit})`);
  }
  if (levers.nomination) {
    ways.push(T(locale, "Get state nomination", "Eyalet adaylığı alın", "获得州提名") + gainsOf(["state_nomination_190", "regional_nomination_491"]));
  }
  if (levers.experience) {
    ways.push(T(locale, "Gain more skilled work experience", "Daha fazla nitelikli iş deneyimi edinin", "增加技术工作经验") + gainsOf(["overseas_employment", "australian_employment"]));
  }
  return ways.map((w, i) => `${i + 1}) ${w}`).join(locale === "zh-Hans" ? "，" : ", ");
}
