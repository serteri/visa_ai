import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResearchLinks } from "@/components/research-links";
import { publicUrl } from "@/lib/seo/urls";

const path = "/resources/for-migration-professionals";
export const metadata: Metadata = {
  title: "Research resources for migration professionals",
  description: "Review LogiVisa's occupation, skills-assessment and points research tools and their information-only boundaries.",
  alternates: { canonical: publicUrl("en", path), languages: { en: publicUrl("en", path), "x-default": publicUrl("en", path) } },
};

export default async function ProfessionalResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
      <p className="text-sm font-medium text-cyan-900">For migration professionals</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Better questions before professional advice.</h1>
      <p className="mt-6 text-lg leading-relaxed text-slate-600">LogiVisa brings occupation details, assessment references and research tools into one flow for people researching Australian migration. We invite migration professionals to critique whether that flow is accurate, clear and useful.</p>
      <a href="#research-tools" className="mt-7 inline-flex rounded-lg bg-cyan-900 px-5 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4">Review the research tools ↓</a>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-900">Start with an occupation</h2>
        <p className="mt-4 leading-relaxed text-slate-600">An occupation code is a research starting point. It does not establish the applicable assessment program, an individual&apos;s visa eligibility or a nomination outcome.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[["Carpenter · 331212", "331212-carpenter"], ["Chef · 351311", "351311-chef"], ["Software Engineer · 261313", "261313-software-engineer"]].map(([label, slug]) => <Link key={slug} href={`/occupations/${slug}`} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-cyan-900 underline underline-offset-4">{label}</Link>)}
        </div>
      </section>

      <section id="research-tools" className="mt-10 scroll-mt-32">
        <ResearchLinks locale="en" />
        <dl className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
          <div><dt className="font-semibold text-slate-900">Assessment references</dt><dd>Find the mapped authority and follow its original guidance. Coverage is incomplete; a missing mapping is a data gap.</dd></div>
          <div><dt className="font-semibold text-slate-900">Points calculator</dt><dd>Explore an estimate using published points factors. The estimate is not an invitation prediction.</dd></div>
          <div><dt className="font-semibold text-slate-900">ANZSCO finder and visa comparison</dt><dd>Check occupation descriptions and compare the published features of subclasses 189, 190 and 491.</dd></div>
        </dl>
      </section>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-900">Sources, dates and limits</h2>
        <p className="mt-4 leading-relaxed text-slate-600">Research pages link to original government and assessing-authority sources. Where recorded, source review dates describe when those references were checked; they do not guarantee that a rule remains current. State references include historical coverage and must be checked against the current official program.</p>
        <p className="mt-4 leading-relaxed text-slate-600">LogiVisa provides general information, not personalised immigration advice or a skills-assessment decision. These resources are not a substitute for an appropriately authorised professional. No professional endorsement or partner relationship is implied by a source link.</p>
        <p className="mt-4 leading-relaxed text-slate-600">If you spot an error or an unclear boundary, feedback can be sent to <a href="mailto:hello@logivisa.com?subject=Research%20resource%20feedback" className="font-medium text-cyan-900 underline underline-offset-4">hello@logivisa.com</a>. Please include the page and source reference, without client information or documents.</p>
      </section>
    </article>
  );
}
