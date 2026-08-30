import { auth } from "@/auth";
import Link from "next/link";
import { ClipboardList, RotateCcw, Trash2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteQuizResult } from "../actions";

type PageProps = { params: Promise<{ locale: string }> };

function readinessBadge(level: string | null) {
  if (level === "high") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (level === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
}

export default async function QuizDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const results = await prisma.savedQuizResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const latest = results[0];
  const latestRecs = (latest?.recommendations as string[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">PR Readiness Quiz</h1>
          <p className="mt-1 text-sm text-slate-300">Your saved quiz results and recommendations.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/pr-readiness-quiz`} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />Retake Quiz
          </Link>
        </Button>
      </div>

      {latest && latestRecs.length > 0 && (
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardHeader>
            <CardTitle className="text-sm text-violet-300">Top recommendations from your latest result</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestRecs.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-violet-200">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-violet-500/30 text-center text-[10px] font-bold leading-4 text-violet-200">{i + 1}</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-white">No quiz results yet</p>
              <p className="mt-1 text-sm text-slate-400">Take the PR readiness quiz and your result will be saved here.</p>
            </div>
            <Button asChild><Link href={`/${locale}/pr-readiness-quiz`}>Take the Quiz</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <Card key={result.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/30 text-lg font-bold text-violet-300">
                    {result.score ?? "—"}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">Quiz result {results.length - idx}</p>
                      {idx === 0 && <Badge className="bg-violet-500/20 text-violet-300 text-xs">Latest</Badge>}
                    </div>
                    <Badge variant="outline" className={`mt-1 text-xs capitalize ${readinessBadge(result.readinessLevel)}`}>
                      {result.readinessLevel ?? "unknown"}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-400">
                      {result.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <form action={async () => { "use server"; await deleteQuizResult(result.id); }}>
                  <button type="submit" className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-400" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
