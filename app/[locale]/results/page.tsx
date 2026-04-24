import { ResultsContent } from "@/components/results-content";
import { matchVisas } from "@/lib/visa/match-visas";

type ResultsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    goal?: string;
    hasSponsor?: string;
    inAustralia?: string;
    englishScore?: string;
  }>;
};

export default async function ResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const { locale } = await params;
  const {
    goal = "",
    hasSponsor = "no",
    inAustralia = "no",
    englishScore,
  } = await searchParams;

  const matchedVisas = await matchVisas({
    goal,
    hasSponsor: hasSponsor === "yes",
    inAustralia: inAustralia === "yes",
    englishScore: englishScore ? parseFloat(englishScore) : undefined,
  });

  return <ResultsContent locale={locale} matchedVisas={matchedVisas} />;
}
