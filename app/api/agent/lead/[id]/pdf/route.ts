import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/rbac";
import { getAgentLead } from "@/lib/crm/leads";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";
import type { ReadinessReport } from "@/lib/readiness/types";

/**
 * Regenerates the assessment PDF for a single lead, server-side, from the
 * stored report_json/input_json. Access is doubly scoped: the caller must be an
 * AGENT, and getAgentLead() only returns the row when agent_id === the caller,
 * so one agent can never pull another agent's report.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "AGENT") return new NextResponse("Forbidden", { status: 403 });

  const lead = await getAgentLead(user.id, id);
  if (!lead || !lead.reportJson) {
    return new NextResponse("Not found", { status: 404 });
  }

  const report = lead.reportJson as unknown as ReadinessReport;
  const input = (lead.inputJson as unknown as ReadinessInput) ?? ({} as ReadinessInput);
  const locale =
    lead.locale === "tr" || lead.locale === "zh-Hans" ? lead.locale : "en";

  try {
    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
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
