"use client";

import { useMemo, useState } from "react";

import { computeFromCharges, formatAud, MAX_PEOPLE, type ChargeSubclass, type SubclassCharges } from "@/lib/costs/charge-math";
import { researchText } from "@/lib/marketing/research-journey";

const inputCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/** Adds the published visa application charges for the numbers entered. Every line carries its source link and verified date. */
export function CostCalculatorClient({ locale, charges }: { locale: string; charges: SubclassCharges[] }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const [subclass, setSubclass] = useState<ChargeSubclass>(charges[0].subclass);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const current = charges.find((c) => c.subclass === subclass) ?? charges[0];
  const result = useMemo(() => computeFromCharges(current, { additionalAdults: adults, children, secondInstalments: seconds }), [current, adults, children, seconds]);
  const num = (setter: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(Math.min(MAX_PEOPLE, Math.max(0, Math.floor(Number(e.target.value) || 0))));
  const labels = {
    main: t("Main applicant", "Ana başvurucu", "主申请人"),
    adult: t("Additional applicant aged 18 or over", "18 yaş ve üzeri ek başvurucu", "18 岁及以上的附加申请人"),
    child: t("Additional applicant under 18", "18 yaş altı ek başvurucu", "18 岁以下的附加申请人"),
    second: t("Second instalment", "İkinci taksit", "第二期费用"),
  } as const;
  const secondRule = subclass === "491" ? t("The visa page applies the second instalment to each dependent applicant aged 18 or over who does not have functional English.", "Vize sayfası ikinci taksiti, işlevsel İngilizcesi olmayan 18 yaş ve üzeri her bağımlı başvurucuya uygular.", "签证页面对每位年满 18 岁且未达到功能性英语水平的随行申请人收取第二期费用。") : t("The visa page applies the second instalment to each applicant aged 18 or over who does not have functional English.", "Vize sayfası ikinci taksiti, işlevsel İngilizcesi olmayan 18 yaş ve üzeri her başvurucuya uygular.", "签证页面对每位年满 18 岁且未达到功能性英语水平的申请人收取第二期费用。");

  return (
    <div className="space-y-6" data-cost-calculator>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          {t("Visa subclass", "Vize alt sınıfı", "签证子类")}
          <select className={inputCls} value={subclass} onChange={(e) => setSubclass(e.target.value as ChargeSubclass)} data-testid="cost-subclass">
            {charges.map((c) => (
              <option key={c.subclass} value={c.subclass}>
                {c.subclass}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          {labels.adult}
          <input className={inputCls} type="number" inputMode="numeric" min={0} max={MAX_PEOPLE} value={adults} onChange={num(setAdults)} data-testid="cost-adults" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          {labels.child}
          <input className={inputCls} type="number" inputMode="numeric" min={0} max={MAX_PEOPLE} value={children} onChange={num(setChildren)} data-testid="cost-children" />
        </label>
        {current.secondInstalment ? (
          <label className="space-y-1 text-sm font-medium text-slate-700">
            {t("Applicants the second-instalment rule covers", "İkinci taksit kuralının kapsadığı başvurucu sayısı", "适用第二期费用规则的申请人数")}
            <input className={inputCls} type="number" inputMode="numeric" min={0} max={MAX_PEOPLE} value={seconds} onChange={num(setSeconds)} data-testid="cost-second" />
            <span className="block text-xs font-normal text-slate-500">{secondRule}</span>
          </label>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm" data-cost-table>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">{t("Charge", "Ücret", "费用项目")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("Number", "Adet", "数量")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("Each", "Birim", "单价")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("Subtotal", "Ara toplam", "小计")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("Source", "Kaynak", "来源")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("Data verified", "Veri doğrulama tarihi", "数据核对日期")}</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((l) => (
              <tr key={l.id} className="border-t border-slate-200" data-cost-line={l.id}>
                <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">{labels[l.id]}</th>
                <td className="px-4 py-3 text-right text-slate-600">{l.count}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatAud(l.unit)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAud(l.total)}</td>
                <td className="px-4 py-3 text-slate-600">
                  <a href={l.source.url} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                    {l.source.name}
                  </a>
                  {l.source.effectiveFrom ? <span className="block text-xs text-slate-500">{t("Effective from", "Geçerlilik başlangıcı", "生效日期")} {l.source.effectiveFrom}</span> : null}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  <time dateTime={l.source.verified}>{l.source.verified}</time>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <th scope="row" colSpan={3} className="px-4 py-3 text-left font-semibold text-slate-900">{t("Total of the charges above", "Yukarıdaki ücretlerin toplamı", "以上费用合计")}</th>
              <td className="px-4 py-3 text-right font-semibold text-slate-900" data-cost-total>{formatAud(result.total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
