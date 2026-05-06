"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Stripe from "stripe";
import { Resend } from "resend";

import { db } from "@/db";
import { fullCheckUsage, fullCheckWaitlist, leads } from "@/db/schema";
import { prisma } from "@/lib/prisma";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import {
  completeFullCheckProgress,
  failFullCheckProgress,
  initFullCheckProgress,
  updateFullCheckProgress,
} from "@/lib/full-check-progress";
import { buildLeadQuality, runReadinessEngine } from "@/src/lib/readiness-engine";
import type { ReadinessReport } from "@/lib/readiness/types";
import {
  createUserReport,
  getUserReportById,
  markUserReportUnlocked,
  type UnlockMethod,
} from "@/src/lib/user-reports";

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
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
  };
};

export type PremiumUnlockState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  report?: ReadinessReport;
  userInput?: {
    name?: string;
    email?: string;
    mainGoal?: string;
    currentCountry?: string;
    passportCountry?: string;
    age?: string;
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
  };
};

// ─── Feature flags ────────────────────────────────────────────────────────────

type FreeBetaStatus = {
  isFreeActive: boolean;
  freeReportsUsed: number;
  freeLimit: number;
};

async function getFreeBetaStatus(): Promise<FreeBetaStatus> {
  const rows = await db
    .select()
    .from(fullCheckUsage)
    .where(eq(fullCheckUsage.id, 1))
    .limit(1);

  const row = rows[0];
  if (!row) return { isFreeActive: false, freeReportsUsed: 0, freeLimit: 500 };

  const maxFree = parseInt(process.env.MAX_FREE_REPORTS ?? "500", 10);
  const used = row.free_reports_used ?? 0;
  const active = row.is_free_active === true && used < maxFree;

  return { isFreeActive: active, freeReportsUsed: used, freeLimit: maxFree };
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

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

async function hasRecentSubmission(email: string, source: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
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
  sponsorOrFamily: string;
  biggestConcern: string;
  mainGoal: string;
  source: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.FULL_CHECK_NOTIFICATION_EMAIL || process.env.REFERRAL_NOTIFICATION_EMAIL;

  if (!apiKey || !notificationEmail) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
  const bodyLines = [
    "A new full readiness report lead has been submitted.",
    "",
    `full name: ${payload.fullName || "-"}`,
    `email: ${payload.email}`,
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
    `sponsor/family: ${payload.sponsorOrFamily || "-"}`,
    `biggest concern: ${payload.biggestConcern || "-"}`,
    `main goal: ${payload.mainGoal}`,
    `source: ${payload.source}`,
  ];

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: "New full readiness report lead",
    text: bodyLines.join("\n"),
  });
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

// ─── Stripe checkout (active when IS_FREE_BETA = false) ───────────────────────

async function createStripeCheckoutSession(input: {
  reportId: string;
  email: string;
  locale: SupportedLocale;
}): Promise<{ url: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_REPORT_PRICE_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!priceId) throw new Error("STRIPE_REPORT_PRICE_ID is not configured.");

  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: input.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "payment",
    success_url: `${baseUrl}/${input.locale}/full-check?payment=success&reportId=${input.reportId}`,
    cancel_url: `${baseUrl}/${input.locale}/full-check?payment=cancelled`,
    metadata: { reportId: input.reportId, email: input.email },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url };
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
  const submittedLocale = String(formData.get("locale") ?? formData.get("preferredLanguage") ?? "").trim();
  const resolvedLocale = normalizeSubmittedLocale(submittedLocale);
  const preferredLanguage = resolvedLocale;
  const currentCountry = String(formData.get("currentCountry") ?? "").trim();
  const mainGoal = String(formData.get("mainGoal") ?? "").trim();
  const passportCountry = String(formData.get("passportCountry") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const englishLevel = String(formData.get("englishLevel") ?? "").trim();
  const englishTestTaken = String(formData.get("englishTestTaken") ?? "").trim();
  const occupationConfirmed = String(formData.get("occupationConfirmed") ?? "").trim();
  const estimatedBudgetRange = String(formData.get("estimatedBudgetRange") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();
  const sponsorOrFamily = String(formData.get("sponsorOrFamily") ?? "").trim();
  const biggestConcern = String(formData.get("biggestConcern") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "full_check";

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
  if (!mainGoal) errors.mainGoal = isTr ? "Ana hedef gereklidir." : isZh ? "主要目标为必填项。" : "Main goal is required.";

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

  // ── Anti-Abuse: IP rate limit (1 per 24 hours) ────────────────────────────
  const clientIp = await getClientIp();
  if (clientIp !== "unknown") {
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
    preferredPathway: visaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  // ── Dynamic free beta status ──────────────────────────────────────────────
  const betaStatus = await getFreeBetaStatus();

  // ── Atomic usage counter ──────────────────────────────────────────────────
  if (betaStatus.isFreeActive) {
    // Atomically increment only when under limit
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

  const generatedReport = runReadinessEngine({
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
    preferredPathway: visaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "analyzing_trends");
  }

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
    sponsor_or_family: sponsorOrFamily || null,
    biggest_concern: biggestConcern || null,
    main_goal: mainGoal,
    lead_score: leadQuality.leadScore,
    lead_tier: leadQuality.leadTier,
    source,
  });
  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "applying_deductions");
  }

  const reportRecord = await createUserReport({
    fullName,
    email,
    preferredPath: visaInterest || undefined,
    source,
    locale: resolvedLocale,
    leadScore: leadQuality.leadScore,
    leadTier: leadQuality.leadTier,
    report: generatedReport,
    ipAddress: clientIp !== "unknown" ? clientIp : undefined,
    input: {
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
      preferredPathway: visaInterest || undefined,
      biggestConcern: biggestConcern || undefined,
    },
  });

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

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "generating_report");
  }

  if (!suppressNotifications) {
    sendFullCheckAdminEmail({
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
      sponsorOrFamily,
      biggestConcern,
      mainGoal,
      source,
    }).catch((err) => console.error("Admin email failed (non-blocking):", err));
  }

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
      occupation: occupation || undefined,
      englishLevel: englishLevel || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      biggestConcern: biggestConcern || undefined,
    },
  };
}

export async function unlockPremiumReport(
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

  const errors: Record<string, string> = {};
  if (!reportId) errors.reportId = "Missing report id.";
  if (!email) errors.email = "Email is required.";
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, message: "Please fix the highlighted fields." };
  }

  const record = await getUserReportById(reportId);
  if (!record) {
    return { status: "error", message: "Report could not be found. Please submit the form again." };
  }

  const betaStatus = await getFreeBetaStatus();
  const freeBeta = betaStatus.isFreeActive;

  // ── Stripe gate ───────────────────────────────────────────────────────────
  // Active when free limit is exhausted OR user explicitly chooses payment
  if (!freeBeta || unlockMethod === "payment") {
    if (unlockMethod === "payment" || !freeBeta) {
      try {
        const locale = (record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en") as SupportedLocale;
        const { url } = await createStripeCheckoutSession({ reportId, email, locale });
        return {
          status: "error",
          message: `STRIPE_REDIRECT:${url}`,
        };
      } catch (err) {
        console.error("Stripe session creation failed:", err);
        return {
          status: "error",
          message: "Payment processing is temporarily unavailable. Please try again later.",
        };
      }
    }
  }

  // ── Effective unlock method ───────────────────────────────────────────────
  const effectiveUnlockMethod: UnlockMethod = freeBeta ? "beta_free" : "lead_capture";

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
      occupation: record.input.occupation,
      englishLevel: record.input.englishLevel,
      sponsorOrFamily: record.input.sponsorOrFamily,
      biggestConcern: record.input.biggestConcern,
    },
  };
}
