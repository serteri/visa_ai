"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { buildLeadQuality, runReadinessEngine } from "@/src/lib/readiness-engine";
import type { ReadinessReport } from "@/lib/readiness/types";
import {
  createUserReport,
  ensureUserReportsTable,
  getUserReportById,
  markUserReportUnlocked,
} from "@/src/lib/user-reports";

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

async function ensureFullCheckWaitlistTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      full_name TEXT,
      visa_interest TEXT,
      preferred_language TEXT,
      current_country TEXT,
      passport_country TEXT,
      age TEXT,
      occupation TEXT,
      english_level TEXT,
      english_test_taken TEXT,
      occupation_confirmed TEXT,
      estimated_budget_range TEXT,
      timeline TEXT,
      sponsor_or_family TEXT,
      biggest_concern TEXT,
      main_goal TEXT,
      lead_score INT,
      lead_tier TEXT,
      source TEXT DEFAULT 'full_check',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS full_name TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS visa_interest TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS preferred_language TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS current_country TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS passport_country TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS age TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS occupation TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS english_level TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS english_test_taken TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS occupation_confirmed TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS estimated_budget_range TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS timeline TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS sponsor_or_family TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS biggest_concern TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS main_goal TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS lead_score INT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS lead_tier TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'full_check'`);
}

async function ensureFullCheckUsageTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_usage (
      id INT PRIMARY KEY DEFAULT 1,
      free_reports_used INT DEFAULT 0,
      free_limit INT DEFAULT 500,
      is_free_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS free_reports_used INT DEFAULT 0`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS free_limit INT DEFAULT 500`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS is_free_active BOOLEAN DEFAULT TRUE`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
  await db.execute(sql`
    INSERT INTO full_check_usage (id, free_reports_used, free_limit, is_free_active)
    VALUES (1, 0, 500, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
}

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

  if (!apiKey || !notificationEmail) {
    console.error(
      "Full check admin email skipped: RESEND_API_KEY and notification email are required."
    );
    return;
  }

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

  if (!apiKey) {
    console.error("Full check confirmation email skipped: RESEND_API_KEY is missing.");
    return;
  }

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

export async function submitFullCheckWaitlist(
  _prevState: FullCheckWaitlistState,
  formData: FormData
): Promise<FullCheckWaitlistState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const visaInterest = String(formData.get("visaInterest") ?? "").trim();
  const preferredLanguage = String(formData.get("preferredLanguage") ?? "").trim();
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

  const isTr = preferredLanguage === "tr";
  const isZh = preferredLanguage === "zh-Hans";
  const resolvedLocale = preferredLanguage === "tr" ? "tr" : preferredLanguage === "zh-Hans" ? "zh-Hans" : "en";
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

  await ensureFullCheckWaitlistTable();
  await ensureFullCheckUsageTable();
  await ensureUserReportsTable();

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

  const usageResult = await db.execute(sql`
    SELECT free_reports_used, free_limit, is_free_active
    FROM full_check_usage
    WHERE id = 1
  `);

  const usageRow = usageResult.rows[0] as
    | {
        free_reports_used: number | null;
        free_limit: number | null;
        is_free_active: boolean | null;
      }
    | undefined;

  const freeReportsUsed = Number(usageRow?.free_reports_used ?? 0);
  const freeLimit = Number(usageRow?.free_limit ?? 500);
  const isFreeActive = Boolean(usageRow?.is_free_active ?? true);

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

  const submissionResult =
    !isFreeActive || freeReportsUsed >= freeLimit
      ? { blocked: true as const, report: generatedReport }
      : await (async () => {
          const suppressNotifications = await hasRecentSubmission(email, source);

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

          await db.execute(sql`
            UPDATE full_check_usage
            SET
              free_reports_used = free_reports_used + 1,
              updated_at = NOW()
            WHERE id = 1
          `);

          return {
            blocked: false as const,
            report: generatedReport,
            suppressNotifications,
          };
        })();

  if (submissionResult.blocked) {
    return {
      status: "error",
      error: "Free access limit reached",
      message: "Free access limit reached",
      requirePayment: true,
    };
  }

  const { report } = submissionResult;
  const reportRecord = await createUserReport({
    fullName,
    email,
    preferredPath: visaInterest || undefined,
    source,
    locale: resolvedLocale,
    leadScore: leadQuality.leadScore,
    leadTier: leadQuality.leadTier,
    report,
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

  return {
    status: "success",
    message: isTr
      ? "Hizli sonuclar hazir. Tam rapor icin kilidi acin."
      : isZh
        ? "快速结果已生成。解锁后可查看完整报告。"
      : "Quick results are ready. Unlock to access the full report.",
    preview: buildQuickPreview(report),
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
  const unlockMethod = unlockMethodRaw === "payment" ? "payment" : "lead_capture";

  const errors: Record<string, string> = {};
  if (!reportId) errors.reportId = "Missing report id.";
  if (!email) errors.email = "Email is required.";
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: "Please fix the highlighted fields.",
    };
  }

  await ensureUserReportsTable();
  const record = await getUserReportById(reportId);

  if (!record) {
    return {
      status: "error",
      message: "Report could not be found.",
    };
  }

  let pdfSent = false;
  const emailEnabled = isEmailDeliveryEnabled();
  const simulateEmailDelivery = process.env.SIMULATE_EMAIL_DELIVERY === "true";

  if (simulateEmailDelivery) {
    pdfSent = true;
    console.log(`Simulated PDF email delivery for report ${reportId} to ${email}`);
  } else if (emailEnabled) {
    try {
      const pdfAttachment = await generateReadinessPDF({
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

      await sendFullCheckConfirmationEmail({
        email,
        fullName,
        locale: record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en",
        pdfAttachment,
      });
      pdfSent = true;
    } catch (error) {
      console.error("Failed to send premium report PDF email", error);
    }
  }

  await markUserReportUnlocked({
    reportId,
    email,
    phone: phone || undefined,
    unlockMethod,
    pdfSent,
  });

  return {
    status: "success",
    message:
      unlockMethod === "payment"
        ? "Payment successful. Full report unlocked and PDF delivery triggered."
        : "Details received. Full report unlocked and PDF delivery triggered.",
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
