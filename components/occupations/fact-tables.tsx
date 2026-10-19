import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { researchText } from "@/lib/marketing/research-journey";
import { FACT_GROUP_ORDER, type FactGroup, type FactRow } from "@/lib/occupations/facts";

/** One fact table: every row is label | value | source (linked) | date the data was verified. Shared by the occupation and visa pages. */
export function FactTable({ locale, heading, rows, group, note }: { locale: string; heading: string; rows: Array<Omit<FactRow, "group">>; group: string; note?: string }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  if (!rows.length) return null;
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5" data-fact-group={group}>
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none tracking-tight">{heading}</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-semibold">{t("Fact", "Bilgi", "事项")}</th>
                <th className="py-2 pr-4 font-semibold">{t("Value", "Değer", "内容")}</th>
                <th className="py-2 pr-4 font-semibold">{t("Source", "Kaynak", "来源")}</th>
                <th className="py-2 font-semibold">{t("Data verified", "Veri doğrulama tarihi", "数据核对日期")}</th>
              </tr>
            </thead>
            <tbody className="align-top text-slate-600">
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100" data-fact-row={r.id}>
                  <th scope="row" className="py-2 pr-4 font-medium text-slate-800">{r.label}</th>
                  <td className="py-2 pr-4 break-words">{r.value}</td>
                  <td className="py-2 pr-4 break-words">
                    {r.sourceUrl ? (
                      <a data-official-source href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-900 underline">
                        {r.sourceName}
                      </a>
                    ) : (
                      r.sourceName
                    )}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <time dateTime={r.verified}>{r.verified}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {note ? <p className="mt-3 text-xs text-slate-500">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FactTables({ locale, facts, stateNote }: { locale: string; facts: FactRow[]; stateNote?: string }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const headings: Record<FactGroup, string> = {
    identity: t("Identity", "Kimlik", "基本信息"),
    assessment: t("Skills assessment", "Beceri değerlendirmesi", "技能评估"),
    lists: t("National list placement", "Ulusal liste yeri", "国家清单位置"),
    states: t("State and territory program information", "Eyalet ve bölge program bilgileri", "州和领地项目信息"),
    registration: t("Registration that is separate from the skills assessment", "Beceri değerlendirmesinden ayrı kayıt", "与技能评估相互独立的注册"),
  };
  return (
    <>
      {FACT_GROUP_ORDER.map((group) => (
        <FactTable key={group} locale={locale} heading={headings[group]} group={group} rows={facts.filter((r) => r.group === group)} note={group === "states" ? stateNote : undefined} />
      ))}
    </>
  );
}
