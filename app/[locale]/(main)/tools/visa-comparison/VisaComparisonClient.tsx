import Link from "next/link";

import { Button } from "@/components/ui/button";
import { comparisonContent } from "@/lib/visas/comparison-content";

/** The 189 / 190 / 491 table. All content, figures and sources come from lib/visas/comparison-content.ts. */
export function VisaComparisonClient({ locale }: { locale: string }) {
  const { copy, rows, officialPages, processingGuide } = comparisonContent(locale);

  return (
    <main className="min-h-screen bg-background pb-16">
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-3 py-1 text-xs font-semibold text-[#53917E]">
            {copy.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-base text-slate-600">{copy.subtitle}</p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{copy.feature}</th>
                  <th className="px-4 py-3 text-left font-semibold">189</th>
                  <th className="px-4 py-3 text-left font-semibold">190</th>
                  <th className="px-4 py-3 text-left font-semibold">491</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[0]}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[1]}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">{copy.feeNote}</p>
          <p className="mt-1 text-xs text-slate-500">{copy.checked}</p>

          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">{copy.sourcesTitle}</h2>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {officialPages.map((p) => (
                <li key={p.subclass}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                    {p.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={processingGuide.url} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                  {processingGuide.label}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[#53917E]/20 bg-[#53917E]/10 p-6 sm:p-8">
          <h2 className="text-base font-bold text-slate-900">{copy.ctaTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.ctaText}</p>
          <Button asChild className="mt-4 bg-[#53917E] hover:bg-[#53917E]/90">
            <Link href={`/${locale}/tools/points-calculator`}>{copy.ctaButton}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
