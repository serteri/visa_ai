import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/rbac";
import { CreateAgentForm } from "./create-agent-form";

export const metadata: Metadata = {
  title: "Add New Agent · Admin · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ locale: string }> };

export default async function CreateAgentPage({ params }: PageProps) {
  const { locale } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/agents/create`);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Admin</p>
        <h1 className="text-2xl font-bold">Add New Agent</h1>
        <p className="text-sm text-slate-500">
          Creates an approved AGENT account immediately -- no separate review step, unlike
          self-registration via /agent/register.
        </p>
      </div>

      <CreateAgentForm locale={locale} />
    </div>
  );
}
