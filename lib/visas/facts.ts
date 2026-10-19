/**
 * Fact rows for the subclass 189 / 190 / 491 information pages (docs/seo-occupation-audit.md 8.3): value | source + link | data verified date.
 * The national facts come from the same data as the comparison table (comparison-content.ts: fee data and the Department's visa pages); the 190 and 491
 * pages also carry the state and territory program information from the admin state data (the snapshot the reports use), each state with its own
 * verified date. Nothing is estimated: a state with no data for the subclass says so.
 */
import visaDetails from "@/src/data/visa-details.json";
import type { AdminStateData } from "@/lib/admin-data/types";
import { translationOf } from "@/lib/admin-data/types";
import { STATE_ORDER } from "@/lib/admin-data/seed";
import { researchText } from "@/lib/marketing/research-journey";
import type { FactRow } from "@/lib/occupations/facts";
import { comparisonContent, FEES_CHECKED_ON, OFFICIAL_PAGES, type ComparisonSubclass } from "./comparison-content";

export type VisaFactRow = Omit<FactRow, "group"> & { group: "visa" | "states" };
export const FACT_SUBCLASSES: ComparisonSubclass[] = ["189", "190", "491"];
export const isFactSubclass = (s: string): s is ComparisonSubclass => (FACT_SUBCLASSES as string[]).includes(s);

type Second = { subclass: string; secondInstalment?: { amount: number; note: string; note_tr?: string; note_zh?: string } };

export function buildVisaFactRows(subclass: ComparisonSubclass, locale: string, snapshot: AdminStateData): VisaFactRow[] {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const rows: VisaFactRow[] = [];
  const x = comparisonContent(locale);
  const idx = FACT_SUBCLASSES.indexOf(subclass);
  const page = x.officialPages[idx];
  const common = { sourceName: page.label, sourceUrl: page.url, verified: FEES_CHECKED_ON };
  const ids = ["type", "nomination", "region", "pr", "points", "charge", "processing"];
  x.rows.forEach((r, i) => rows.push({ id: ids[i] ?? `row-${i}`, group: "visa", label: r.label, value: r.values[idx], ...common }));
  const second = (visaDetails as unknown as Second[]).find((d) => d.subclass === subclass)?.secondInstalment;
  if (second) {
    const note = locale === "tr" ? second.note_tr : locale === "zh-Hans" ? second.note_zh : undefined;
    rows.push({ id: "second", group: "visa", label: t("Second instalment", "İkinci taksit", "第二期费用"), value: `AUD ${second.amount.toLocaleString("en-US")} · ${note ?? second.note}`, ...common });
  }

  if (subclass === "190" || subclass === "491") {
    const codes = [...STATE_ORDER, ...Object.keys(snapshot.programs).filter((c) => !STATE_ORDER.includes(c)).sort()];
    for (const code of codes) {
      const p = snapshot.programs[code];
      if (!p) continue;
      const verified = p.lastVerifiedAt.slice(0, 10);
      const sc = p.subclasses.find((s) => s.subclass === subclass);
      const parts: string[] = [];
      if (sc) {
        parts.push(`${t("Availability", "Durum", "状态")}: ${sc.availability}`);
        if (p.status) parts.push(`${t("Program status", "Program durumu", "项目状态")}: ${p.status}`);
        if (p.programYear) parts.push(`${t("Program year", "Program yılı", "项目年度")}: ${p.programYear}`);
        if (p.openingDate) parts.push(`${t("Opening date", "Açılış tarihi", "开放日期")}: ${p.openingDate}`);
        if (sc.allocation != null) parts.push(`${t("Allocation", "Kontenjan", "配额")}: ${sc.allocation}`);
        if (sc.feeInclGst != null) parts.push(`${t("Nomination fee (incl. GST)", "Aday gösterme ücreti (GST dahil)", "提名费（含 GST）")}: AUD ${sc.feeInclGst}`);
        const note = sc.feeNote ? (translationOf(sc.feeNote, locale)?.reviewed ? translationOf(sc.feeNote, locale)!.text : sc.feeNote.en) : "";
        if (note) parts.push(note);
      } else parts.push(t("No subclass data in the held state data", "Kayıtlı eyalet verisinde bu alt sınıf için veri yok", "所存州数据中没有该子类的数据"));
      rows.push({ id: `state-${code}`, group: "states", label: `${p.stateName} (${code})`, value: parts.join(" | "), sourceName: t("State or territory official page", "Eyalet veya bölgenin resmî sayfası", "州或领地官方页面"), sourceUrl: p.officialUrl ?? OFFICIAL_PAGES[subclass], verified });
    }
  }
  return rows;
}
