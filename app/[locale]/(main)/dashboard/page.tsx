import { auth } from "@/auth";
import Link from "next/link";
import { Calculator, ClipboardList, FileText, MapPin, ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
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
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  const [calcs, quizzes, reports, tracking] = await Promise.all([
    prisma.savedCalculation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.savedQuizResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.savedReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.visaTracking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestCalc = calcs[0];
  const latestQuiz = quizzes[0];
  const activeTracking = tracking.filter((t) => t.status !== "approved" && t.status !== "rejected");

  const summaryCards = [
    {
      label: "Latest Points Score",
      value: latestCalc ? `${latestCalc.totalPoints} pts` : "—",
      sub: latestCalc?.visaSubclass ? `Subclass ${latestCalc.visaSubclass}` : "No calculation yet",
      icon: <Calculator className="h-5 w-5 text-indigo-500" />,
      href: `/${locale}/dashboard/points`,
    },
    {
      label: "Latest Quiz Score",
      value: latestQuiz ? `${latestQuiz.score ?? 0}%` : "—",
      sub: latestQuiz?.readinessLevel ?? "Not taken yet",
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
    { label: "Calculate Points", href: `/${locale}/tools/points-calculator`, color: "bg-indigo-600 hover:bg-indigo-700" },
    { label: "Take PR Quiz", href: `/${locale}/pr-readiness-quiz`, color: "bg-violet-600 hover:bg-violet-700" },
    { label: "Full Check Report", href: `/${locale}/full-check`, color: "bg-cyan-600 hover:bg-cyan-700" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Here's a summary of your visa preparation progress.</p>
      </div>

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

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <Button key={a.label} asChild className={`${a.color} text-white`}>
              <Link href={a.href} className="flex items-center gap-2">
                {a.label}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {(latestCalc || latestQuiz || tracking.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {latestCalc && (
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calculator className="h-4 w-4 text-indigo-400" />
                  <span className="text-slate-700">
                    Points calculation — {latestCalc.totalPoints} pts
                    {latestCalc.visaSubclass && ` (Subclass ${latestCalc.visaSubclass})`}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{latestCalc.createdAt.toLocaleDateString()}</span>
              </div>
            )}
            {latestQuiz && (
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-700">PR Readiness Quiz</span>
                  <Badge variant="outline" className={`text-xs ${readinessColor(latestQuiz.readinessLevel)}`}>
                    {latestQuiz.readinessLevel ?? "—"}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">{latestQuiz.createdAt.toLocaleDateString()}</span>
              </div>
            )}
            {tracking.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-slate-700">Subclass {t.visaSubclass}</span>
                  <Badge variant="outline" className="text-xs capitalize">{t.status}</Badge>
                </div>
                <span className="text-xs text-slate-400">{t.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
