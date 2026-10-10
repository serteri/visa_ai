/**
 * A referred client's consent to share their details with the referring agent. Append-only table `referral_consents` (see
 * prisma/manual-migrations/2026-10-10-create-referral-consents.sql): a grant and a withdrawal are rows; the newest row for a (report, agent) decides.
 *
 * Fails closed: if the table is missing or a read fails, there is no consent. The agent's name in the text always comes from the database.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

/** Bump whenever ANY wording below changes. A stored row keeps the exact text it was shown. */
export const CONSENT_TEXT_VERSION = "2026-10-v1";
/** Versions that still count as valid consent. Add the old version here only when a wording change does not narrow what the client agreed to. */
export const ACCEPTED_CONSENT_VERSIONS: readonly string[] = [CONSENT_TEXT_VERSION];

export type ConsentLocale = "en" | "tr" | "zh-Hans";
export const toConsentLocale = (locale: string | null | undefined): ConsentLocale => (locale === "tr" || locale === "zh-Hans" ? locale : "en");

/** The checkbox label. `agent` is the display name read from the database. */
export function consentText(locale: ConsentLocale, agent: string): string {
  if (locale === "tr") {
    return `Adımın, e-posta adresimin ve telefon numaramın ve (açıldıktan sonra) Vize Bilgi Raporumun, beni LogiVisa'ya yönlendiren göç danışmanı ${agent} ile paylaşılmasını kabul ediyorum. Bu izni istediğim zaman geri çekebilirim.`;
  }
  if (locale === "zh-Hans") {
    return `我同意将我的姓名、电子邮箱、电话号码以及（解锁后的）签证信息报告提供给推荐我使用 LogiVisa 的移民代理 ${agent}。我可以随时撤回此同意。`;
  }
  return `I agree that my name, email address and phone number, and my Visa Information Report once it is unlocked, are shared with ${agent}, the migration agent who referred me to LogiVisa. I can withdraw this at any time.`;
}

/** Shown under the checkbox: the commission disclosure, and that ticking is optional. */
export function consentNotice(locale: ConsentLocale, agent: string): string {
  if (locale === "tr") {
    return `${agent} sizi LogiVisa'ya yönlendirdi ve bir rapor satın alırsanız komisyon alabilir. Kutuyu işaretlemek isteğe bağlıdır: işaretlemeden de raporunuzu satın alabilir ve kullanabilirsiniz; bu durumda ${agent} bilgilerinizi görmez.`;
  }
  if (locale === "zh-Hans") {
    return `${agent} 推荐您使用 LogiVisa，如果您购买报告，${agent} 可能获得佣金。勾选是可选的：不勾选也可以购买并使用您的报告，此时 ${agent} 看不到您的任何信息。`;
  }
  return `${agent} referred you to LogiVisa and may receive a commission if you buy a report. Ticking the box is optional: you can buy and use your report without it, and ${agent} will not see your details.`;
}

const isMissingTable = (error: unknown) => /referral_consents/.test(String((error as Error)?.message ?? error)) && /does not exist|relation|42P01/.test(String((error as Error)?.message ?? error));

/** True when the consent table exists. Used to decide whether to offer the checkbox at all (never promise sharing control we cannot store). */
export async function consentTableReady(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM referral_consents LIMIT 1`);
    return true;
  } catch (error) {
    if (!isMissingTable(error)) console.error("[referral-consent] table check failed:", error);
    return false;
  }
}

export const hashIp = (ip: string | null | undefined) =>
  ip && ip !== "unknown" ? createHash("sha256").update(`${process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32) : null;

async function insertEvent(event: "granted" | "withdrawn", p: { reportId: string; agentId: string; text: string; version: string; locale: string; ipHash?: string | null; userAgent?: string | null }) {
  await prisma.$queryRawUnsafe(
    `INSERT INTO referral_consents (report_id, agent_id, event, consent_text_version, consent_text, locale, ip_hash, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    p.reportId, p.agentId, event, p.version, p.text, p.locale, p.ipHash ?? null, (p.userAgent ?? "").slice(0, 300) || null,
  );
}

/** Records the grant with the exact text shown. Never throws: a failed write means no consent (and a loud log), never a failed purchase flow. */
export async function recordConsentGranted(p: { reportId: string; agentId: string; agentName: string; locale: string; ipHash?: string | null; userAgent?: string | null }): Promise<boolean> {
  const locale = toConsentLocale(p.locale);
  try {
    await insertEvent("granted", { ...p, locale, text: consentText(locale, p.agentName), version: CONSENT_TEXT_VERSION });
    return true;
  } catch (error) {
    console.error("[referral-consent] could not store the consent; the agent will not see this client:", error);
    return false;
  }
}

/** Appends a withdrawal for the report's agent (nothing is updated or deleted). Returns false when there was nothing to withdraw. */
export async function recordConsentWithdrawn(reportId: string, p: { locale: string; ipHash?: string | null; userAgent?: string | null }): Promise<boolean> {
  try {
    const rows = (await prisma.$queryRawUnsafe(`SELECT agent_id, event FROM referral_consents WHERE report_id = $1 ORDER BY created_at DESC, id DESC`, reportId)) as Array<{ agent_id: string; event: string }>;
    const seen = new Set<string>();
    let withdrew = false;
    for (const row of rows) {
      if (seen.has(row.agent_id)) continue;
      seen.add(row.agent_id);
      if (row.event !== "granted") continue;
      await insertEvent("withdrawn", { reportId, agentId: row.agent_id, text: "Withdrawn by the client", version: CONSENT_TEXT_VERSION, locale: toConsentLocale(p.locale), ipHash: p.ipHash, userAgent: p.userAgent });
      withdrew = true;
    }
    return withdrew;
  } catch (error) {
    console.error("[referral-consent] could not store the withdrawal:", error);
    throw error;
  }
}

/** The report's consent state for one agent: the newest row decides. */
export async function consentState(reportId: string, agentId: string): Promise<"granted" | "withdrawn" | "none"> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT event, consent_text_version FROM referral_consents WHERE report_id = $1 AND agent_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1`,
      reportId, agentId,
    )) as Array<{ event: string; consent_text_version: string }>;
    const row = rows[0];
    if (!row) return "none";
    if (row.event === "withdrawn") return "withdrawn";
    return row.event === "granted" && ACCEPTED_CONSENT_VERSIONS.includes(row.consent_text_version) ? "granted" : "none";
  } catch (error) {
    if (!isMissingTable(error)) console.error("[referral-consent] consent read failed (treated as no consent):", error);
    return "none";
  }
}

// ── withdrawal link: signed with the server secret so only the client's own emailed link works ──
const secret = () => process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.REPORT_ACCESS_SECRET ?? "";
export const signConsentToken = (reportId: string) => createHmac("sha256", secret()).update(`referral-consent-withdraw:${reportId}`).digest("hex").slice(0, 40);
export function verifyConsentToken(reportId: string, token: string): boolean {
  if (!secret() || !reportId || !token) return false;
  const a = Buffer.from(signConsentToken(reportId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function withdrawalUrl(reportId: string, locale: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  return `${base}/api/referral-consent/withdraw?r=${encodeURIComponent(reportId)}&t=${signConsentToken(reportId)}&l=${toConsentLocale(locale)}`;
}
