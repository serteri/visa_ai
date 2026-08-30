import { auth } from "@/auth";
import Link from "next/link";
import { Calculator, Plus, Trash2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteCalculation } from "../actions";

type PageProps = { params: Promise<{ locale: string }> };

function scoreColor(pts: number) {
  if (pts >= 90) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (pts >= 75) return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (pts >= 65) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
}

export default async function PointsDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const calcs = await prisma.savedCalculation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Points Calculations</h1>
          <p className="mt-1 text-sm text-slate-300">Your saved DHA points test results.</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/tools/points-calculator`} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />New Calculation
          </Link>
        </Button>
      </div>

      {calcs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Calculator className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-white">No saved calculations yet</p>
              <p className="mt-1 text-sm text-slate-400">Run the points calculator and save your result to track it here.</p>
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
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-xl font-bold ${scoreColor(calc.totalPoints)}`}>
                        {calc.totalPoints}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{calc.totalPoints} points</p>
                        {calc.visaSubclass && (
                          <Badge variant="outline" className="mt-1 text-xs">Subclass {calc.visaSubclass}</Badge>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {calc.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {breakdown && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                        {Object.entries(breakdown)
                          .filter(([, v]) => typeof v === "number" && v > 0)
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <span key={k} className="whitespace-nowrap">
                              <span className="font-medium capitalize text-slate-200">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                              {" "}+{String(v)}
                            </span>
                          ))}
                      </div>
                    )}

                    <form action={async () => { "use server"; await deleteCalculation(calc.id); }}>
                      <button type="submit" className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-400" aria-label="Delete">
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
