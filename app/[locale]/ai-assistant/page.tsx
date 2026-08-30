import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LanguageProvider } from "@/contexts/language-context";
import { getTranslations, t } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import { KnowledgeChatUI } from "@/components/KnowledgeChatUI";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);

  return {
    title: t(translations, "assistant.title", "LogiVisa AI Consultant"),
    description: t(
      translations,
      "assistant.subtitle",
      "Ask anything about Australian visas. Responses are generated based on official immigration guidelines.",
    ),
  };
}

// Deliberately outside the (main) route group -- this is a dedicated,
// full-screen assistant page without the site's usual header/nav chrome.
// Still lives under [locale] (not a top-level app/ai-assistant route) so it
// resolves through proxy.ts's locale rewrite like every other page instead
// of 404ing -- see the "Rewrite all clean English paths" block in proxy.ts.
export default async function AiAssistantPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);

  return (
    <LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-[#53917E]/10 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t(translations, "assistant.backToHome", "Back to Home")}
          </Link>
        </div>
        <header className="mx-auto max-w-4xl px-4 pt-4 pb-6 text-center sm:pt-8">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {t(translations, "assistant.title", "LogiVisa AI Consultant")}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {t(
              translations,
              "assistant.subtitle",
              "Ask anything about Australian visas. Responses are generated based on official immigration guidelines.",
            )}
          </p>
        </header>
        <main className="mx-auto max-w-4xl px-4 pb-10 sm:pb-16">
          <KnowledgeChatUI className="h-[75vh]" />
        </main>
      </div>
    </LanguageProvider>
  );
}
