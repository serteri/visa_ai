import Link from "next/link";

import { getPointsCalcSeoContent, buildPointsCalcSchema, POINTS_CALC_CHECKED } from "@/lib/seo/points-calculator-content";
import { longDate } from "@/lib/reports/public-sources";
import type { Locale } from "@/lib/i18n/config";
import { publicPath } from "@/lib/seo/urls";

const link = "font-medium text-cyan-900 underline underline-offset-4";
const h2 = "text-lg font-bold text-slate-900";

/** Header block of /tools/points-calculator/australia: the H1 and a concise intro; the calculator follows directly. */
export function PointsCalculatorHeader({ locale }: { locale: string }) {
  const c = getPointsCalcSeoContent(locale);
  return (
    <div className="mb-10 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{c.h1}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600" data-points-intro>
        {c.intro}
      </p>
    </div>
  );
}

/** Crawlable sections under the calculator: how 189 / 190 / 491 differ, the factors, the 65-point threshold, calculator vs EOI, FAQs, links and sources. */
export function PointsCalculatorSeoSections({ locale }: { locale: string }) {
  const c = getPointsCalcSeoContent(locale);
  return (
    <section className="border-t border-slate-200 bg-slate-50" data-points-seo>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildPointsCalcSchema(locale) }} />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        <div>
          <h2 className={h2}>{c.differ.heading}</h2>
          <p className="mt-2 text-sm text-slate-600">{c.differ.intro}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {c.differ.items.map((i) => (
              <div key={i.subclass} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  <Link href={publicPath(locale, `/visas/${i.subclass}`)} className={link}>
                    {i.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{i.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {c.differ.note}{" "}
            <Link href={publicPath(locale, "/tools/visa-comparison")} data-tool-destination="visa_comparison" className={link}>
              {c.links.items.find((l) => l.path === "/tools/visa-comparison")?.label}
            </Link>
          </p>
        </div>

        <div>
          <h2 className={h2}>{c.factors.heading}</h2>
          <p className="mt-2 text-sm text-slate-600">{c.factors.intro}</p>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
            {c.factors.items.map((f) => (
              <li key={f.name}>
                <span className="font-semibold text-slate-800">{f.name}:</span> {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={h2}>{c.enough.heading}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
            {c.enough.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>
              <Link href={publicPath(locale, "/tools/invitation-rounds")} data-tool-destination="invitation_rounds" className={link}>
                {c.links.items.find((l) => l.path === "/tools/invitation-rounds")?.label}
              </Link>
            </p>
          </div>
        </div>

        <div>
          <h2 className={h2}>{c.eoi.heading}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
            {c.eoi.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>

        <div data-points-faq>
          <h2 className={h2}>{c.faqTitle}</h2>
          <div className="mt-3 space-y-4">
            {c.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <nav aria-label={c.links.heading}>
          <h2 className={h2}>{c.links.heading}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {c.links.items.map((l) => (
              <li key={l.path}>
                <Link href={publicPath(locale, l.path)} data-tool-destination={l.destination} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">{c.cta.text}</p>
          <Link
            href={publicPath(locale, "/full-check")}
            data-assessment-entry="points_calculator_australia"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 hover:bg-cyan-100"
          >
            {c.cta.button}
          </Link>
        </div>

        <div>
          <h2 className={h2}>{c.sources.heading}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {c.sources.items.map((s) => (
              <li key={s.url}>
                <a data-official-source href={s.url} target="_blank" rel="noopener noreferrer" className={link}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            {c.sources.checked} {longDate(POINTS_CALC_CHECKED, locale as Locale)}
          </p>
        </div>
      </div>
    </section>
  );
}
