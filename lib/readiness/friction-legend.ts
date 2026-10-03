import { frictionBandDefinition, frictionBandLabel } from "@/src/lib/readiness/localization";

import { frictionCauseText, type FrictionLevel } from "./pathway-scores";
import type { Locale, ReadinessReport } from "./types";

/**
 * The friction legend lines shown under the pathway table / comparison: for each points-tested pathway (189 / 190 / 491)
 * the ACTUAL cause of its level -- the points gap, or, when the level comes from the nomination-availability floor, that
 * ("MEDIUM: points meet the recent benchmark; only one state is currently open to you"). A pathway whose score meets the
 * benchmark never gets the "1-15 points below" band text. Other pathways keep one generic line per level present.
 */
export function frictionLegendLines(
  entries: Array<{ subclass: string; visa: string; level: FrictionLevel }>,
  report: Pick<ReadinessReport, "pathwayScores" | "stateNominationTracker">,
  locale: Locale,
): string[] {
  const sep = locale === "zh-Hans" ? "：" : ": ";
  const word = locale === "tr" ? "Zorluk seviyesi" : locale === "zh-Hans" ? "竞争激烈度" : "Friction level";
  const label = (level: FrictionLevel) => {
    const raw = frictionBandLabel(locale, level);
    return locale === "zh-Hans" ? raw.replace("竞争", "") : raw;
  };
  const avail = report.stateNominationTracker?.eligibilityBlocked ? undefined : report.stateNominationTracker?.nominationAvailability;
  const order: Record<FrictionLevel, number> = { NOT_ASSESSED: -1, LOW: 0, MEDIUM: 1, HIGH: 2, EXTREME: 3 };

  const lines: string[] = [];
  const generic = new Set<FrictionLevel>();
  for (const e of entries) {
    const pointsTested = e.subclass === "189" || e.subclass === "190" || e.subclass === "491";
    if (!pointsTested || e.level === "NOT_ASSESSED") {
      generic.add(e.level);
      continue;
    }
    const score = report.pathwayScores?.[e.subclass as "189" | "190" | "491"];
    const open = e.subclass === "189" ? undefined : avail?.[e.subclass as "190" | "491"];
    const cause = frictionCauseText(score, e.level, open, locale) ?? frictionBandDefinition(locale, e.level);
    lines.push(`${e.visa} – ${word}${sep}${label(e.level)}${sep}${cause}`);
  }
  for (const level of [...generic].sort((a, b) => order[a] - order[b])) {
    lines.push(`${word}${sep}${label(level)}${sep}${frictionBandDefinition(locale, level)}`);
  }
  return lines;
}
