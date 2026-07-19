import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

// Bare "/agent" has no page of its own (only /agent/dashboard, /agent/pool,
// /agent/lead/[id] do). An unauthenticated visit to exactly "/agent" sets
// callbackUrl=/agent (proxy.ts's role-gate uses the literal requested path),
// and loginAction's "/\/agent(\/|$)/ " check happily honors that callback
// after sign-in -- landing the user on a 404. Mirrors the /admin/crm and
// legacy /admin index-redirect pages.
export default async function AgentIndexPage({ params }: PageProps) {
  const { locale } = await params;
  // English is prefixless (see proxy.ts) -- redirecting to "/en/agent/pool"
  // would work but adds an extra next.config "/en/*" -> "/*" hop for nothing.
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/agent/pool`);
}
