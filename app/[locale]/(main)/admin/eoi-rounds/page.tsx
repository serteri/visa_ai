import type { Metadata } from "next";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { EoiRoundsClient } from "./EoiRoundsClient";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "EOI Rounds — Admin | LogiVisa",
    description: "Manage invitation rounds data",
  };
}

export default async function EoiRoundsPage({ params }: PageProps) {
  const { locale } = await params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/${locale}/admin/dashboard`);
  }

  const rounds = await prisma.eoiRound.findMany({
    orderBy: [{ roundDate: "desc" }, { visaSubclass: "asc" }],
  });

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">EOI Rounds</h1>
          <p className="text-sm text-muted-foreground">
            Manually add, view, and manage SkillSelect invitation round data.
          </p>
        </div>

        <EoiRoundsClient locale={locale} initialRounds={rounds} />
      </section>
    </main>
  );
}
