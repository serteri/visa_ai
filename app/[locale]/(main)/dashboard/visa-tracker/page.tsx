import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { visaTracking } from "@/db/schema";
import { VisaTrackerClient } from "./VisaTrackerClient";

type PageProps = { params: Promise<{ locale: string }> };

export default async function VisaTrackerPage({ params }: PageProps) {
  await params;
  const { userId } = await auth();
  if (!userId) return null;

  const items = await db
    .select()
    .from(visaTracking)
    .where(eq(visaTracking.clerk_user_id, userId))
    .orderBy(desc(visaTracking.created_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visa Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track the status of each visa application you're working toward.
        </p>
      </div>

      <VisaTrackerClient items={items} />
    </div>
  );
}
