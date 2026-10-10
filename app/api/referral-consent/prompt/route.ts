import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { consentNotice, consentTableReady, consentText, CONSENT_TEXT_VERSION, toConsentLocale } from "@/lib/consent/referral-consent";
import { getApprovedAgentUser } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

const REF_COOKIE = "logivisa_ref";

/**
 * What the full-check form shows a referred client: the consent checkbox naming the agent, or nothing. The agent is resolved on the server from the
 * referral cookie against the database (approved agents only) and named from the database, never from the URL or the cookie text. Nothing is
 * offered when there is no referral, the agent is not approved or has no name, or the consent table does not exist yet (we never offer a choice we
 * cannot store).
 */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const refAgentId = (await cookies()).get(REF_COOKIE)?.value;
    if (!refAgentId) return NextResponse.json({ show: false }, { headers });
    const agent = await getApprovedAgentUser(refAgentId);
    const agentName = agent?.name?.trim();
    if (!agent || !agentName || !(await consentTableReady())) return NextResponse.json({ show: false }, { headers });
    const locale = toConsentLocale(req.nextUrl.searchParams.get("locale"));
    return NextResponse.json({ show: true, agentName, version: CONSENT_TEXT_VERSION, text: consentText(locale, agentName), notice: consentNotice(locale, agentName) }, { headers });
  } catch (error) {
    console.error("[referral-consent/prompt] failed (offering nothing):", error);
    return NextResponse.json({ show: false }, { headers });
  }
}
