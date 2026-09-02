import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import stateNominationData from "@/src/data/state-nomination-status.json";
import { StatesConfigClient, type StateRow, type StateStatus } from "./StatesConfigClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "State Nomination Config — Admin | LogiVisa",
    description: "Manage per-state nomination status, supported visas, fees, and AI notes.",
  };
}

type PageProps = { params: Promise<{ locale: string }> };

const BASE_STATES = (stateNominationData as { states: Array<{ code: string; name: string }> }).states;

export default async function StatesConfigPage({ params }: PageProps) {
  const { locale } = await params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/${locale}/admin/dashboard`);
  }

  let tableMissing = false;
  let configRows: Awaited<ReturnType<typeof prisma.stateNominationConfig.findMany>> = [];
  try {
    configRows = await prisma.stateNominationConfig.findMany();
  } catch (err) {
    if (!isMissingRelationError(err, "state_nomination_configs")) throw err;
    tableMissing = true;
  }

  const configByCode = new Map(configRows.map((row) => [row.stateCode, row]));

  // Every state from the static JSON heatmap dataset is always listed, even
  // with no admin override yet -- an admin should be able to set one for
  // any of the 8 states, not just ones already touched.
  const rows: StateRow[] = BASE_STATES.map((base) => {
    const config = configByCode.get(base.code);
    return {
      code: base.code,
      name: base.name,
      status: (config?.status as StateStatus | undefined) ?? "Not configured",
      supportedVisas: config?.supportedVisas ?? [],
      feeAud: config?.feeAud ?? null,
      customAiNote: config?.customAiNote ?? null,
      officialWebsite: config?.officialWebsite ?? null,
      updatedAt: config?.updatedAt ? config.updatedAt.toISOString() : null,
      isConfigured: Boolean(config),
    };
  });

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">State Nomination Config</h1>
          <p className="text-sm text-muted-foreground">
            Top-priority source of truth for state nomination status. Setting a state here overrides both the
            PDF State Nomination Matrix and the AI Assistant immediately -- no deploy required. Longer
            eligibility/pathway details still come from the knowledge base files.
          </p>
        </div>

        {tableMissing && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Database table not created yet</p>
            <p className="mt-1">
              The <code>state_nomination_configs</code> table doesn&apos;t exist in the live database yet. Run{" "}
              <code>npx prisma db push</code> (see the warning comment in <code>prisma/schema.prisma</code> --
              read the diff before confirming, per this project&apos;s two-ORM rules) to create it, then reload
              this page. Rows below show the static defaults until then.
            </p>
          </div>
        )}

        <StatesConfigClient initialRows={rows} disabled={tableMissing} />
      </section>
    </main>
  );
}
