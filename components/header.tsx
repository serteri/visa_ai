import Link from "next/link";

import { LanguageSelector } from "@/components/language-selector";

const VISA_LINKS = [
  { subclass: "500", en: "Student visa 500", tr: "Öğrenci Vizesi 500" },
  { subclass: "485", en: "Temporary Graduate visa 485", tr: "Geçici Mezun Vizesi 485" },
  { subclass: "482", en: "Skills in Demand visa 482", tr: "Skills in Demand Vizesi 482" },
  { subclass: "189", en: "Skilled Independent visa 189", tr: "Skilled Independent Vizesi 189" },
  { subclass: "190", en: "Skilled Nominated visa 190", tr: "Skilled Nominated Vizesi 190" },
  { subclass: "491", en: "Skilled Work Regional visa 491", tr: "Skilled Work Regional Vizesi 491" },
  { subclass: "820_801", en: "Partner visa 820/801", tr: "Partner Vizesi 820/801" },
];

export function Header({
  locale,
  showAdmin = false,
}: {
  locale: string;
  showAdmin?: boolean;
}) {
  const isTr = locale === "tr";
  const checkerLabel = isTr ? "Kontrol" : "Checker";
  const assistantLabel = isTr ? "Asistan" : "Assistant";
  const fullReportLabel = isTr ? "Tam Rapor" : "Full Report";
  const visasLabel = isTr ? "Vizeler" : "Visas";
  const adminLabel = "Admin";

  return (
    <header className="relative z-40 border-b border-border/40 bg-white/95 backdrop-blur-sm">
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-semibold text-primary">
          Logivisa
        </Link>

        <div className="flex items-center gap-4">
          {/* Visas dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {visasLabel}
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-border bg-white py-1 shadow-md opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              {VISA_LINKS.map((v) => (
                <Link
                  key={v.subclass}
                  href={`/${locale}/visas/${v.subclass}`}
                  className="block px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isTr ? v.tr : v.en}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href={`/${locale}/checker`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {checkerLabel}
          </Link>
          <Link
            href={`/${locale}/assistant`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {assistantLabel}
          </Link>
          <Link
            href={`/${locale}/full-check`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {fullReportLabel}
          </Link>
          {showAdmin ? (
            <Link
              href={`/${locale}/admin/dashboard`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {adminLabel}
            </Link>
          ) : null}
          <LanguageSelector currentLocale={locale} />
        </div>
      </nav>
    </header>
  );
}
