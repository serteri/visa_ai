import { NextResponse } from "next/server";

import { getReportPdfForDownload } from "@/lib/services/report-service";
import { getUserReportById } from "@/src/lib/user-reports";
import { canAccessReport } from "@/lib/reports/report-access";
import { getReportRequester } from "@/lib/reports/report-access-server";

export const dynamic = "force-dynamic";

/**
 * Report PDF download. Served only when the report is unlocked AND the requester is authorized for it
 * (lib/reports/report-access.ts): an admin session, the report's access token (?t=, handed out on the Stripe-verified
 * checkout success page and in the emails sent to the report's own address), or a signed-in user whose email is the
 * report's. The report id alone is not enough. Not found, locked and unauthorized all answer the same 404, so the
 * route does not reveal which reports exist or are unlocked.
 */
export async function GET(req: Request, ctx: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const notAvailable = () =>
    new NextResponse("Report not found, not unlocked, or you are not authorized to download it.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });

  try {
    const record = await getUserReportById(reportId);
    if (!record || !record.isUnlocked) return notAvailable();
    const requester = await getReportRequester();
    if (!canAccessReport({ requester, reportId, reportEmail: record.email, token })) return notAvailable();

    const result = await getReportPdfForDownload(reportId);
    if (!result) return notAvailable();

    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.fileName}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error(`[reports/pdf] failed to generate PDF for report ${reportId}:`, error);
    return new NextResponse("Failed to generate report", { status: 500 });
  }
}
