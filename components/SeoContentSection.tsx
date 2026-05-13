"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export interface SeoSection {
  heading: string;
  body: string;
}

export interface SeoContentSectionProps {
  toolLabel: string;
  intro: string;
  sections: SeoSection[];
  faqs: FaqItem[];
  faqTitle: string;
  aboutTitle: string;
  schemaJson: string;
}

function FaqAccordion({ faqs, faqTitle }: { faqs: FaqItem[]; faqTitle: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-900">{faqTitle}</h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {faqs.map((faq, i) => (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={openIdx === i}
            >
              <h3 className="text-sm font-semibold text-slate-800 leading-snug">{faq.q}</h3>
              {openIdx === i ? (
                <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4">
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeoContentSection({
  toolLabel,
  intro,
  sections,
  faqs,
  faqTitle,
  aboutTitle,
  schemaJson,
}: SeoContentSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJson }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Collapsible toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:bg-slate-50"
        >
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{toolLabel}</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">{aboutTitle}</p>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
          )}
        </button>

        {open && (
          <div className="mt-6 space-y-8">
            {/* Intro */}
            <p className="text-base leading-relaxed text-slate-700">{intro}</p>

            {/* Content sections */}
            <div className="space-y-6">
              {sections.map((sec, i) => (
                <div key={i}>
                  <h2 className="mb-2 text-lg font-bold text-slate-900">{sec.heading}</h2>
                  <p className="text-sm leading-relaxed text-slate-600">{sec.body}</p>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <FaqAccordion faqs={faqs} faqTitle={faqTitle} />
          </div>
        )}
      </div>
    </section>
  );
}
