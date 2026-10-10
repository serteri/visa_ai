import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/rbac";
import { canAgentSeeClient } from "@/lib/crm/agent-access";
import { getLeadById } from "@/lib/crm/leads";
import { isPartnerPathwaySelected } from "@/lib/readiness/engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";
import type { ReadinessReport } from "@/lib/readiness/types";
import { refreshStoredReport } from "@/lib/reports/refresh-report";

/**
 * Regenerates the assessment PDF for a single lead, server-side, from the
 * stored report_json/input_json. ADMIN callers can pull any lead (getLeadById,
 * unscoped) since admins have full visibility over the CRM. An AGENT gets the PDF
 * only when canAgentSeeClient() is true (the client consented, not withdrawn) AND the
 * report is unlocked and paid by the client, AND it is not a partner or Canada report
 * (those agent PDFs are excluded until they are redone).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // One gate for every agent read: the report is theirs, they are approved and the client has consented. Anything else is the same 403.
  if (user.role === "AGENT" && !(await canAgentSeeClient(user.id, id))) {
    return new NextResponse("Client details are not shared with agents.", { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }

  const lead = await getLeadById(id);
  if (!lead || !lead.reportJson) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (user.role === "AGENT") {
    // Never before payment, and never the partner or Canada report (its agent PDF is excluded until redone).
    const inputForScope = (lead.inputJson ?? {}) as { preferredPathway?: string; targetVisa?: string; country?: string };
    const excluded = inputForScope.country === "CA" || isPartnerPathwaySelected({ preferredPathway: inputForScope.preferredPathway ?? inputForScope.targetVisa });
    const paid = lead.isUnlocked && lead.paymentStatus === "paid";
    if (!paid || excluded) {
      return new NextResponse("This report is not available to agents.", { status: 403, headers: { "Cache-Control": "private, no-store" } });
    }
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
