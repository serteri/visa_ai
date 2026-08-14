import type { Metadata } from "next";

import { KnowledgeChatUI } from "@/components/KnowledgeChatUI";

export const metadata: Metadata = {
  title: "LogiVisa AI Consultant",
  description:
    "Ask anything about Australian visas. Responses are generated based on official immigration guidelines.",
};

// Deliberately outside the (main) route group -- this is a dedicated,
// full-screen assistant page without the site's usual header/nav chrome.
// Still lives under [locale] (not a top-level app/ai-assistant route) so it
// resolves through proxy.ts's locale rewrite like every other page instead
// of 404ing -- see the "Rewrite all clean English paths" block in proxy.ts.
export default function AiAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto max-w-4xl px-4 pt-10 pb-6 text-center sm:pt-16">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">LogiVisa AI Consultant</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Ask anything about Australian visas. Responses are generated based on official immigration guidelines.
        </p>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-10 sm:pb-16">
        <KnowledgeChatUI className="h-[75vh]" />
      </main>
    </div>
  );
}
