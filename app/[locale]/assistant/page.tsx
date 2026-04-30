import { AssistantClient } from "./assistant-client";

type AssistantPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function AssistantPage({ params, searchParams }: AssistantPageProps) {
  const { locale } = await params;
  const { mode } = await searchParams;

  return (
    <AssistantClient
      locale={locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en"}
      initialMode={mode === "premium" ? "premium" : "simple"}
    />
  );
}
