import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Calculator, ClipboardList, FileText, MapPin, ArrowRight } from "lucide-react";

import { db } from "@/db";
import { savedCalculations, savedQuizResults, savedReports, visaTracking } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PageProps = { params: Promise<{ locale: string }> };

function readinessColor(level: string | null) {
  if (level === "high") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  const [calcs, quizzes, reports, tracking] = await Promise.all([
    db
      .select()
      .from(savedCalculations)
      .where(eq(savedCalculations.clerk_user_id, userId))
      .orderBy(desc(savedCalculations.created_at))
      .limit(1),
    db
      .select()
      .from(savedQuizResults)
      .where(eq(savedQuizResults.clerk_user_id, userId))
      .orderBy(desc(savedQuizResults.created_at))
      .limit(1),
    db
      .select()
      .from(savedReports)
      .where(eq(savedReports.clerk_user_id, userId))
      .orderBy(desc(savedReports.created_at)),
    db
      .select()
      .from(visaTracking)
      .where(eq(visaTracking.clerk_user_id, userId))
      .orderBy(desc(visaTracking.created_at)),
  ]);

  const latestCalc = calcs[0];
  const latestQuiz = quizzes[0];
  const activeTracking = tracking.filter((t) => t.status !== "approved" && t.status !== "rejected");

  const summaryCards = [
    {
      label: "Latest Points Score",
      value: latestCalc ? `${latestCalc.total_points} pts` : "—",
      sub: latestCalc?.visa_subclass ? `Subclass ${latestCalc.visa_subclass}` : "No calculation yet",
      icon: <Calculator className="h-5 w-5 text-indigo-500" />,
      href: `/${locale}/dashboard/points`,
    },
    {
      label: "Latest Quiz Score",
      value: latestQuiz ? `${latestQuiz.score ?? 0}%` : "—",
      sub: latestQuiz?.readiness_level ?? "Not taken yet",
      icon: <ClipboardList className="h-5 w-5 text-violet-500" />,
      href: `/${locale}/dashboard/quiz`,
    },
    {
      label: "Saved Reports",
      value: String(reports.length),
      sub: reports.length === 1 ? "1 report" : `${reports.length} reports`,
      icon: <FileText className="h-5 w-5 text-cyan-500" />,
      href: `/${locale}/dashboard/reports`,
    },
    {
      label: "Active Visa Tracking",
      value: String(activeTracking.length),
      sub: activeTracking.length === 1 ? "1 active visa" : `${activeTracking.length} active visas`,
      icon: <MapPin className="h-5 w-5 text-emerald-500" />,
      href: `/${locale}/dashboard/visa-tracker`,
    },
  ];

  const quickActions = [
    {
      label: "Calculate Points",
      href: `/${locale}/tools/points-calculator`,
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      label: "Take PR Quiz",
      href: `/${locale}/pr-readiness-quiz`,
      color: "bg-violet-600 hover:bg-violet-700",
    },
    {
      label: "Full Check Report",
      href: `/${locale}/full-check`,
      color: "bg-cyan-600 hover:bg-cyan-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's a summary of your visa preparation progress.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  {card.icon}
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <Button key={a.label} asChild className={`${a.color} text-white`}>
              <Link href={a.href} className="flex items-center gap-2">
                {a.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Recent activity */}
      {(latestCalc || latestQuiz || tracking.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestCalc && (
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calculator className="h-4 w-4 text-indigo-400" />
                  <span className="text-slate-700">
                    Points calculation — {latestCalc.total_points} pts
                    {latestCalc.visa_subclass && ` (Subclass ${latestCalc.visa_subclass})`}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {latestCalc.created_at
                    ? new Date(latestCalc.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            )}
            {latestQuiz && (
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-700">PR Readiness Quiz</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${readinessColor(latestQuiz.readiness_level)}`}
                  >
                    {latestQuiz.readiness_level ?? "—"}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">
                  {latestQuiz.created_at
                    ? new Date(latestQuiz.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            )}
            {tracking.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-slate-700">Subclass {t.visa_subclass}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {t.status}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">
                  {t.created_at
                    ? new Date(t.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
