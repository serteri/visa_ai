import { auth } from "@/auth";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Calculator, Plus, Trash2 } from "lucide-react";

import { db } from "@/db";
import { savedCalculations } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteCalculation } from "../actions";

type PageProps = { params: Promise<{ locale: string }> };

function scoreColor(pts: number) {
  if (pts >= 90) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (pts >= 75) return "border-blue-200 bg-blue-50 text-blue-700";
  if (pts >= 65) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default async function PointsDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const calcs = await db
    .select()
    .from(savedCalculations)
    .where(eq(savedCalculations.user_id, session.user.id))
    .orderBy(desc(savedCalculations.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Points Calculations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your saved DHA points test results.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/tools/points-calculator`} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Calculation
          </Link>
        </Button>
      </div>

      {calcs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Calculator className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">No saved calculations yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Run the points calculator and save your result to track it here.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/${locale}/tools/points-calculator`}>Calculate Now</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calcs.map((calc) => {
            const breakdown = calc.breakdown as Record<string, unknown> | null;
            return (
              <Card key={calc.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-xl font-bold ${scoreColor(calc.total_points)}`}
                      >
                        {calc.total_points}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {calc.total_points} points
                        </p>
                        {calc.visa_subclass && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Subclass {calc.visa_subclass}
                          </Badge>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {calc.created_at
                            ? new Date(calc.created_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {breakdown && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {Object.entries(breakdown)
                          .filter(([, v]) => typeof v === "number" && v > 0)
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <span key={k} className="whitespace-nowrap">
                              <span className="font-medium capitalize text-slate-700">
                                {k.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              {" "}+{String(v)}
                            </span>
                          ))}
                      </div>
                    )}

                    <form
                      action={async () => {
                        "use server";
                        await deleteCalculation(calc.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                        aria-label="Delete calculation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
