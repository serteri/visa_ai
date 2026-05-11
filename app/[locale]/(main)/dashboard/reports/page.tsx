import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText, Download, ArrowRight } from "lucide-react";

import { db } from "@/db";
import { savedReports } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PageProps = { params: Promise<{ locale: string }> };

const LANG_LABELS: Record<string, string> = {
  en: "English",
  tr: "Türkçe",
  "zh-Hans": "中文",
};

export default async function ReportsDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) return null;

  const reports = await db
    .select()
    .from(savedReports)
    .where(eq(savedReports.clerk_user_id, userId))
    .orderBy(desc(savedReports.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Readiness Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your Full Check PDF reports.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/full-check`} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">No reports yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Complete a Full Check and your PDF report will appear here.
              </p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/full-check`}>Start Full Check</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50">
                    <FileText className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">
                      {report.report_type.replace(/_/g, " ")} Report
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {LANG_LABELS[report.language ?? "en"] ?? report.language ?? "EN"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {report.report_url && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={report.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
