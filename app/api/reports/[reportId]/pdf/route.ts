import { NextResponse } from "next/server";

import { getReportPdfForDownload } from "@/lib/services/report-service";

export const dynamic = "force-dynamic";

/**
 * Guest-facing PDF download for the checkout success page's "Download
 * Report" button (no auth -- most success-page visitors have no account).
 * reportId is an unguessable UUID, but that alone isn't a real access
 * control, so getReportPdfForDownload additionally requires is_unlocked =
 * true on the row before it will regenerate anything.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await ctx.params;

  try {
    const result = await getReportPdfForDownload(reportId);
    if (!result) {
      return new NextResponse("Report not found or not unlocked yet.", { status: 404 });
    }

    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(`[reports/pdf] failed to generate PDF for report ${reportId}:`, error);
    return new NextResponse("Failed to generate report", { status: 500 });
  }
}
