import Link from "next/link";

import { richEntries } from "@/lib/occupations/index-data";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

/** Hub-page links to the occupation pages with the most published detail (rich tier), plus the index. A fixed, data-driven list: no popularity or advice claim. */
export function RichOccupationLinks({ locale, limit = 12 }: { locale: string; limit?: number }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const entries = richEntries(locale, limit);
  return (
    <nav aria-label={t("Occupation information", "Meslek bilgileri", "职业信息")} className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">{t("Occupation information pages", "Meslek bilgi sayfaları", "职业信息页面")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("The occupations with the most published, dated detail.", "En fazla yayımlanmış ve tarihli ayrıntıya sahip meslekler.", "已公布且注明日期的信息最丰富的职业。")}</p>
      <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {entries.map((e) => (
          <li key={e.code}>
            <Link className="text-cyan-900 underline" href={publicPath(locale, `/occupations/${e.slug}`)}>
              {e.name}
            </Link>{" "}
            <span className="font-mono text-xs text-slate-500">{e.code}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <Link className="font-medium text-cyan-900 underline" href={publicPath(locale, "/occupations")}>
          {t("All occupations, A–Z and by group", "Tüm meslekler, A–Z ve gruba göre", "全部职业（A–Z 与分组）")}
        </Link>
      </p>
    </nav>
  );
}
