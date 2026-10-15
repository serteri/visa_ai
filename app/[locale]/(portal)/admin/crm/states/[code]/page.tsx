import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prismaStateProgramStore } from "@/lib/admin-data/store-prisma";
import { requireRole } from "@/lib/auth/rbac";
import { SourceUpdatePanel } from "./SourceUpdatePanel";
import { StateEditor } from "./StateEditor";

export const metadata: Metadata = {
  title: "Admin · State nomination · LogiVisa Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string; code: string }> };

export default async function AdminStateEditorPage({ params }: PageProps) {
  const { locale, code } = await params;
  const stateCode = code.toUpperCase();
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/states/${stateCode}`);

  const program = await prismaStateProgramStore.get(stateCode);
  if (!program) notFound();
  const history = await prismaStateProgramStore.history(stateCode, 60);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
      <div>
        <Link href={`/${locale}/admin/crm/states`} className="text-sm text-primary underline-offset-2 hover:underline">
          ← All states
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {program.stateName} ({program.stateCode}) · program year {program.programYear}
        </h1>
      </div>
      <SourceUpdatePanel stateCode={program.stateCode} stateName={program.stateName} locale={locale} />
      <StateEditor initial={program} history={history} locale={locale} />
    </main>
  );
}
