import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Clock3, DollarSign, ExternalLink, FileText, Globe2, GraduationCap, ListChecks, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import visaDetails from "@/src/data/visa-details.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type AipProvider = {
  organization: string;
  contact: string;
  province: string;
  areas_served: string;
};

type AipData = {
  subclass: string;
  id: string;
  country: string;
  program_name: string;
  status: string;
  fees: string;
  processing_time: string;
  pdfSnapshotUrls: string[];
  overview: string;
  target_provinces: string[];
  candidate_eligibility: {
    core_requirements: string[];
    teer_matrix: Array<{ job_offer_teer: string; required_work_experience_teer: string }>;
    exemptions: {
      international_graduates: string;
      healthcare_sector: string;
    };
  };
  job_offer_criteria: string[];
  required_forms: {
    portal_digital_forms: Array<{ code: string; name: string }>;
    portal_upload_pdfs: Array<{ code: string; name: string }>;
  };
  legal_and_translations: {
    rules: string[];
    alternate_format_request: {
      email: string;
      subject_line: string;
      instructions: string;
    };
  };
  employer_requirements: {
    designation_criteria: string[];
    mandatory_training: {
      onboarding: string;
      intercultural_competency: string;
    };
    english_service_providers: AipProvider[];
    french_service_providers: AipProvider[];
    provincial_websites: Record<string, string>;
  };
  process_steps: {
    endorsement_phase: string[];
    immigration_phase: string[];
  };
};

function resolveNestedTranslation(translations: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, translations);
}

function t(translations: Record<string, unknown>, key: string, defaultValue?: string) {
  const value = resolveNestedTranslation(translations, key);
  return typeof value === "string" ? value : defaultValue || key;
}

const aipData = (visaDetails as AipData[]).find((item) => item.subclass === "atlantic-immigration-program") as AipData;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(BASE_URL),
    title: "Atlantic Immigration Program (AIP) | LogiVisa",
    description: aipData.overview,
    alternates: {
      canonical: `/${locale}/visas/atlantic-immigration-program`,
      languages: {
        en: `/en/visas/atlantic-immigration-program`,
        tr: `/tr/visas/atlantic-immigration-program`,
        "zh-Hans": `/zh-Hans/visas/atlantic-immigration-program`,
      },
    },
  };
}

function ProviderTable({ providers }: { providers: AipProvider[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950/60">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Organization</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Province</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Areas served</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {providers.map((provider) => (
              <tr key={`${provider.organization}-${provider.province}`} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 align-top font-medium text-slate-900 dark:text-white">{provider.organization}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.province}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.areas_served}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AtlanticImmigrationProgramPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);

  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
            <Sparkles className="h-4 w-4" />
            {officialInfoLabel}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">{aipData.status}</Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {aipData.program_name}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {aipData.overview}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-sky-600" />
                    Fee
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{aipData.fees}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-sky-600" />
                    Processing time
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{aipData.processing_time}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <MapPinned className="h-4 w-4 text-sky-600" />
                    Target provinces
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{aipData.target_provinces.length}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-sky-600 text-white hover:bg-sky-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {visitOfficialWebsiteLabel}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{aipData.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Country</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{aipData.country}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{aipData.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target provinces</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {aipData.target_provinces.map((province) => (
                    <span key={province} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {province}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={aipData.pdfSnapshotUrls}
          sourceUrl="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html"
          title="Atlantic Immigration Program Official Guide (PDF)"
          description="This public visa page exposes the full official AIP PDF snapshot stored on Vercel Blob."
          primaryLabel="Open PDF"
          sourceLabel={visitOfficialWebsiteLabel}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeCheck className="h-5 w-5 text-sky-600" />
                Candidate Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.candidate_eligibility.core_requirements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/60">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Job offer TEER</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Required work experience TEER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {aipData.candidate_eligibility.teer_matrix.map((row) => (
                        <tr key={row.job_offer_teer} className="bg-white dark:bg-slate-900">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.job_offer_teer}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.required_work_experience_teer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-100">
                  <GraduationCap className="h-4 w-4" />
                  International graduate exemption
                </div>
                <p className="text-sm text-sky-900 dark:text-sky-100">{aipData.candidate_eligibility.exemptions.international_graduates}</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  Healthcare sector rule
                </div>
                <p className="text-sm text-emerald-900 dark:text-emerald-100">{aipData.candidate_eligibility.exemptions.healthcare_sector}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                Job Offer Criteria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.job_offer_criteria.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-sky-600" />
                Digital portal forms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.required_forms.portal_digital_forms.map((form) => (
                  <li key={form.code} className="flex gap-3">
                    <span className="min-w-[80px] rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {form.code}
                    </span>
                    <span>{form.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-sky-600" />
                Upload PDFs and signed declarations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.required_forms.portal_upload_pdfs.map((form) => (
                  <li key={form.code} className="flex gap-3">
                    <span className="min-w-[80px] rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {form.code}
                    </span>
                    <span>{form.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe2 className="h-5 w-5 text-sky-600" />
                Legal and translations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.legal_and_translations.rules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Alternate format request email</p>
                <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">{aipData.legal_and_translations.alternate_format_request.email}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Subject line</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aipData.legal_and_translations.alternate_format_request.subject_line}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Instructions</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aipData.legal_and_translations.alternate_format_request.instructions}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-sky-600" />
                Employer designation requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.employer_requirements.designation_criteria.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Mandatory onboarding</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aipData.employer_requirements.mandatory_training.onboarding}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Intercultural competency</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aipData.employer_requirements.mandatory_training.intercultural_competency}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">English intercultural training providers</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderTable providers={aipData.employer_requirements.english_service_providers} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">French intercultural training providers</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderTable providers={aipData.employer_requirements.french_service_providers} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                Endorsement phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.process_steps.endorsement_phase.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                Immigration phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.process_steps.immigration_phase.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}