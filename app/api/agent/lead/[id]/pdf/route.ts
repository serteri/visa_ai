import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/rbac";
import { getLeadById } from "@/lib/crm/leads";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";
import type { ReadinessReport } from "@/lib/readiness/types";
import { refreshStoredReport } from "@/lib/reports/refresh-report";

/**
 * Regenerates the assessment PDF for a single lead, server-side, from the
 * stored report_json/input_json. ADMIN callers can pull any lead (getLeadById,
 * unscoped) since admins have full visibility over the CRM. AGENT callers are
 * refused: client details and the report are not shared with agents until the
 * client's consent exists.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // An agent never receives a client's report or details until the client's consent to share exists (the next task): refused whatever the agent's
  // approval, ownership or the report's payment state. Only an ADMIN can pull a report here.
  if (user.role === "AGENT") {
    return new NextResponse("Client details are not shared with agents.", { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }

  const lead = await getLeadById(id);
  if (!lead || !lead.reportJson) {
    return new NextResponse("Not found", { status: 404 });
  }

  const input = (lead.inputJson as unknown as ReadinessInput) ?? ({} as ReadinessInput);
  // Same current-engine refresh as the customer's download (lib/reports/refresh-report.ts).
  const { report } = await refreshStoredReport(lead.reportJson as unknown as ReadinessReport, lead.inputJson as unknown as ReadinessInput, {
    generatedAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : undefined,
  });
  const locale =
    lead.locale === "tr" || lead.locale === "zh-Hans" ? lead.locale : "en";

  try {
    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
      audience: "agent",
      userInputSummary: {
        name: lead.fullName ?? undefined,
        email: lead.email,
        mainGoal: input.mainGoal,
        currentCountry: input.currentCountry,
        passportCountry: input.passportCountry,
        age: input.age,
        occupation: input.occupation,
        englishLevel: input.englishLevel,
        sponsorOrFamily: input.sponsorOrFamily,
        biggestConcern: input.biggestConcern,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="lead-${id}-report.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Agent lead PDF generation failed:", error);
    return new NextResponse("Failed to generate report", { status: 500 });
  }
}
