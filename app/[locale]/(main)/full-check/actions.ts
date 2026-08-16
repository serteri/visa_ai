"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";

import { db } from "@/db";
import { fullCheckUsage, fullCheckWaitlist, leads } from "@/db/schema";
import { prisma } from "@/lib/prisma";
import { getStripeBaseUrl } from "@/lib/stripe";
import { defaultCountry, isSupportedCountry, isPartnerFamilySponsorship, getVisaSubclassesForGoals, type MigrationGoalId } from "@/lib/countries";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import {
  completeFullCheckProgress,
  failFullCheckProgress,
  initFullCheckProgress,
  updateFullCheckProgress,
} from "@/lib/full-check-progress";
import { buildLeadQuality, runReadinessEngine } from "@/src/lib/readiness-engine";
import { getStateIntelligenceMap, getStateOccupationMatches } from "@/lib/state-intelligence";
import { canonicalizeOccupationInput, resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import { computeInternalLeadTier } from "@/lib/readiness/internal-lead-tier";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import {
  createUserReport,
  getUserReportById,
  markInternalLeadEmailSent,
  markUserReportUnlocked,
  type UnlockMethod,
} from "@/src/lib/user-reports";
import { getAgentUser } from "@/lib/crm/leads";
import { sendAgentAssignedEmail } from "@/lib/email/agent-notifications";

const REF_COOKIE = "logivisa_ref";

/**
 * Resolves the ?ref=<agentId> cookie (see components/ref-capture.tsx) to a
 * real AGENT account. Never throws -- an invalid/stale/tampered cookie value
 * just means no auto-assignment happens, not a broken submission.
 */
async function resolveReferralAgent(): Promise<{ id: string; email: string; name: string | null } | null> {
  try {
    const cookieStore = await cookies();
    const refAgentId = cookieStore.get(REF_COOKIE)?.value;
    if (!refAgentId) return null;

    const agent = await getAgentUser(refAgentId);
    return agent ?? null;
  } catch (error) {
    console.error("[full-check] Failed to resolve referral agent cookie (non-blocking):", error);
    return null;
  }
}

type SupportedLocale = "en" | "tr" | "zh-Hans";

export type FullCheckQuickPreview = {
  estimatedPoints?: number;
  pathways: Array<{
    subclass: string;
    visaName: string;
    confidenceLevel: "low" | "medium" | "high";
    reason: string;
  }>;
};

export type FullCheckWaitlistState = {
  status: "idle" | "success" | "error";
  error?: string;
  message?: string;
  requirePayment?: boolean;
  errors?: Record<string, string>;
  preview?: FullCheckQuickPreview;
  reportId?: string;
  userInput?: {
    name?: string;
    email?: string;
    mainGoal?: string;
    currentCountry?: string;
    passportCountry?: string;
    age?: string;
    qualificationLevel?: string;
    annualSalaryAud?: string;
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
  };
};

export type PremiumUnlockState = {
  status: "idle" | "success" | "error" | "redirect";
  message?: string;
  errors?: Record<string, string>;
  redirectUrl?: string;
  report?: ReadinessReport;
  userInput?: {
    name?: string;
    email?: string;
    mainGoal?: string;
    currentCountry?: string;
    passportCountry?: string;
    age?: string;
    qualificationLevel?: string;
    annualSalaryAud?: string;
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
  };
};

export type AdminResetState = {
  status: "idle" | "success" | "error";
  message: string;
  deletedCount?: number;
};

const optionalExperienceYearsSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().min(0).max(50).optional()
);

const optionalYesNoSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  },
  z.enum(["yes", "no"]).optional()
);

const optionalYesNoNotSureSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  },
  z.enum(["yes", "no", "not_sure"]).optional()
);

const optionalNominationStreamSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  },
  z.enum(["direct_entry", "trt", "labour_agreement", "not_sure"]).optional()
);

const optionalCourseCompletionStatusSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  },
  z.enum(["studying", "completed"]).optional()
);

// ─── Country-specific report schema guards ───────────────────────────────────

const AU_PATHWAY_SUBCLASSES = new Set(["500", "485", "482", "189", "190", "491", "820", "801", "186", "general"]);
const CA_PATHWAY_SUBCLASSES = new Set(["CEC", "FSW", "FSTP", "AIP", "FAMILY_SPONSORSHIP", "PNP", "general"]);

function ensureCountrySpecificReportSchema(report: ReadinessReport, country: "AU" | "CA"): ReadinessReport {
  const sanitized = enforceCountryReportScope(report, country);

  if (country === "CA") {
    const invalidPathway = (sanitized.pathwayComparison ?? []).find(
      (item) => !CA_PATHWAY_SUBCLASSES.has(item.subclass)
    );

    if (invalidPathway) {
      throw new Error(`Invalid Canada pathway schema key: ${invalidPathway.subclass}`);
    }

    if (sanitized.rankedPathways && sanitized.rankedPathways.length > 0) {
      throw new Error("Invalid Canada schema: rankedPathways must be omitted for CA reports.");
    }

    if (sanitized.stateNominationTracker) {
      throw new Error("Invalid Canada schema: stateNominationTracker must be omitted for CA reports.");
    }

    if (sanitized.lodgementReadyChecklist) {
      throw new Error("Invalid Canada schema: lodgementReadyChecklist must be omitted for CA reports.");
    }
  }

  if (country === "AU") {
    const invalidPathway = (sanitized.pathwayComparison ?? []).find(
      (item) => !AU_PATHWAY_SUBCLASSES.has(item.subclass)
    );

    if (invalidPathway) {
      throw new Error(`Invalid Australia pathway schema key: ${invalidPathway.subclass}`);
    }
  }

  return sanitized;
}

// ─── Feature flags ────────────────────────────────────────────────────────────

type FreeBetaStatus = {
  isFreeActive: boolean;
  freeReportsUsed: number;
  freeLimit: number;
  usageTrackingUnavailable?: boolean;
};

function isMissingRelationError(error: unknown, relationName: string): boolean {
  const target = relationName.toLowerCase();

  const scan = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === "string") {
      return value.toLowerCase().includes(target) || value.includes("42P01");
    }
    if (typeof value !== "object") return false;

    const record = value as Record<string, unknown>;
    if (record.code === "42P01") return true;
    return Object.values(record).some((entry) => scan(entry));
  };

  return scan(error);
}

async function getFreeBetaStatus(): Promise<FreeBetaStatus> {
  const maxFree = parseInt(process.env.MAX_FREE_REPORTS ?? "14", 10);
  const freeBetaEnabled = process.env.NEXT_PUBLIC_IS_FREE_BETA !== "false";
  const excludedEmails = getExcludedEmailSet();

  try {
    // Ensure singleton usage row exists for environments where seed hasn't run yet.
    await db
      .insert(fullCheckUsage)
      .values({
        id: 1,
        free_reports_used: 0,
        free_limit: maxFree,
        is_free_active: true,
      })
      .onConflictDoNothing();

    const rows = await db
      .select()
      .from(fullCheckUsage)
      .where(eq(fullCheckUsage.id, 1))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        isFreeActive: freeBetaEnabled,
        freeReportsUsed: 0,
        freeLimit: maxFree,
      };
    }

    const used = row.free_reports_used ?? 0;
    const active = row.is_free_active === true && used < maxFree;

    return { isFreeActive: active, freeReportsUsed: used, freeLimit: maxFree };
  } catch (error) {
    if (isMissingRelationError(error, "full_check_usage")) {
      console.warn("full_check_usage table missing; falling back to user_reports-based counter.");

      const consumed = await countFallbackConsumedFreeUsers(excludedEmails);
      const remaining = Math.max(0, maxFree - consumed);

      return {
        isFreeActive: freeBetaEnabled && remaining > 0,
        freeReportsUsed: consumed,
        freeLimit: maxFree,
        usageTrackingUnavailable: true,
      };
    }
    throw error;
  }
}

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Strips surrounding quote characters in addition to whitespace: if an env
// var value like ADMIN_EMAILS="a@b.com,c@d.com" gets pasted verbatim
// (quotes included) into a dashboard UI, trim() alone won't remove the
// quotes, silently breaking every email in the list.
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function getAdminEmailSet(): Set<string> {
  return new Set(parseEmailList(process.env.ADMIN_EMAILS));
}

function getKnownTestEmailSet(): Set<string> {
  return new Set(parseEmailList(process.env.KNOWN_TEST_EMAILS));
}

function getExcludedEmailSet(): Set<string> {
  return new Set([...getAdminEmailSet(), ...getKnownTestEmailSet()]);
}

async function countFallbackConsumedFreeUsers(excludedEmails: Set<string>): Promise<number> {
  const rows = await prisma.userReport.findMany({
    where: { source: "full_check" },
    select: {
      email: true,
      isUnlocked: true,
      paymentStatus: true,
      unlockMethod: true,
    },
  });

  const consumedUsers = new Set<string>();

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? "";
    if (!email) continue;
    if (excludedEmails.has(email)) continue;

    const hasClaimedFreeSlot =
      row.isUnlocked === true ||
      row.paymentStatus === "beta_free" ||
      row.unlockMethod === "beta_free";

    if (hasClaimedFreeSlot) {
      consumedUsers.add(email);
    }
  }

  return consumedUsers.size;
}

function isAdminWhitelistedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAdminEmailSet().has(normalized);
}

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

async function hasRecentSubmission(email: string, source: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const rows = await db
      .select({ id: fullCheckWaitlist.id })
      .from(fullCheckWaitlist)
      .where(
        and(
          eq(fullCheckWaitlist.email, email),
          eq(fullCheckWaitlist.source, source),
          gte(fullCheckWaitlist.created_at, fiveMinutesAgo)
        )
      )
      .limit(1);

    return rows.length > 0;
  } catch (error) {
    if (isMissingRelationError(error, "full_check_waitlist")) {
      console.warn("full_check_waitlist table missing; skipping recent-submission dedupe check.");
      return false;
    }
    throw error;
  }
}

// ─── Email senders ────────────────────────────────────────────────────────────

async function sendFullCheckAdminEmail(payload: {
  fullName: string;
  email: string;
  visaInterest: string;
  preferredLanguage: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  englishTestTaken: string;
  occupationConfirmed: string;
  estimatedBudgetRange: string;
  timeline: string;
  qualificationAwardedInAustralia?: boolean;
  qualificationRegionalAustralia?: boolean;
  specialistEducationStemResponse?: "yes" | "no" | "not_sure";
  offshoreExperienceYears?: number;
  onshoreExperienceYears?: number;
  sponsorOrFamily: string;
  biggestConcern: string;
  mainGoal: string;
  source: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.FULL_CHECK_NOTIFICATION_EMAIL ||
    process.env.REFERRAL_NOTIFICATION_EMAIL ||
    "serter@logivisa.com";

  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const bodyLines = [
    "A new full readiness assessment has been completed.",
    "",
    `full name: ${payload.fullName || "-"}`,
    `email: ${payload.email}`,
    `phone: -`,
    `visa interest: ${payload.visaInterest || "-"}`,
    `preferred language: ${payload.preferredLanguage || "-"}`,
    `current country: ${payload.currentCountry || "-"}`,
    `passport country: ${payload.passportCountry}`,
    `age: ${payload.age}`,
    `occupation: ${payload.occupation || "-"}`,
    `english level: ${payload.englishLevel || "-"}`,
    `english test taken: ${payload.englishTestTaken || "-"}`,
    `occupation confirmed: ${payload.occupationConfirmed || "-"}`,
    `estimated budget range: ${payload.estimatedBudgetRange || "-"}`,
    `timeline: ${payload.timeline || "-"}`,
    `qualification completed at Australian institution: ${payload.qualificationAwardedInAustralia ?? "-"}`,
    `qualification completed at regional Australian campus: ${payload.qualificationRegionalAustralia ?? "-"}`,
    `specialist education STEM response: ${payload.specialistEducationStemResponse ?? "-"}`,
    `offshore skilled employment years: ${payload.offshoreExperienceYears ?? "-"}`,
    `onshore skilled employment years: ${payload.onshoreExperienceYears ?? "-"}`,
    `sponsor/family: ${payload.sponsorOrFamily || "-"}`,
    `biggest concern: ${payload.biggestConcern || "-"}`,
    `main goal: ${payload.mainGoal}`,
    `source: ${payload.source}`,
  ];

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: `🔥 New Assessment Completed: ${payload.fullName || "Unknown"}`,
    text: bodyLines.join("\n"),
  });
}

// Internal-only lead-scoring notification (Hot/Warm tiers, never Cold — see
// computeInternalLeadTier). Distinct from sendFullCheckAdminEmail above:
// this one is deliberately framed as an unverified self-reported signal for
// an agent to re-verify, not a confirmed qualification claim, since none of
// this data has document/test evidence attached at the free-tier stage.
async function sendInternalLeadTierEmail(payload: {
  tier: "Hot" | "Warm";
  fullName: string;
  email: string;
  phone?: string;
  occupationDisplay: string;
  country: string;
  preferredPathway: string;
  estimatedPoints?: number;
  englishLevel: string;
  englishTestTaken: string;
  reportLink: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.INTERNAL_LEAD_NOTIFICATION_EMAIL || "hello@logivisa.com";

  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  const englishTestConfirmed = payload.englishTestTaken.trim().toLowerCase() === "yes";
  const englishWarningLine = !englishTestConfirmed
    ? `⚠️ No English test evidence on file — self-reported "${payload.englishLevel || "unspecified"}" band is unverified; a lower actual result could drop this profile below threshold.`
    : null;

  const bodyLines = [
    "Self-reported potential match — not verified. Confirm occupation, English test evidence, and employment history directly with the candidate before proceeding.",
    "",
    `Tier: ${payload.tier}`,
    "",
    `Name: ${payload.fullName || "-"}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone && payload.phone.trim() ? payload.phone : "Not yet provided"}`,
    `Occupation: ${payload.occupationDisplay || "-"}`,
    `Country / pathway: ${payload.country} — ${payload.preferredPathway || "-"}`,
    `Self-reported points estimate: ${payload.estimatedPoints ?? "-"}`,
    `English level (self-reported): ${payload.englishLevel || "-"}`,
    `English test taken: ${payload.englishTestTaken || "not answered"}`,
    "",
    ...(englishWarningLine ? [englishWarningLine, ""] : []),
    `Full report: ${payload.reportLink}`,
  ];

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: `${payload.tier === "Hot" ? "🔥" : "🌤️"} ${payload.tier} lead: ${payload.fullName || "Unknown"} (self-reported, unverified)`,
    text: bodyLines.join("\n"),
  });

  return true;
}

async function sendFullCheckConfirmationEmail(payload: {
  email: string;
  fullName: string;
  locale: "en" | "tr" | "zh-Hans";
  pdfAttachment?: Uint8Array;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
  const isTr = payload.locale === "tr";
  const isZh = payload.locale === "zh-Hans";
  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${payload.fullName},`
    : isTr
      ? "Merhaba,"
      : isZh
        ? "您好，"
        : "Hi,";

  await resend.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject: isTr
      ? "Tam vize hazirlik raporu talebiniz"
      : isZh
        ? "你的完整签证准备度报告"
        : "Your full visa readiness report request",
    text: isTr
      ? [
          greeting,
          "",
          "Tam vize hazirlik raporu talebiniz alindi.",
          "Yapilandirilmis rapor ekranda olusturuldu. Bu genel bilgi niteligindedir ve goc tavsiyesi degildir.",
        ].join("\n")
      : isZh
        ? [
            greeting,
            "",
            "我们已收到你的完整签证准备度报告请求。",
            "你的高级 PDF 报告已作为附件发送。",
            "本内容仅供一般信息参考，不构成移民建议。",
          ].join("\n")
        : [
            greeting,
            "",
            "Your full visa readiness report request has been received.",
            "Your premium PDF report is attached.",
            "This is general information only and not migration advice.",
          ].join("\n"),
    attachments: payload.pdfAttachment
      ? [
          {
            filename: "visa-readiness-report.pdf",
            content: Buffer.from(payload.pdfAttachment),
          },
        ]
      : undefined,
  });
}

async function sendReportReadyEmail(payload: {
  email: string;
  fullName: string;
  reportLink: string;
  locale: SupportedLocale;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
  const isTr = payload.locale === "tr";
  const isZh = payload.locale === "zh-Hans";

  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${payload.fullName},`
    : isTr ? "Merhaba," : isZh ? "您好，" : "Hi,";

  const subject = isTr
    ? "LogiVisa AI Hazırlık Raporunuz Hazır 🇦🇺"
    : isZh
      ? "您的 LogiVisa AI 准备度报告已生成 🇦🇺"
      : "Your LogiVisa AI Readiness Report is Ready 🇦🇺";

  const headline = isTr
    ? "Hazırlık Raporunuz<br>Hazır 🇦🇺"
    : isZh
      ? "您的准备度报告<br>已生成 🇦🇺"
      : "Your Readiness Report<br>is Ready 🇦🇺";

  const intro = isTr
    ? "Avustralya PR yol haritası analiziniz tamamlandı. Profilinizi nitelikli göç yolları, puan uygunluğu ve temel risk faktörleri açısından değerlendirdik."
    : isZh
      ? "您的澳大利亚PR路径分析已完成。我们已从技术移民路径、积分资格和关键风险因素等方面评估了您的档案。"
      : "Your AI-generated Australian PR pathway analysis is complete. We've assessed your profile across skilled migration pathways, points eligibility, and key risk factors.";

  const includesLabel = isTr ? "Raporunuz içeriyor" : isZh ? "您的报告包含" : "Your report includes";
  const items = isTr
    ? ["Puan tahmini ve senaryo analizi", "Sıralanmış vize yolu karşılaştırması", "Birincil sınırlayıcı faktör", "Anlık eylem planı"]
    : isZh
      ? ["积分估算与情景分析", "签证路径排名比较", "主要限制因素", "即时行动计划"]
      : ["Points estimation & scenario analysis", "Ranked visa pathway comparison", "Primary limiting factor", "Immediate action plan"];

  const ctaLabel = isTr ? "Tam Raporumu Görüntüle →" : isZh ? "查看完整报告 →" : "View My Full Report →";
  const orCopy = isTr ? "Veya bu bağlantıyı kopyalayın:" : isZh ? "或复制此链接：" : "Or copy this link:";
  const footerText = isTr
    ? "LogiVisa otomatik bir analiz aracıdır ve göçmenlik tavsiyesi sağlamaz. Hukuki danışmanlık için kayıtlı bir MARA acentesiyle görüşün. Bu rapor yalnızca genel bilgi amaçlıdır."
    : isZh
      ? "LogiVisa是一款自动分析工具，不提供移民建议。如需法律建议，请咨询注册MARA顾问。本报告仅供一般信息参考。"
      : "LogiVisa is an automated analysis tool and does not provide migration advice. For legal advice, consult a registered MARA agent. This report is for general information purposes only.";

  const html = `<!DOCTYPE html>
<html lang="${payload.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">

          <!-- Accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#06b6d4,#0284c7);"></td></tr>

          <!-- Brand header -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#06b6d4;letter-spacing:-0.5px;">LogiVisa</p>
              <p style="margin:3px 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#475569;">AI-Powered Australian Migration Intelligence</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 40px 36px;">
              <h1 style="margin:0 0 20px;font-size:30px;font-weight:800;color:#f1f5f9;line-height:1.25;">${headline}</h1>
              <p style="margin:0 0 12px;font-size:16px;color:#94a3b8;line-height:1.3;">${greeting}</p>
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">${intro}</p>

              <!-- Report contents card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background-color:#1e293b;border-radius:12px;border:1px solid #334155;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#06b6d4;">${includesLabel}</p>
                    ${items.map((item) => `<p style="margin:0 0 10px;font-size:14px;color:#cbd5e1;line-height:1.5;">✓ &nbsp;${item}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${payload.reportLink}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0284c7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;letter-spacing:0.2px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;">${orCopy}<br><a href="${payload.reportLink}" style="color:#06b6d4;word-break:break-all;">${payload.reportLink}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#020617;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.7;text-align:center;">${footerText}</p>
              <p style="margin:12px 0 0;font-size:11px;color:#334155;text-align:center;">© 2026 LogiVisa &nbsp;·&nbsp; <a href="https://logivisa.com" style="color:#475569;text-decoration:none;">logivisa.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject,
    html,
  });
}

// ─── Checkout (hybrid free-promo / Stripe, see app/api/checkout/route.ts) ─────
//
// Delegates to the shared /api/checkout endpoint instead of creating a Stripe
// session directly, so this "payment" path and the standalone report-unlock
// button both go through the same first-14-free promo + Stripe fallback
// logic (a single source of truth for the promo quota, instead of two
// checkout implementations drifting apart).

async function createCheckoutSession(input: {
  reportId: string;
  email: string;
  locale: SupportedLocale;
  agentId?: string | null;
}): Promise<{ url: string }> {
  // Must be absolute -- this fetch runs server-side inside a Server Action,
  // where there is no browser location to resolve a relative "/api/checkout"
  // against. Reuses the same env var (and fallback) that /api/checkout's own
  // Stripe success/cancel URLs are built from (lib/stripe.ts's
  // getStripeBaseUrl), so both sides of this call always agree on the host.
  const endpoint = `${getStripeBaseUrl()}/api/checkout`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productType: "premium",
        reportId: input.reportId,
        email: input.email,
        locale: input.locale,
        agentId: input.agentId ?? undefined,
      }),
      cache: "no-store",
    });
  } catch (networkErr) {
    console.error(`[unlockPremiumReport] fetch to ${endpoint} failed`, networkErr);
    throw new Error("Could not reach the checkout service. Please try again.");
  }

  // Read as text first: a 500 from /api/checkout (or a proxy/edge error page
  // in front of it) can come back as HTML, and calling response.json()
  // directly on that throws a SyntaxError that looks identical to every
  // other failure in the caller's catch block -- logging the raw body here
  // is what actually makes a bad deploy/route distinguishable from a normal
  // application error.
  const rawBody = await response.text();
  let payload: { url?: string; error?: string } | null = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    console.error(
      `[unlockPremiumReport] /api/checkout returned non-JSON (status ${response.status}): ${rawBody.slice(0, 500)}`
    );
  }

  if (!response.ok || !payload?.url) {
    console.error(
      `[unlockPremiumReport] /api/checkout failed (status ${response.status}):`,
      payload?.error ?? rawBody.slice(0, 500)
    );
    throw new Error(payload?.error || "Checkout service returned an unexpected response. Please try again.");
  }

  return { url: payload.url };
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function buildQuickPreview(report: ReadinessReport): FullCheckQuickPreview {
  return {
    estimatedPoints:
      report.pointsBoosterSimulator?.currentEstimate ?? report.pointsEstimate?.estimatedPoints,
    pathways: report.pathwayComparison.slice(0, 3).map((item) => ({
      subclass: item.subclass,
      visaName: item.visaName,
      confidenceLevel: item.confidenceLevel,
      reason: item.reason,
    })),
  };
}

function normalizeSubmittedLocale(value: string): SupportedLocale {
  if (value === "tr") return "tr";
  if (value === "zh" || value === "zh-Hans") return "zh-Hans";
  return "en";
}

function resolveTargetCountry(input: {
  submittedCountry: string;
  visaInterest: string;
  mainGoal: string;
}): "AU" | "CA" {
  if (isSupportedCountry(input.submittedCountry)) return input.submittedCountry;

  const combined = `${input.visaInterest} ${input.mainGoal}`.toLowerCase();
  const caSignals = [
    "canada",
    "canadian",
    "express entry",
    "crs",
    "cec",
    "fsw",
    "fstp",
    "pnp",
    "ircc",
    "noc",
    "teer",
    "atlantic immigration",
    "aip",
    "family sponsorship",
    "canada-",
  ];
  const auSignals = [
    "australia",
    "australian",
    "anzsco",
    "mara",
    "189",
    "190",
    "491",
    "state nomination",
  ];

  if (caSignals.some((signal) => combined.includes(signal))) return "CA";
  if (auSignals.some((signal) => combined.includes(signal))) return "AU";

  return defaultCountry;
}

function enforceCountryReportScope(report: ReadinessReport, country: "AU" | "CA"): ReadinessReport {
  const sanitized: ReadinessReport = {
    ...report,
    country,
  };

  if (country === "CA") {
    sanitized.rankedPathways = undefined;
    sanitized.stateNominationTracker = undefined;
    sanitized.lodgementReadyChecklist = undefined;
    sanitized.pathwayComparison = (report.pathwayComparison ?? []).filter(
      (item) => !["189", "190", "491"].includes(item.subclass)
    );

    if (sanitized.pathwayComparison.length === 0) {
      sanitized.pathwayComparison = [
        {
          subclass: "general",
          visaName: report.country === "CA" && report.pathwayComparison?.[0]?.visaName
            ? report.pathwayComparison[0].visaName
            : "Canada Express Entry",
          reason: "Country scope forced to Canada. Australian subclasses were removed.",
          relevance: "needs_more_information",
          confidenceLevel: "low",
          confidenceExplanation: "Country scope is Canada-only and requires more Canada-specific profile detail.",
          difficulty: "medium",
          requirementType: "Canada-only eligibility signals",
          userRelativePosition: "Needs more Canada-specific information",
          keyRequirements: ["CRS signal", "NOC/TEER alignment", "Language test profile"],
          pathwaySpecificRisks: ["Australian pathway data is intentionally excluded."],
        },
      ];
    }
  }

  if (country === "AU") {
    sanitized.pathwayComparison = (report.pathwayComparison ?? []).filter(
      (item) => !["CEC", "FSW", "FSTP", "AIP", "FAMILY_SPONSORSHIP", "PNP"].includes(item.subclass)
    );
  }

  return sanitized;
}

// ─── Server actions ───────────────────────────────────────────────────────────

export async function submitFullCheckWaitlist(
  _prevState: FullCheckWaitlistState,
  formData: FormData
): Promise<FullCheckWaitlistState> {
  const analysisProgressId = String(formData.get("analysisProgressId") ?? "").trim();
  if (analysisProgressId) {
    await initFullCheckProgress(analysisProgressId);
  }

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const visaInterest = String(formData.get("visaInterest") ?? "").trim();
  let migrationGoals: string[] = [];
  try {
    const raw = String(formData.get("migrationGoals") ?? "").trim();
    if (raw) migrationGoals = JSON.parse(raw);
  } catch { /* ignore malformed JSON */ }
  const preferredStateRaw = String(formData.get("preferredState") ?? "").trim();
  const preferredState = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"].includes(preferredStateRaw)
    ? preferredStateRaw
    : undefined;
  const mappedVisas = getVisaSubclassesForGoals(migrationGoals as MigrationGoalId[]);
  const effectiveVisaInterest = visaInterest || mappedVisas.join(",") || "";
  const rawTargetCountry = String(formData.get("targetCountry") ?? "").trim();
  const submittedLocale = String(
    formData.get("routeLocale") ?? formData.get("locale") ?? formData.get("preferredLanguage") ?? ""
  ).trim();
  const resolvedLocale = normalizeSubmittedLocale(submittedLocale);
  const preferredLanguage = resolvedLocale;
  const currentCountry = String(formData.get("currentCountry") ?? "").trim();
  const mainGoal = String(formData.get("mainGoal") ?? "").trim();
  const passportCountry = String(formData.get("passportCountry") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const occupationRaw = String(formData.get("occupation") ?? "").trim();
  const occupation = canonicalizeOccupationInput(occupationRaw);
  const englishLevelRaw = String(formData.get("englishLevel") ?? "").trim();
  const englishLevelOptions = ["none", "competent", "proficient", "superior"];
  const englishLevel = englishLevelOptions.includes(englishLevelRaw) ? englishLevelRaw : "";
  const qualificationLevelRaw = String(formData.get("qualificationLevel") ?? "").trim();
  const qualificationLevels: NonNullable<ReadinessInput["qualificationLevel"]>[] = [
    "High School",
    "Bachelor's Degree",
    "Master's Degree (Coursework)",
    "Master's Degree (Research)",
    "PhD/Doctorate",
    "PhD",
    "Bachelor",
    "Diploma",
    "Certificate",
    "Other",
  ];
  const qualificationLevel = qualificationLevels.includes(
    qualificationLevelRaw as NonNullable<ReadinessInput["qualificationLevel"]>
  )
    ? (qualificationLevelRaw as ReadinessInput["qualificationLevel"])
    : undefined;
  const annualSalaryAudRaw = String(formData.get("annualSalaryAud") ?? "").trim();
  const annualSalaryAud = annualSalaryAudRaw ? Number(annualSalaryAudRaw) : undefined;
  // Skills assessment status — captured from the form radio button
  const skillsAssessmentRaw = String(formData.get("skillsAssessment") ?? "").trim();
  const skillsAssessmentDone = skillsAssessmentRaw === "yes";

  // Bridge: engine uses occupationConfirmed for hasSkillsAssessment check.
  // When skillsAssessment is explicitly answered, override occupationConfirmed
  // so the engine's points calculation reflects the user's actual assessment status.
  let occupationConfirmedRaw = String(formData.get("occupationConfirmed") ?? "").trim();
  if (skillsAssessmentRaw === "yes" || skillsAssessmentRaw === "no") {
    occupationConfirmedRaw = skillsAssessmentDone ? "yes" : "no";
  }

  const qualificationAwardedInAustraliaResult = optionalYesNoSchema.safeParse(
    formData.get("qualificationAwardedInAustralia")
  );
  const qualificationRegionalAustraliaResult = optionalYesNoSchema.safeParse(
    formData.get("qualificationRegionalAustralia")
  );
  const specialistEducationStemResponseResult = optionalYesNoNotSureSchema.safeParse(
    formData.get("specialistEducationStemResponse")
  );
  const qualificationAwardedInAustralia = qualificationAwardedInAustraliaResult.success
    ? qualificationAwardedInAustraliaResult.data === "yes"
      ? true
      : qualificationAwardedInAustraliaResult.data === "no"
        ? false
        : undefined
    : undefined;
  const qualificationRegionalAustralia = qualificationAwardedInAustralia
    ? qualificationRegionalAustraliaResult.success
      ? qualificationRegionalAustraliaResult.data === "yes"
        ? true
        : qualificationRegionalAustraliaResult.data === "no"
          ? false
          : undefined
      : undefined
    : undefined;
  const specialistEducationStemResponse = qualificationAwardedInAustralia
    ? specialistEducationStemResponseResult.success
      ? specialistEducationStemResponseResult.data
      : undefined
    : undefined;

  // ── Overseas Qualification Recognition (shown when isAustralianQual === false) ──
  const isQualificationRecognizedResult = optionalYesNoSchema.safeParse(
    formData.get("isQualificationRecognized")
  );
  const isQualificationRecognized = qualificationAwardedInAustralia === false
    ? isQualificationRecognizedResult.success
      ? isQualificationRecognizedResult.data === "yes"
      : undefined
    : undefined;
  const offshoreExperienceYearsResult = optionalExperienceYearsSchema.safeParse(
    formData.get("offshoreExperienceYears")
  );
  const onshoreExperienceYearsResult = optionalExperienceYearsSchema.safeParse(
    formData.get("onshoreExperienceYears")
  );
  const offshoreExperienceYears = offshoreExperienceYearsResult.success
    ? offshoreExperienceYearsResult.data
    : undefined;
  const onshoreExperienceYears = onshoreExperienceYearsResult.success
    ? onshoreExperienceYearsResult.data
    : undefined;
  const yearsInSponsoredPositionResult = optionalExperienceYearsSchema.safeParse(
    formData.get("yearsInSponsoredPosition")
  );
  const yearsInSponsoredPosition = yearsInSponsoredPositionResult.success
    ? yearsInSponsoredPositionResult.data
    : undefined;
  const nominationStreamResult = optionalNominationStreamSchema.safeParse(
    formData.get("nominationStream")
  );
  const nominationStream = nominationStreamResult.success ? nominationStreamResult.data : undefined;
  const courseName = String(formData.get("courseName") ?? "").trim() || undefined;
  const courseCricosCode = String(formData.get("courseCricosCode") ?? "").trim() || undefined;
  const courseCompletionDate = String(formData.get("courseCompletionDate") ?? "").trim() || undefined;
  const courseCompletionStatusResult = optionalCourseCompletionStatusSchema.safeParse(
    formData.get("courseCompletionStatus")
  );
  const courseCompletionStatus = courseCompletionStatusResult.success ? courseCompletionStatusResult.data : undefined;
  const englishTestTaken = String(formData.get("englishTestTaken") ?? "").trim();
  const occupationConfirmed = occupationConfirmedRaw || String(formData.get("occupationConfirmed") ?? "").trim();
  const hasGraduateVisaPathwayIntentRaw = String(formData.get("hasGraduateVisaPathwayIntent") ?? "").trim();
  const hasGraduateVisaPathwayIntent =
    hasGraduateVisaPathwayIntentRaw === "yes"
      ? true
      : hasGraduateVisaPathwayIntentRaw === "no"
        ? false
        : undefined;
  const estimatedBudgetRange = String(formData.get("estimatedBudgetRange") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();
  const biggestConcern = String(formData.get("biggestConcern") ?? "").trim();
  const nocCode = String(formData.get("nocCode") ?? "").trim() || undefined;
  const nocTeerRaw = String(formData.get("nocTeer") ?? "").trim();
  const nocTeer = nocTeerRaw ? parseInt(nocTeerRaw, 10) : undefined;
  const source = String(formData.get("source") ?? "").trim() || "full_check";
  const targetCountry = resolveTargetCountry({
    submittedCountry: rawTargetCountry,
    visaInterest,
    mainGoal,
  });
  const isAdmin = isAdminWhitelistedEmail(email);

  const isPartner = isPartnerFamilySponsorship(visaInterest);

  const relationshipType = String(formData.get("relationshipType") ?? "").trim();
  const cohabitationDuration = String(formData.get("cohabitationDuration") ?? "").trim();
  const sponsorStatus = String(formData.get("sponsorStatus") ?? "").trim();
  const previousSponsorship = String(formData.get("previousSponsorship") ?? "").trim();
  const applicationLocationPreference = String(formData.get("applicationLocationPreference") ?? "").trim();
  const relationshipEvidence = formData.getAll("relationshipEvidence").map(String);

  let sponsorOrFamily = String(formData.get("sponsorOrFamily") ?? "").trim();
  if (isPartner) {
    const parts = [
      relationshipType ? `Relation: ${relationshipType}` : null,
      cohabitationDuration ? `Duration: ${cohabitationDuration}` : null,
      sponsorStatus ? `Sponsor: ${sponsorStatus}` : null,
      previousSponsorship ? `Prev Sponsor: ${previousSponsorship}` : null,
      applicationLocationPreference ? `Pref: ${applicationLocationPreference}` : null,
      relationshipEvidence.length > 0 ? `Evidence: ${relationshipEvidence.join(", ")}` : null,
    ].filter(Boolean);
    sponsorOrFamily = parts.join(" | ");
  }

  const isTr = resolvedLocale === "tr";
  const isZh = resolvedLocale === "zh-Hans";
  const errors: Record<string, string> = {};

  if (!email) errors.email = isTr ? "E-posta adresi gereklidir." : isZh ? "邮箱为必填项。" : "Email is required.";
  if (email && !isValidEmail(email)) {
    errors.email = isTr ? "Gecerli bir e-posta adresi girin." : isZh ? "请输入有效的邮箱地址。" : "Enter a valid email address.";
  }
  if (!passportCountry) {
    errors.passportCountry = isTr ? "Pasaport ulkesi gereklidir." : isZh ? "护照国家为必填项。" : "Passport country is required.";
  }
  if (!age) errors.age = isTr ? "Yas gereklidir." : isZh ? "年龄为必填项。" : "Age is required.";
  // mainGoal is optional — users may not know their target yet
  if (!fullName) errors.fullName = isTr ? "Ad soyad gereklidir." : isZh ? "姓名为必填项。" : "Full name is required.";
  if (!currentCountry) errors.currentCountry = isTr ? "Bulundugunuz ulke gereklidir." : isZh ? "当前国家为必填项。" : "Current country is required.";

  if (!isPartner && !occupation) errors.occupation = isTr ? "Meslek gereklidir." : isZh ? "职业为必填项。" : "Occupation is required.";
  if (!isPartner && !qualificationLevel) {
    errors.qualificationLevel = isTr
      ? "Egitim seviyesi gereklidir."
      : isZh
        ? "学历为必填项。"
        : "Education level is required.";
  }
  if (!isPartner && !englishLevel) {
    errors.englishLevel = isTr
      ? "Ingilizce seviyesi gereklidir."
      : isZh
        ? "英语水平为必填项。"
        : "English level is required.";
  }
  if (!isPartner && !sponsorOrFamily) {
    errors.sponsorOrFamily = isTr
      ? "Sponsor/aile durumu gereklidir."
      : isZh
        ? "担保/家庭情况为必填项。"
        : "Sponsor/family status is required.";
  }
  if (!isPartner && targetCountry === "AU") {
    if (!annualSalaryAudRaw) {
      errors.annualSalaryAud = isTr
        ? "Yillik maas (AUD) gereklidir."
        : isZh
          ? "年薪（AUD）为必填项。"
          : "Annual salary (AUD) is required.";
    } else if (!Number.isFinite(annualSalaryAud) || (annualSalaryAud ?? 0) <= 0) {
      errors.annualSalaryAud = isTr
        ? "Gecerli bir yillik maas girin."
        : isZh
          ? "请输入有效的年薪数值。"
          : "Enter a valid annual salary amount.";
    }
  }
  if (!isPartner && !offshoreExperienceYearsResult.success) {
    errors.offshoreExperienceYears = isTr
      ? "Yurt disi deneyim yili 0 veya daha buyuk bir sayi olmalidir."
      : isZh
        ? "境外工作年限必须是大于或等于 0 的数字。"
        : "Offshore experience years must be a number greater than or equal to 0.";
  }
  if (!isPartner && !onshoreExperienceYearsResult.success) {
    errors.onshoreExperienceYears = isTr
      ? "Avustralya deneyim yili 0 veya daha buyuk bir sayi olmalidir."
      : isZh
        ? "澳大利亚境内工作年限必须是大于或等于 0 的数字。"
        : "Onshore experience years must be a number greater than or equal to 0.";
  }
  if (!isPartner && !qualificationAwardedInAustraliaResult.success) {
    errors.qualificationAwardedInAustralia = isTr
      ? "Bu alan zorunludur. Evet veya Hayır seçin."
      : isZh
        ? "此项为必填。请选择是或否。"
        : "This field is required. Please select Yes or No.";
  }
  if (!isPartner && qualificationAwardedInAustralia === true && !qualificationRegionalAustraliaResult.success) {
    errors.qualificationRegionalAustralia = isTr
      ? "Bölgesel kampüs bilgisi geçersiz."
      : isZh
        ? "偏远地区校区答案无效。"
        : "Regional Australia answer is invalid.";
  }
  if (!isPartner && qualificationAwardedInAustralia === false && !isQualificationRecognizedResult.success) {
    errors.isQualificationRecognized = isTr
      ? "Bu alan zorunludur. Evet veya Hayır seçin."
      : isZh
        ? "此项为必填。请选择是或否。"
        : "This field is required. Please select Yes or No.";
  }
  if (qualificationAwardedInAustralia === true) {
    const isResearchOrDoctorateQualification =
      qualificationLevel === "Master's Degree (Research)" ||
      qualificationLevel === "PhD/Doctorate" ||
      qualificationLevel === "PhD";
    if (isResearchOrDoctorateQualification && !specialistEducationStemResponseResult.success) {
      errors.specialistEducationStemResponse = isTr
        ? "Uzmanlık eğitimi alanı yanıtı geçersiz."
        : isZh
          ? "专业教育领域答案无效。"
          : "Specialist education field answer is invalid.";
    }
  }

  if (Object.keys(errors).length > 0) {
    if (analysisProgressId) {
      await failFullCheckProgress(analysisProgressId, "Validation failed");
    }
    return {
      status: "error",
      errors,
      message: isTr
        ? "Yapilandirilmis bir rapor icin daha fazla bilgi gereklidir."
        : isZh
          ? "需要更多信息以生成结构化报告。"
          : "More information required for a structured report.",
    };
  }

  // ── Anti-Abuse: Email duplicate check ──────────────────────────────────────
  if (!isAdmin) {
    const existingReport = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM user_reports WHERE email = $1 LIMIT 1`,
      email
    );
    if (existingReport.length > 0) {
      if (analysisProgressId) {
        await failFullCheckProgress(analysisProgressId, "Duplicate email");
      }
      return {
        status: "error",
        message: isTr
          ? "Bu e-posta ile daha önce rapor oluşturulmuş. E-postanızı kontrol edin."
          : isZh
            ? "该邮箱已生成过报告，请检查您的邮箱。"
            : "You have already generated a report. Check your email.",
      };
    }
  }

  // ── Anti-Abuse: IP rate limit (1 per 24 hours) ────────────────────────────
  const clientIp = await getClientIp();
  if (!isAdmin && clientIp !== "unknown") {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentIpReports = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM user_reports WHERE ip_address = $1 AND created_at > $2 LIMIT 2`,
      clientIp,
      twentyFourHoursAgo
    );
    if (recentIpReports.length >= 1) {
      if (analysisProgressId) {
        await failFullCheckProgress(analysisProgressId, "IP rate limited");
      }
      return {
        status: "error",
        message: isTr
          ? "Bu IP adresinden son 24 saatte rapor oluşturulmuş. Lütfen daha sonra tekrar deneyin."
          : isZh
            ? "该IP地址在24小时内已生成报告，请稍后再试。"
            : "A report has already been generated from this IP address in the last 24 hours. Please try again later.",
      };
    }
  }

  const leadQuality = buildLeadQuality({
    locale: resolvedLocale,
    mainGoal,
    currentCountry: currentCountry || undefined,
    passportCountry,
    age,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    englishTestTaken: englishTestTaken || undefined,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: effectiveVisaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  // ── Dynamic free beta status ──────────────────────────────────────────────
  const betaStatus = await getFreeBetaStatus();

  // ── Atomic usage counter ──────────────────────────────────────────────────
  if (isAdmin) {
    // Admin test runs bypass free quota checks and do not consume usage count.
  } else if (betaStatus.isFreeActive) {
    if (betaStatus.usageTrackingUnavailable) {
      // Degrade gracefully when production DB is missing full_check_usage.
      console.warn("Skipping full_check_usage increment because table is unavailable.");
    } else {
      // Atomically increment only when under limit
      try {
        const atomicResult = await db.execute(sql`
          UPDATE full_check_usage
          SET free_reports_used = free_reports_used + 1, updated_at = NOW()
          WHERE id = 1
            AND is_free_active = TRUE
            AND free_reports_used < ${betaStatus.freeLimit}
          RETURNING free_reports_used
        `);

        if (atomicResult.rows.length === 0) {
          // Limit just got exhausted between check and update — fall through to payment
          if (analysisProgressId) {
            await failFullCheckProgress(analysisProgressId, "Free access limit reached");
          }
          return {
            status: "error",
            error: "Free access limit reached",
            message: isTr
              ? "Ücretsiz rapor limiti doldu. Devam etmek için ödeme yapın."
              : isZh
                ? "免费报告额度已用完。请付费继续。"
                : "Free report limit reached. Please pay to continue.",
            requirePayment: true,
          };
        }

        revalidateTag("public-full-check-usage", "max");
      } catch (error) {
        if (!isMissingRelationError(error, "full_check_usage")) {
          throw error;
        }
        console.warn("Skipping full_check_usage increment after missing table error.");
      }
    }
  } else {
    // Free beta is exhausted — require payment
    if (analysisProgressId) {
      await failFullCheckProgress(analysisProgressId, "Free access limit reached");
    }
    return {
      status: "error",
      error: "Free access limit reached",
      message: isTr
        ? "Ücretsiz rapor limiti doldu. Devam etmek için ödeme yapın."
        : isZh
          ? "免费报告额度已用完。请付费继续。"
          : "Free report limit reached. Please pay to continue.",
      requirePayment: true,
    };
  }

  const suppressNotifications = await hasRecentSubmission(email, source);

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "scanning_occupations");
  }

  // Live state-nomination status/citations + real occupation-list
  // membership (see lib/state-intelligence.ts and app/api/cron/sync-states)
  // -- runReadinessEngine itself stays synchronous, so these DB reads have
  // to happen here, before calling it. Neither throws; both degrade to the
  // static-data fallback on failure.
  const [stateIntelligence, stateOccupationMatches] = await Promise.all([
    getStateIntelligenceMap(),
    getStateOccupationMatches(occupation || undefined),
  ]);

  const generatedReport = ensureCountrySpecificReportSchema(
    runReadinessEngine({
      locale: resolvedLocale,
      country: targetCountry,
      mainGoal,
      currentCountry: currentCountry || undefined,
      passportCountry,
      age,
      occupation: occupation || undefined,
      stateIntelligence,
      stateOccupationMatches,
      englishLevel: englishLevel || undefined,
      qualificationLevel,
      annualSalaryAud: annualSalaryAud !== undefined && Number.isFinite(annualSalaryAud)
        ? annualSalaryAud
        : undefined,
      migrationGoals: migrationGoals.length > 0 ? migrationGoals : undefined,
      preferredState,
      qualificationAwardedInAustralia,
      qualificationRegionalAustralia,
      specialistEducationStemResponse,
      isQualificationRecognized,
      offshoreExperienceYears,
      onshoreExperienceYears,
      yearsInSponsoredPosition,
      nominationStream,
      isLabourAgreementEmployer: formData.get("isLabourAgreementEmployer") === "on" || undefined,
      courseName,
      courseCricosCode,
      courseCompletionStatus,
      courseCompletionDate,
      englishTestTaken: englishTestTaken || undefined,
      occupationConfirmed: occupationConfirmed || undefined,
      hasGraduateVisaPathwayIntent,
      estimatedBudgetRange: estimatedBudgetRange || undefined,
      timeline: timeline || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      preferredPathway: effectiveVisaInterest || undefined,
      biggestConcern: biggestConcern || undefined,
      nocCode: nocCode || undefined,
      nocTeer: nocTeer !== undefined && !isNaN(nocTeer) ? nocTeer : undefined,
    }),
    targetCountry
  );

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "analyzing_trends");
  }

  try {
    await db.insert(fullCheckWaitlist).values({
      email,
      full_name: fullName || null,
      visa_interest: visaInterest || null,
      preferred_language: preferredLanguage || null,
      current_country: currentCountry || null,
      passport_country: passportCountry,
      age,
      occupation: occupation || null,
      english_level: englishLevel || null,
      english_test_taken: englishTestTaken || null,
      occupation_confirmed: occupationConfirmed || null,
      estimated_budget_range: estimatedBudgetRange || null,
      timeline: timeline || null,
      qualification_awarded_in_australia: qualificationAwardedInAustralia ?? null,
      qualification_regional_australia: qualificationRegionalAustralia ?? null,
      specialist_education_stem_response: specialistEducationStemResponse ?? null,
      offshore_experience_years: offshoreExperienceYears ?? null,
      onshore_experience_years: onshoreExperienceYears ?? null,
      sponsor_or_family: sponsorOrFamily || null,
      biggest_concern: biggestConcern || null,
      main_goal: mainGoal,
      lead_score: leadQuality.leadScore,
      lead_tier: leadQuality.leadTier,
      source,
    });
  } catch (error) {
    if (!isMissingRelationError(error, "full_check_waitlist")) {
      throw error;
    }
    console.warn("full_check_waitlist table missing; skipping waitlist persistence.");
  }
  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "applying_deductions");
  }

  const readinessInputForReport: ReadinessInput = {
    locale: resolvedLocale,
    country: targetCountry,
    mainGoal,
    currentCountry: currentCountry || undefined,
    passportCountry,
    age,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    qualificationLevel,
    annualSalaryAud: annualSalaryAud !== undefined && Number.isFinite(annualSalaryAud)
      ? annualSalaryAud
      : undefined,
    qualificationAwardedInAustralia,
    qualificationRegionalAustralia,
    specialistEducationStemResponse,
    offshoreExperienceYears,
    onshoreExperienceYears,
    yearsInSponsoredPosition,
    nominationStream,
    courseName,
    courseCricosCode,
    courseCompletionStatus,
    courseCompletionDate,
    englishTestTaken: englishTestTaken || undefined,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: effectiveVisaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  };

  const internalLeadTier = computeInternalLeadTier(readinessInputForReport, generatedReport.assessmentState);
  const referralAgent = await resolveReferralAgent();

  const reportRecord = await createUserReport({
    fullName,
    email,
    preferredPath: effectiveVisaInterest || undefined,
    source,
    locale: resolvedLocale,
    leadScore: leadQuality.leadScore,
    leadTier: leadQuality.leadTier,
    pointsTier: internalLeadTier,
    report: generatedReport,
    ipAddress: clientIp !== "unknown" ? clientIp : undefined,
    input: readinessInputForReport,
    // Affiliate/referral auto-assignment: skips the manual pool entirely
    // when a valid agent ?ref= cookie is present.
    agentId: referralAgent?.id,
    assignedViaRef: Boolean(referralAgent),
  });

  // Best-effort: the lead is already persisted and (if applicable) assigned
  // above, so a broken RESEND_API_KEY or a send failure here must never fail
  // the submission the visitor is waiting on.
  if (referralAgent) {
    try {
      await sendAgentAssignedEmail({
        agentEmail: referralAgent.email,
        agentName: referralAgent.name,
        leadName: fullName || email,
        status: "New",
      });
    } catch (error) {
      console.error("[full-check] Referral assignment email failed (non-blocking):", error);
    }
  }

  try {
    await db.insert(leads).values({
      source,
      full_name: fullName || null,
      email,
      preferred_language: preferredLanguage || null,
      current_country: currentCountry || null,
      passport_country: passportCountry,
      age,
      occupation: occupation || null,
      english_level: englishLevel || null,
      english_test_taken: englishTestTaken || null,
      occupation_confirmed: occupationConfirmed || null,
      estimated_budget_range: estimatedBudgetRange || null,
      timeline: timeline || null,
      qualification_awarded_in_australia: qualificationAwardedInAustralia ?? null,
      qualification_regional_australia: qualificationRegionalAustralia ?? null,
      specialist_education_stem_response: specialistEducationStemResponse ?? null,
      offshore_experience_years: offshoreExperienceYears ?? null,
      onshore_experience_years: onshoreExperienceYears ?? null,
      sponsor_or_family: sponsorOrFamily || null,
      biggest_concern: biggestConcern || null,
      main_goal: mainGoal,
      selected_visa:
        ((generatedReport.rankedPathways?.[0]?.subclass ??
          generatedReport.pathwayComparison[0]?.subclass ??
          visaInterest) || null),
      system_score: generatedReport.rankedPathways?.[0]?.matchPercentage ?? null,
      lead_score: leadQuality.leadScore,
      lead_tier: leadQuality.leadTier,
      report_id: reportRecord.id,
      report_locale: resolvedLocale,
    });
  } catch (error) {
    if (!isMissingRelationError(error, "leads")) {
      throw error;
    }
    console.warn("leads table missing; skipping lead persistence.");
  }

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "generating_report");
  }

  // Fire the user confirmation and admin notification concurrently rather
  // than sequentially, so neither email's latency stacks onto the other's —
  // this whole block is deliberately not awaited before the response below,
  // so email delivery never blocks the user-facing response time.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://logivisa.com";
  const reportLink = `${baseUrl}/${resolvedLocale}/full-check/result?reportId=${reportRecord.id}`;

  Promise.all([
    suppressNotifications
      ? Promise.resolve()
      : sendFullCheckAdminEmail({
          fullName,
          email,
          visaInterest,
          preferredLanguage,
          currentCountry,
          passportCountry,
          age,
          occupation,
          englishLevel,
          englishTestTaken,
          occupationConfirmed,
          estimatedBudgetRange,
          timeline,
          qualificationAwardedInAustralia,
          qualificationRegionalAustralia,
          specialistEducationStemResponse,
          offshoreExperienceYears,
          onshoreExperienceYears,
          sponsorOrFamily,
          biggestConcern,
          mainGoal,
          source,
        }).catch((err) => console.error("Admin email failed (non-blocking):", err)),
    sendReportReadyEmail({
      email,
      fullName,
      reportLink,
      locale: resolvedLocale,
    }).catch((err) => console.error("Customer report email failed (non-blocking):", err)),
    internalLeadTier === "Cold"
      ? Promise.resolve()
      : sendInternalLeadTierEmail({
          tier: internalLeadTier,
          fullName,
          email,
          phone: undefined, // not collected at initial submission — surfaced as "Not yet provided"
          occupationDisplay: resolveOccupationDisplayName(occupation, resolvedLocale),
          country: targetCountry,
          preferredPathway: visaInterest,
          estimatedPoints: generatedReport.assessmentState.estimatedPoints,
          englishLevel,
          englishTestTaken,
          reportLink,
        })
          .then((sent) => (sent ? markInternalLeadEmailSent(reportRecord.id) : undefined))
          .catch((err) => console.error("Internal lead-tier email failed (non-blocking):", err)),
  ]);

  if (analysisProgressId) {
    await completeFullCheckProgress(analysisProgressId);
  }

  return {
    status: "success",
    message: isTr
      ? "Hizli sonuclar hazir. Tam rapor icin kilidi acin."
      : isZh
        ? "快速结果已生成。解锁后可查看完整报告。"
        : "Quick results are ready. Unlock to access the full report.",
    preview: buildQuickPreview(generatedReport),
    reportId: reportRecord.id,
    userInput: {
      name: fullName || undefined,
      email,
      mainGoal,
      currentCountry: currentCountry || undefined,
      passportCountry,
      age,
      qualificationLevel,
      annualSalaryAud: annualSalaryAudRaw || undefined,
      occupation: occupation || undefined,
      englishLevel: englishLevel || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      biggestConcern: biggestConcern || undefined,
    },
  };
}

// Public entry point: guarantees the action always settles with a defined
// PremiumUnlockState rather than rejecting. useActionState's `pending` flag
// only flips back to false when the action's promise settles either way, but
// an uncaught throw here (from any of the several DB/PDF/email calls in
// unlockPremiumReportInternal, including markUserReportUnlocked at the very
// end, which had no error handling of its own) surfaces as an unhandled
// server-action rejection instead of a graceful { status: "error" } the form
// can render -- functionally indistinguishable from a stuck submit button.
export async function unlockPremiumReport(
  prevState: PremiumUnlockState,
  formData: FormData
): Promise<PremiumUnlockState> {
  console.log("🚀 UNLOCK ACTION TETİKLENDİ. Gelen payload:", {
    prevStateStatus: prevState.status,
    reportId: formData.get("reportId"),
    email: formData.get("email"),
    unlockMethod: formData.get("unlockMethod"),
  });
  try {
    return await unlockPremiumReportInternal(prevState, formData);
  } catch (err) {
    console.error(
      "unlockPremiumReport: unexpected failure",
      err instanceof Error ? { message: err.message, stack: err.stack } : err
    );
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }
}

async function unlockPremiumReportInternal(
  _prevState: PremiumUnlockState,
  formData: FormData
): Promise<PremiumUnlockState> {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const unlockMethodRaw = String(formData.get("unlockMethod") ?? "lead_capture").trim();
  const unlockMethod: "payment" | "lead_capture" =
    unlockMethodRaw === "payment" ? "payment" : "lead_capture";

  console.log("unlockPremiumReportInternal: parsed formData", { reportId, email, unlockMethod });

  const errors: Record<string, string> = {};
  if (!reportId) errors.reportId = "Missing report id.";
  if (!email) errors.email = "Email is required.";
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    console.error("unlockPremiumReportInternal: early return -- validation failed", errors);
    return {
      status: "error",
      errors,
      message: errors.reportId
        ? "Missing report id. Please refresh the page and try again."
        : "Please fix the highlighted fields.",
    };
  }

  console.log("Adım 1: Validasyon geçti, DB'den rapor okunuyor", { reportId });
  const record = await getUserReportById(reportId);
  if (!record) {
    console.error("unlockPremiumReportInternal: early return -- report not found", { reportId });
    return { status: "error", message: "Report could not be found. Please submit the form again." };
  }
  console.log("Adım 1 tamam: DB okundu", { reportId, email: record.email, locale: record.locale });

  const isAdmin = isAdminWhitelistedEmail(email);

  const betaStatus = await getFreeBetaStatus();
  const freeBeta = betaStatus.isFreeActive;
  console.log("Adım 2: Stripe gate değerlendiriliyor", { isAdmin, freeBeta, unlockMethod });

  // ── Stripe gate ───────────────────────────────────────────────────────────
  // Active when free limit is exhausted OR user explicitly chooses payment
  if (!isAdmin && (!freeBeta || unlockMethod === "payment")) {
    if (unlockMethod === "payment" || !freeBeta) {
      try {
        const locale = (record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en") as SupportedLocale;
        console.log("Adım 3: /api/checkout fetch başlatılıyor", { reportId, locale });
        const { url } = await createCheckoutSession({ reportId, email, locale, agentId: record.agentId });
        // Not calling next/navigation's redirect() here on purpose: this
        // branch runs inside unlockPremiumReportInternal, which the exported
        // unlockPremiumReport wraps in a blanket try/catch (see comment
        // above) so a rejected server action always settles instead of
        // throwing. redirect() works by throwing a special NEXT_REDIRECT
        // error for the framework to catch -- that blanket catch would
        // swallow it as a normal failure before it ever reaches the client.
        // Returning the URL and letting the client component navigate
        // (PremiumFeatureGate's useEffect on state.redirectUrl) sidesteps
        // that trap entirely.
        return {
          status: "redirect",
          redirectUrl: url,
        };
      } catch (err) {
        console.error("unlockPremiumReport: /api/checkout request failed", err);
        // createCheckoutSession only ever throws Errors with a user-safe
        // message (network failure, non-2xx, bad JSON) -- surface it so the
        // error banner in PremiumFeatureGate tells the user (and us, via
        // screenshots/support tickets) *why* it failed instead of a generic
        // "something's wrong, try again" that looks identical for every
        // possible cause.
        return {
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Payment processing is temporarily unavailable. Please try again later.",
        };
      }
    }
  }

  console.log("Adım 2 sonucu: Stripe gate atlandı, ücretsiz/lead-capture yoluna devam ediliyor", {
    isAdmin,
    freeBeta,
    unlockMethod,
  });

  // ── Effective unlock method ───────────────────────────────────────────────
  const effectiveUnlockMethod: UnlockMethod = isAdmin || freeBeta ? "beta_free" : "lead_capture";

  // ── PDF generation & email delivery ──────────────────────────────────────
  const emailEnabled = isEmailDeliveryEnabled();
  const simulateEmailDelivery = process.env.SIMULATE_EMAIL_DELIVERY === "true";
  let pdfSent = false;

  if (simulateEmailDelivery) {
    pdfSent = true;
    console.log(`[simulate] PDF email delivery for report ${reportId} → ${email}`);
  } else if (emailEnabled) {
    let pdfBytes: Uint8Array;

    try {
      // ── Fetch viability data from invitation rounds & state allocations ──
      let viabilityData: {
        cutoffScore: number;
        roundDate: string;
        totalInvited: number;
        occupationTitle: string;
        gap: number;
        viability: "strong" | "viable" | "borderline" | "below_threshold";
        stateAllocation?: {
          state: string;
          visaSubclass: string;
          allocation: number;
          nominationsUsed?: number | null;
        } | null;
      } | null = null;

      // Preferred state for 190/491 nomination
      const preferredState = record.input.preferredState;
      const targetedStateNomination = (record.input.migrationGoals ?? []).some(
        (g) => g === "direct_pr" || g === "regional"
      );

      try {
        const occupation = record.input.occupation;
        const calculatedPoints = record.report.pointsEstimate?.estimatedPoints ?? 0;

        // Fetch state allocation for the preferred state (190/491)
        if (preferredState && targetedStateNomination) {
          const subclass = (record.input.migrationGoals ?? []).includes("regional")
            ? "491"
            : "190";
          const stateAlloc = await prisma.stateAllocation.findUnique({
            where: {
              programYear_state_visaSubclass: {
                programYear: "2025-26",
                state: preferredState,
                visaSubclass: subclass,
              },
            },
          });
          if (stateAlloc) {
            viabilityData = {
              cutoffScore: 0,
              roundDate: "2026-06",
              totalInvited: 0,
              occupationTitle: occupation ?? "your occupation",
              gap: 0,
              viability: "viable",
              stateAllocation: {
                state: stateAlloc.state,
                visaSubclass: stateAlloc.visaSubclass,
                allocation: stateAlloc.allocation,
                nominationsUsed: stateAlloc.nominationsUsed,
              },
            };
          }
        }

        // Fetch federal 189 cutoff only when not already resolved via state
        if (occupation && !viabilityData) {
          const occRecord = await prisma.occupation.findFirst({
            where: {
              OR: [
                { anzscoCode: occupation },
                { title: { contains: occupation, mode: "insensitive" } },
              ],
            },
          });

          if (occRecord) {
            const cutoff = await prisma.roundCutoff.findFirst({
              where: {
                occupationId: occRecord.id,
                round: { visaSubclass: "189" },
              },
              include: { round: true },
              orderBy: { round: { date: "desc" } },
            });

            if (cutoff) {
              const gap = calculatedPoints - cutoff.minimumScore;
              viabilityData = {
                cutoffScore: cutoff.minimumScore,
                roundDate: cutoff.round.date.toISOString().split("T")[0],
                totalInvited: cutoff.round.totalInvited,
                occupationTitle: occRecord.title,
                gap,
                viability:
                  gap >= 10 ? "strong"
                    : gap >= 0 ? "viable"
                    : gap >= -5 ? "borderline"
                    : "below_threshold",
              };
            }
          }
        }
      } catch (viabilityErr) {
        console.warn("Viability lookup failed (non-fatal):", viabilityErr);
      }

      pdfBytes = await generateReadinessPDF({
        report: record.report,
        locale: record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en",
        saveToFile: false,
        userInputSummary: {
          name: fullName || undefined,
          email,
          mainGoal: record.input.mainGoal,
          currentCountry: record.input.currentCountry,
          passportCountry: record.input.passportCountry,
          age: record.input.age,
          occupation: record.input.occupation,
          englishLevel: record.input.englishLevel,
          sponsorOrFamily: record.input.sponsorOrFamily,
          biggestConcern: record.input.biggestConcern,
          annualSalaryAud: record.input.annualSalaryAud != null ? String(record.input.annualSalaryAud) : null,
          migrationGoals: record.input.migrationGoals,
          preferredState: record.input.preferredState,
          skillsAssessmentDone: String(formData.get("skillsAssessment") ?? "").trim() === "yes",
          isAustralianQualification: record.input.qualificationAwardedInAustralia,
          isQualificationRecognized: record.input.isQualificationRecognized,
          viability: viabilityData,
        },
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      return {
        status: "error",
        message: "PDF generation failed. Please try again.",
      };
    }

    try {
      await sendFullCheckConfirmationEmail({
        email,
        fullName,
        locale: record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en",
        pdfAttachment: pdfBytes,
      });
      pdfSent = true;
    } catch (err) {
      console.error("Email delivery failed:", err);
      return {
        status: "error",
        message: "Report is ready but email delivery failed. Please contact support.",
      };
    }
  }

  await markUserReportUnlocked({
    reportId,
    email,
    phone: phone || undefined,
    unlockMethod: effectiveUnlockMethod,
    pdfSent,
  });

  return {
    status: "success",
    message: freeBeta
      ? "Full report unlocked. PDF sent to your email."
      : "Details received. Full report unlocked and PDF sent.",
    report: record.report,
    userInput: {
      name: fullName || undefined,
      email,
      mainGoal: record.input.mainGoal,
      currentCountry: record.input.currentCountry,
      passportCountry: record.input.passportCountry,
      age: record.input.age,
      qualificationLevel: record.input.qualificationLevel,
      annualSalaryAud:
        typeof record.input.annualSalaryAud === "number"
          ? String(record.input.annualSalaryAud)
          : undefined,
      occupation: record.input.occupation,
      englishLevel: record.input.englishLevel,
      sponsorOrFamily: record.input.sponsorOrFamily,
      biggestConcern: record.input.biggestConcern,
    },
  };
}

export async function resetUserReportLimit(email: string, adminSecret: string): Promise<AdminResetState> {
  const normalizedEmail = email.trim().toLowerCase();
  const providedSecret = adminSecret.trim();
  const expectedSecret = process.env.ADMIN_SECRET?.trim() ?? "";

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return {
      status: "error",
      message: "Enter a valid email address.",
    };
  }

  if (!expectedSecret) {
    return {
      status: "error",
      message: "ADMIN_SECRET is not configured.",
    };
  }

  if (providedSecret !== expectedSecret) {
    return {
      status: "error",
      message: "Invalid admin secret.",
    };
  }

  const deleted = await prisma.userReport.deleteMany({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  return {
    status: "success",
    message:
      deleted.count > 0
        ? `Reset complete. Deleted ${deleted.count} report record(s).`
        : "No report record found for this email.",
    deletedCount: deleted.count,
  };
}

export async function resetUserReportLimitFromForm(
  _prevState: AdminResetState,
  formData: FormData
): Promise<AdminResetState> {
  const email = String(formData.get("email") ?? "");
  const adminSecret = String(formData.get("adminSecret") ?? "");
  return resetUserReportLimit(email, adminSecret);
}
