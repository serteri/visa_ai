import { AssistantClient } from "./assistant-client";

type AssistantPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AssistantPage({ params }: AssistantPageProps) {
  const { locale } = await params;

  return <AssistantClient locale={locale === "tr" ? "tr" : "en"} />;
}
