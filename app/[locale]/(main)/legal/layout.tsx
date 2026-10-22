import type { Metadata } from "next";
import type { ReactNode } from "react";

import { pageAlternates } from "@/lib/seo/urls";

// The legal page is a client component (it cannot export metadata), so its alternates are declared here. All three locale routes exist and are
// translated, so the hreflang set names the real equivalents (not the locale homepages).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/legal") };
}

export default function LegalLayout({ children }: { children: ReactNode }) {
  return children;
}
