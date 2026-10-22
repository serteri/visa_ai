import type { Metadata } from "next";

import { pageAlternates } from "@/lib/seo/urls";
import { HomeContent } from "@/components/home-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/") };
}

export default async function Home() {

  return (
    <main className="flex-1 bg-[var(--cf-bg)] pb-16">
      <HomeContent />
    </main>
  );
}
