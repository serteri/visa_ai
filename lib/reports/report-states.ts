/**
 * State and territory programs: all eight, in a fixed order (by code), with the published status, the occupation-list result for the
 * occupation the applicant entered (190 / 491), every published condition and the source and date checked. Nothing is filtered,
 * ranked or marked "available to you".
 */
import { matchOccupationToState } from "@/lib/state-nomination/occupation-match";
import { localizeStateFact } from "@/lib/state-nomination/state-keyfact-translations";
import { getStateRule } from "@/lib/state-nomination/state-rules-config";
import type { StateMonitorSnapshot } from "@/lib/state-monitor/status";
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import { T } from "./report-text";

/** Without a successful monitor check (or hand verification) for more than this many days, a state's data is flagged "may have changed since". */
export const STATE_MONITOR_MAX_DAYS = 14;

const STOPWORDS = new Set(["the", "and", "for", "are", "was", "has", "have", "been", "its", "with", "that", "this", "from", "will", "may", "any"]);

const tokens = (text: string) =>
  new Set(
    (text.toLowerCase().match(/[a-z]{3,}|\d+(?:[-.]\d+)*/g) ?? []).filter((w) => !STOPWORDS.has(w)).map((w) => (/^\d/.test(w) ? w : w.slice(0, 5))),
  );

/** True when `sentence` says (nearly) nothing the `summary` does not already say: most of its words and every number are in the summary. */
export function repeatsSummary(sentence: string, summary: string): boolean {
  const s = tokens(sentence);
  if (s.size === 0) return false;
  const base = tokens(summary);
  let shared = 0;
  for (const t of s) if (base.has(t)) shared++;
  const numbers = [...s].filter((t) => /^\d/.test(t));
  // A sentence that negates ("no", "not") must be negated in the summary too, else it says something different.
  const negations = (t: string) => /\b(no|not|never|without|none)\b/i.test(t);
  if (negations(sentence) && !negations(summary)) return false;
  return shared / s.size >= 0.7 && numbers.every((n) => base.has(n));
}

const dayOf = (iso: string) => iso.slice(0, 10);
const daysBetween = (fromDay: string, now: Date) => (now.getTime() - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000;

/**
 * Whether (and why) a state's data carries the "data may have changed since" note. Driven by the page monitor (lib/state-monitor), not by the age of the
 * data alone: the note shows when (1) the monitor saw a change on the state's page that has not been applied yet (it is newer than the date the data was
 * last verified, and not marked applied), or (2) there has been no successful check for more than 14 days -- the monitor's last success or the date the
 * state's data was verified by hand, whichever is later.
 */
export function stateDataFlag(args: { verified: string; monitor?: { pendingChangeAt: string | null; lastSuccessAt: string | null } | null; now: Date }): { reason: "change" | "monitor"; since: string; detail: string } | null {
  const { verified, monitor, now } = args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verified)) return null;
  if (monitor?.pendingChangeAt && dayOf(monitor.pendingChangeAt) > verified) return { reason: "change", since: verified, detail: dayOf(monitor.pendingChangeAt) };
  const lastOk = [verified, monitor?.lastSuccessAt ? dayOf(monitor.lastSuccessAt) : ""].sort().at(-1)!;
  if (daysBetween(lastOk, now) > STATE_MONITOR_MAX_DAYS) return { reason: "monitor", since: lastOk, detail: lastOk };
  return null;
}

export type StateInfo = {
  code: string;
  name: string;
  status: string;
  occupationList: string;
  conditions: string[];
  sources: string;
  checked: string;
  /** Set by the page monitor (an unapplied change, or no successful check for 14 days): "data may have changed since". */
  staleNote: string;
};

const STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;

const docTitle = (doc: string) => {
  const t = doc.split("/").pop() ?? doc;
  return t.replace(/\.(pdf|png)$/i, "");
};

export function buildStateInfos(report: ReadinessReport, occupationRaw: string | undefined, l: Locale, now: Date = new Date(), stateMonitor?: StateMonitorSnapshot | null): StateInfo[] {
  const tracker = report.stateNominationTracker;
  const anzsco = (occupationRaw ?? "").match(/\d{6}/)?.[0];
  return STATE_CODES.map((code): StateInfo => {
    const rule = getStateRule(code);
    const s = tracker?.states.find((x) => x.code === code);
    // NSW publishes at unit-group level only: the occupation's 4-digit unit group against that list.
    const nsw = code === "NSW" && anzsco ? (["190", "491"] as const).map((sub) => matchOccupationToState(anzsco, "NSW", sub)) : [];
    const nswListed = nsw.flatMap((m) => (m.type === "UNIT_GROUP_ONLY" && m.onUnitGroupList ? [m.subclass] : []));
    const occupationList =
      code === "NSW" && nsw.length > 0
        ? nswListed.length > 0
          ? T(l, `On the unit-group list: ${nswListed.join(", ")}`, `Birim grubu listesinde: ${nswListed.join(", ")}`, `在单元组清单上：${nswListed.join("、")}`)
          : T(l, "Not on the published unit-group list", "Yayımlanmış birim grubu listesinde yok", "不在已公布的单元组清单上")
        : s?.occupationListStatus === "confirmed"
          ? T(l, `On the list: ${(s.listedFor ?? []).join(", ") || "—"}`, `Listede: ${(s.listedFor ?? []).join(", ") || "—"}`, `在清单上：${(s.listedFor ?? []).join("、") || "—"}`)
          : s?.occupationListStatus === "not_listed"
            ? T(l, "Not on the published list", "Yayımlanmış listede yok", "不在已公布的清单上")
            : T(l, "Not confirmed (no occupation-level list in our data)", "Teyit edilmedi (verilerimizde meslek düzeyinde liste yok)", "未确认（我们的数据中没有职业级别清单）");
    // The first condition is the state's summary; a later sentence that only repeats it is left out.
    const rawConditions = [rule?.note, ...(rule?.keyFacts ?? []), ...(s?.streamNotes ?? [])].filter((x): x is string => !!x);
    const summary = rawConditions[0] ?? "";
    const conditions = rawConditions.filter((x, i) => i === 0 || !repeatsSummary(x, summary)).map((x) => localizeStateFact(l, x));
    const checked = (s?.lastVerifiedAt ?? rule?.lastVerified ?? "").slice(0, 10);
    return {
      code,
      name: rule?.name ?? s?.name ?? code,
      status: s?.status ?? rule?.status ?? "—",
      occupationList,
      conditions: [...new Set(conditions)],
      sources: (rule?.sourceDocument ?? "").split(";").map((d) => docTitle(d.trim())).filter(Boolean).join("; ") || "—",
      checked,
      staleNote: staleNoteText(stateDataFlag({ verified: checked, monitor: stateMonitor?.[code] ?? null, now }), l),
    };
  });
}

function staleNoteText(flag: ReturnType<typeof stateDataFlag>, l: Locale): string {
  if (!flag) return "";
  if (flag.reason === "change") {
    return T(l, `Data may have changed since ${flag.since}: a change to this state's official page was detected on ${flag.detail} and has not been applied to this report's data yet.`, `Veriler ${flag.since} tarihinden sonra değişmiş olabilir: bu eyaletin resmi sayfasında ${flag.detail} tarihinde bir değişiklik algılandı ve henüz bu raporun verilerine uygulanmadı.`, `自 ${flag.since} 起数据可能已变化：已于 ${flag.detail} 检测到该州官方页面发生变化，尚未应用到本报告的数据中。`);
  }
  return T(l, `Data may have changed since ${flag.since}: the page monitor has not completed a successful check of this state's pages in the last ${STATE_MONITOR_MAX_DAYS} days.`, `Veriler ${flag.since} tarihinden sonra değişmiş olabilir: sayfa izleyicisi bu eyaletin sayfalarını son ${STATE_MONITOR_MAX_DAYS} günde başarıyla kontrol edemedi.`, `自 ${flag.since} 起数据可能已变化：页面监测程序在过去 ${STATE_MONITOR_MAX_DAYS} 天内未能成功检查该州页面。`);
}
