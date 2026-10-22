import Link from "next/link";

import { LETTERS, MAJOR_GROUP_IDS, majorGroupName, type IndexEntry } from "@/lib/occupations/index-data";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

export function OccupationList({ locale, entries }: { locale: string; entries: IndexEntry[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {entries.map((e) => (
        <li key={e.code}>
          <Link className="text-cyan-900 underline" data-occ-event="occupation_result_click" href={publicPath(locale, `/occupations/${e.slug}`)}>
            {e.name}
          </Link>{" "}
          <span className="font-mono text-xs text-slate-500">{e.code}</span>
        </li>
      ))}
    </ul>
  );
}

/** Group and A-Z navigation shared by the three index pages. */
export function IndexNav({ locale, groupCounts, letterCounts }: { locale: string; groupCounts: Record<string, number>; letterCounts: Record<string, number> }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return (
    <div className="space-y-4">
      <nav aria-label={t("By ANZSCO major group", "ANZSCO ana grubuna göre", "按 ANZSCO 大类")}>
        <h2 className="text-sm font-semibold text-slate-900">{t("By ANZSCO major group", "ANZSCO ana grubuna göre", "按 ANZSCO 大类")}</h2>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {MAJOR_GROUP_IDS.map((g) => (
            <li key={g}>
              <Link className="text-cyan-900 underline" href={publicPath(locale, `/occupations/group/${g}`)}>
                {g} · {majorGroupName(g, locale)} ({groupCounts[g] ?? 0})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label={t("A to Z", "A'dan Z'ye", "A–Z")}>
        <h2 className="text-sm font-semibold text-slate-900">{t("A to Z (by English title)", "A'dan Z'ye (İngilizce unvana göre)", "A–Z（按英文职业名）")}</h2>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {LETTERS.filter((l) => letterCounts[l]).map((l) => (
            <li key={l}>
              <Link className="font-medium text-cyan-900 underline" href={publicPath(locale, `/occupations/letter/${l}`)}>
                {l.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
