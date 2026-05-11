import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ClipboardList, RotateCcw, Trash2 } from "lucide-react";

import { db } from "@/db";
import { savedQuizResults } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteQuizResult } from "../actions";

type PageProps = { params: Promise<{ locale: string }> };

function readinessBadge(level: string | null) {
  if (level === "high") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default async function QuizDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) return null;

  const results = await db
    .select()
    .from(savedQuizResults)
    .where(eq(savedQuizResults.clerk_user_id, userId))
    .orderBy(desc(savedQuizResults.created_at));

  const latest = results[0];
  const latestRecs = (latest?.recommendations as string[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PR Readiness Quiz</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your saved quiz results and recommendations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/pr-readiness-quiz`} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </Link>
        </Button>
      </div>

      {/* Latest recommendations */}
      {latest && latestRecs.length > 0 && (
        <Card className="border-violet-100 bg-violet-50/50">
          <CardHeader>
            <CardTitle className="text-sm text-violet-800">
              Top recommendations from your latest result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestRecs.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-violet-700">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-violet-200 text-center text-[10px] font-bold leading-4 text-violet-700">
                    {i + 1}
                  </span>
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
              <p className="font-semibold text-slate-700">No quiz results yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Take the PR readiness quiz and your result will be saved here.
              </p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/pr-readiness-quiz`}>Take the Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <Card key={result.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-lg font-bold text-violet-700">
                    {result.score ?? "—"}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        Quiz result {results.length - idx}
                      </p>
                      {idx === 0 && (
                        <Badge className="bg-violet-100 text-violet-700 text-xs">Latest</Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs capitalize ${readinessBadge(result.readiness_level)}`}
                    >
                      {result.readiness_level ?? "unknown"}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-400">
                      {result.created_at
                        ? new Date(result.created_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                <form
                  action={async () => {
                    "use server";
                    await deleteQuizResult(result.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                    aria-label="Delete result"
                  >
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
