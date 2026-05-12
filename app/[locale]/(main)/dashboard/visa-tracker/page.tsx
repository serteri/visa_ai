import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { VisaTrackerClient } from "./VisaTrackerClient";

type PageProps = { params: Promise<{ locale: string }> };

export default async function VisaTrackerPage({ params }: PageProps) {
  await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await prisma.visaTracking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Serialize for client component (Date → string)
  const serialized = items.map((item) => ({
    id: item.id,
    visaSubclass: item.visaSubclass,
    status: item.status,
    notes: item.notes,
    targetDate: item.targetDate?.toISOString().split("T")[0] ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visa Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track the status of each visa application you're working toward.
        </p>
      </div>

      <VisaTrackerClient items={serialized} />
    </div>
  );
}
