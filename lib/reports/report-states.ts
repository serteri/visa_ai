/**
 * State and territory programs: all eight, in a fixed order (by code), with the published status, the occupation-list result for the
 * occupation the applicant entered (190 / 491), every published condition and the source and date checked. Nothing is filtered,
 * ranked or marked "available to you".
 */
import { matchOccupationToState } from "@/lib/state-nomination/occupation-match";
import { localizeStateFact } from "@/lib/state-nomination/state-keyfact-translations";
import { getStateRule } from "@/lib/state-nomination/state-rules-config";
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import { T } from "./report-text";

export type StateInfo = {
  code: string;
  name: string;
  status: string;
  occupationList: string;
  conditions: string[];
  sources: string;
  checked: string;
};

const STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;

const docTitle = (doc: string) => {
  const t = doc.split("/").pop() ?? doc;
  return t.replace(/\.(pdf|png)$/i, "");
};

export function buildStateInfos(report: ReadinessReport, occupationRaw: string | undefined, l: Locale): StateInfo[] {
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
    const conditions = [rule?.note, ...(rule?.keyFacts ?? []), ...(s?.streamNotes ?? [])].filter((x): x is string => !!x).map((x) => localizeStateFact(l, x));
    return {
      code,
      name: rule?.name ?? s?.name ?? code,
      status: s?.status ?? rule?.status ?? "—",
      occupationList,
      conditions: [...new Set(conditions)],
      sources: (rule?.sourceDocument ?? "").split(";").map((d) => docTitle(d.trim())).filter(Boolean).join("; ") || "—",
      checked: (s?.lastVerifiedAt ?? rule?.lastVerified ?? "").slice(0, 10),
    };
  });
}
