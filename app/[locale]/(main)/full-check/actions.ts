"use server";

import { reportAccessToken, reportResultUrl } from "@/lib/reports/report-access";
import { hasReportSession, isAdminSession, rememberReportSession } from "@/lib/reports/report-access-server";
import { refreshStoredReport } from "@/lib/reports/refresh-report";
import { fullCheckAdminPayload, sendFullCheckAdminEmail } from "@/lib/email/full-check-admin";
import { nonAdminUnlockMode } from "@/lib/readiness/paid-checkout";
import { eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";

import { db } from "@/db";
import { fullCheckUsage, fullCheckWaitlist, leads } from "@/db/schema";
import { prisma } from "@/lib/prisma";
import { getStripeBaseUrl } from "@/lib/stripe";
import { normalizeTargetVisa } from "@/lib/readiness/target-visa";
import { CANADA_REPORT_UNAVAILABLE, REPORTS_UNAVAILABLE, isCanadaReportEnabled, readinessReportMode } from "@/lib/readiness/report-mode";
import { defaultCountry, isSupportedCountry, isPartnerFamilySponsorship, getVisaSubclassesForGoals, type MigrationGoalId } from "@/lib/countries";
import { generateAndSendReport, sendReportAccessLink } from "@/lib/services/report-service";
import {
  completeFullCheckProgress,
  failFullCheckProgress,
  initFullCheckProgress,
  updateFullCheckProgress,
} from "@/lib/full-check-progress";
import { buildLeadQuality, runReadinessEngine } from "@/src/lib/readiness-engine";
import {
  getStateIntelligenceMap,
  getStateNominationConfigMap,
} from "@/lib/state-intelligence";
import { canonicalizeOccupationInput, resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import { computeInternalLeadTier } from "@/lib/readiness/internal-lead-tier";
import { AU_STATE_CODES, isAuStateCode, isEnglishLevel, isQualificationLevel, parseExperienceYears, resolveSkillsAssessmentAnswer } from "@/lib/intake/fields";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { ensureCountrySpecificReportSchema } from "@/lib/readiness/country-scope";
import {
  createUserReport,
  getUserReportById,
  markInternalLeadEmailSent,
  markUserReportUnlocked,
  type UnlockMethod,
  countFreeBetaUnlocksToday,
} from "@/src/lib/user-reports";
import { getAgentUser } from "@/lib/crm/leads";
import { sendAgentAssignedEmail } from "@/lib/email/agent-notifications";
import { shouldSuppressReportEmails } from "@/lib/email/suppression";
import { sendOpsAlert } from "@/lib/email/ops-alert";
import { safeEqual } from "@/lib/admin-auth";

import { sendInternalLeadTierEmail, sendReportReadyEmail } from "@/lib/email/quick-check-emails";
import { buildBasicPreview, buildReportPreview, type ReportPreview } from "@/lib/reports/report-preview";
import { buildReportView, reportViewProfile } from "@/lib/reports/report-view";
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

export type FullCheckQuickPreview = ReportPreview;

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
  /** The report's access token (admin unlock only; never returned by the free-beta unlock) -- lets the in-page PDF download pass the route's authorization. */
  accessToken?: string;
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

// The experience-years rule (empty = not entered, else 0-50) lives in lib/intake/fields.ts, shared with the in-chat
// quick profile card; safeParse keeps the call sites below unchanged.
const optionalExperienceYearsSchema = {
  safeParse(value: unknown): { success: true; data: number | undefined } | { success: false } {
    const r = parseExperienceYears(value);
    return r.ok ? { success: true, data: r.value } : { success: false };
  },
};

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

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

// ─── Email senders ────────────────────────────────────────────────────────────
//
// The admin "assessment completed" notification used to be sent from here on
// every free quick-check submission, regardless of whether the visitor ever
// paid. It's now sent only from the Stripe webhook after a successful
// checkout.session.completed (see sendFullCheckAdminEmail in
// lib/email/full-check-admin.ts and handleReportUnlock in
// app/api/stripe/webhook/route.ts), so the admin inbox only hears about paying
// customers.

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

/**
 * The pre-payment preview (lib/reports/report-preview.ts): the visitor's details, the points total from their entries and the report's section
 * titles. No visa, state, fee or scenario content leaves the server before the report is unlocked.
 */
function buildQuickPreview(report: ReadinessReport, locale: SupportedLocale, input: Partial<ReadinessInput>, fullName?: string): FullCheckQuickPreview {
  const estimated = report.pointsBoosterSimulator?.currentEstimate ?? report.pointsEstimate?.estimatedPoints ?? null;
  if (report.country === "CA" || report.partnerSponsorshipAssessment) return buildBasicPreview(report, locale);
  const view = buildReportView({ report, locale, profile: reportViewProfile(input, fullName ?? null, locale), dateText: "" });
  return buildReportPreview(view, typeof estimated === "number" ? estimated : null);
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
  const preferredState = isAuStateCode(preferredStateRaw) ? preferredStateRaw : undefined;
  const rawTargetCountry = String(formData.get("targetCountry") ?? "").trim();
  const mappedVisas = getVisaSubclassesForGoals(
    migrationGoals as MigrationGoalId[],
    isSupportedCountry(rawTargetCountry) ? rawTargetCountry : defaultCountry
  );
  // The single required Target visa (AU form): "not_sure" evaluates every pathway, like an empty choice always did.
  const targetVisa = normalizeTargetVisa(visaInterest);
  const effectiveVisaInterest = targetVisa === "not_sure" ? "" : visaInterest || mappedVisas.join(",") || "";
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
  const englishLevel = isEnglishLevel(englishLevelRaw) ? englishLevelRaw : "";
  const qualificationLevelRaw = String(formData.get("qualificationLevel") ?? "").trim();
  // Field values shared with the in-chat quick profile card (lib/intake/fields.ts).
  const qualificationLevel = isQualificationLevel(qualificationLevelRaw) ? qualificationLevelRaw : undefined;
  const annualSalaryAudRaw = String(formData.get("annualSalaryAud") ?? "").trim();
  const annualSalaryAud = annualSalaryAudRaw ? Number(annualSalaryAudRaw) : undefined;
  // Skills assessment: the explicit radio (no default selection), else the older "Occupation confirmed?" select; an
  // unanswered question is stored as unknown ("" -> undefined), never as "no" (lib/intake/fields.ts).
  const occupationConfirmedRaw = resolveSkillsAssessmentAnswer(formData.get("skillsAssessment"), formData.get("occupationConfirmed"));

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

  // "Did your skills assessment recognise your degree as comparable to the Australian level?" -- asked only after a
  // positive skills assessment (an applicant cannot self-assess recognition before one); never changes points values.
  const isQualificationRecognizedResult = optionalYesNoSchema.safeParse(formData.get("isQualificationRecognized"));
  const isQualificationRecognized =
    qualificationAwardedInAustralia === false && occupationConfirmedRaw === "yes" && isQualificationRecognizedResult.success
      ? isQualificationRecognizedResult.data === "yes"
        ? true
        : isQualificationRecognizedResult.data === "no"
          ? false
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
  // Situation fields (AU): employer sponsorship, residence state (only when in Australia), application stage.
  const employerSponsorshipRaw = String(formData.get("employerSponsorship") ?? "").trim();
  const employerSponsorship = (["none", "job_offer", "sponsored_482"] as const).find((v) => v === employerSponsorshipRaw);
  const yearsWithCurrentSponsorRaw = String(formData.get("yearsWithCurrentSponsor") ?? "").trim();
  const yearsWithCurrentSponsorNum = yearsWithCurrentSponsorRaw === "" ? undefined : Number(yearsWithCurrentSponsorRaw);
  const yearsWithCurrentSponsor =
    employerSponsorship === "sponsored_482" && yearsWithCurrentSponsorNum !== undefined && Number.isInteger(yearsWithCurrentSponsorNum) && yearsWithCurrentSponsorNum >= 0 && yearsWithCurrentSponsorNum <= 10
      ? yearsWithCurrentSponsorNum
      : undefined;
  const residenceStateRaw = String(formData.get("residenceState") ?? "").trim();
  const residenceState = String(formData.get("currentCountry") ?? "").trim() === "AU"
    ? AU_STATE_CODES.find((v) => v === residenceStateRaw)
    : undefined;
  const applicationStageRaw = String(formData.get("applicationStage") ?? "").trim();
  const applicationStage = (["planning", "skills_assessment_in_progress", "eoi_submitted", "invited"] as const).find((v) => v === applicationStageRaw) ?? "planning";
  const occupationConfirmed = occupationConfirmedRaw;
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
  // READINESS_REPORT_MODE=DISABLED: no report is generated for any country.
  if (readinessReportMode() === "DISABLED") {
    return { status: "error", error: REPORTS_UNAVAILABLE[resolvedLocale === "tr" ? "tr" : resolvedLocale === "zh-Hans" ? "zh-Hans" : "en"] };
  }
  // Canada report generation is switched off during the beta (lib/readiness/report-mode.ts): nothing is created,
  // stored or emailed for a Canada request; the Canada code stays in place.
  if (targetCountry === "CA" && !isCanadaReportEnabled()) {
    return { status: "error", error: CANADA_REPORT_UNAVAILABLE[resolvedLocale === "tr" ? "tr" : resolvedLocale === "zh-Hans" ? "zh-Hans" : "en"] };
  }
  // Admin = a verified admin session (signed admin cookie or NextAuth ADMIN), never the typed email.
  const isAdmin = await isAdminSession();

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
  if (targetCountry === "AU" && !targetVisa) {
    errors.targetVisa = isTr ? "Hedef vize gereklidir." : isZh ? "目标签证为必填项。" : "Target visa is required.";
  }
  if (!isPartner && targetCountry === "AU" && !employerSponsorship) {
    errors.employerSponsorship = isTr
      ? "İşveren sponsorluğu gereklidir."
      : isZh
        ? "雇主担保为必填项。"
        : "Employer sponsorship is required.";
  }
  if (!isPartner && targetCountry === "AU" && currentCountry === "AU" && !residenceState) {
    errors.residenceState = isTr
      ? "Yaşadığınız eyalet veya bölge gereklidir."
      : isZh
        ? "居住的州或领地为必填项。"
        : "State or territory of residence is required.";
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

  // The one-report-per-email anti-abuse check that used to live here was
  // removed for the same reason as the IP rate limit below: the system is
  // now full-time Premium (paid, A$21.99 inc. GST per report via Stripe), so blocking a
  // repeat submission from the same email mainly punished legitimate paying
  // customers (a household submitting for multiple family members, or
  // wanting a fresh report after a life change) rather than free-tier abuse,
  // which is no longer the threat model. UserReport.email has no DB-level
  // unique constraint (confirmed in prisma/schema.prisma), and
  // createUserReport always INSERTs a fresh row with a new
  // crypto.randomUUID() id -- never an upsert keyed by email -- so every
  // submission, repeat email or not, gets its own reportId and its own
  // Stripe Checkout session further down this flow.

  // IP rate limiting removed: the system is now full-time Premium
  // (paid) rather than a free-quota beta, so blocking a second submission
  // from the same IP within 24 hours mainly punished legitimate paying
  // customers (a household submitting for multiple family members, or
  // retrying after a mistake) rather than free-tier abuse, which is no
  // longer the threat model. ip_address is still recorded on the report
  // below for analytics/support purposes.
  const clientIp = await getClientIp();

  const leadQuality = buildLeadQuality({
    locale: resolvedLocale,
    mainGoal,
    currentCountry: currentCountry || undefined,
    passportCountry,
    age,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: effectiveVisaInterest || undefined,
    targetVisa: targetVisa ?? undefined,
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

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "scanning_occupations");
  }

  // Live state-nomination status/citations (see lib/state-intelligence.ts and app/api/cron/sync-states) --
  // runReadinessEngine itself stays synchronous, so these DB reads have to happen here, before calling it.
  // Neither throws; both degrade to the static-data fallback on failure.
  //
  // getStateOccupationMatches()/StateOccupationListEntry (real occupation-list membership, DB-backed) was
  // dropped from this call in Phase 3b: that table is not populated by anything in this codebase (no cron,
  // no seed, no admin trigger writes to it), so the lookup always returned {} in production and the state-
  // match score's two occupation-list rules that read it never actually fired -- this call was a dead DB
  // round-trip on every submission. lib/state-nomination/occupation-match.ts + the git-committed
  // src/data/state-occupation-lists/*.json is the one real occupation-match source now (display-text only,
  // never the score); scripts/sync-state-occupation-lists.ts and the StateOccupationListEntry table are left
  // in place, unused, as a flagged future option (fixing its NSW unit-group/ANZSCO-code bug and deciding
  // whether occupation-matching should ever affect score again is a separate decision).
  const [stateIntelligence, stateNominationConfig] = await Promise.all([
    getStateIntelligenceMap(),
    getStateNominationConfigMap(),
  ]);

  // AU skilled/employer intake only; persisted with the input so the refreshed PDF uses the same answers.
  const situationInput: Pick<ReadinessInput, "employerSponsorship" | "yearsWithCurrentSponsor" | "residenceState" | "applicationStage"> =
    targetCountry === "AU" && !isPartner
      ? {
          employerSponsorship,
          ...(yearsWithCurrentSponsor !== undefined ? { yearsWithCurrentSponsor } : {}),
          ...(residenceState ? { residenceState } : {}),
          applicationStage,
        }
      : {};

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
      stateNominationConfig,
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
      occupationConfirmed: occupationConfirmed || undefined,
      hasGraduateVisaPathwayIntent,
      estimatedBudgetRange: estimatedBudgetRange || undefined,
      timeline: timeline || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      preferredPathway: effectiveVisaInterest || undefined,
      targetVisa: targetVisa ?? undefined,
      biggestConcern: biggestConcern || undefined,
      nocCode: nocCode || undefined,
      nocTeer: nocTeer !== undefined && !isNaN(nocTeer) ? nocTeer : undefined,
      ...situationInput,
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
    isQualificationRecognized,
    offshoreExperienceYears,
    onshoreExperienceYears,
    yearsInSponsoredPosition,
    nominationStream,
    courseName,
    courseCricosCode,
    courseCompletionStatus,
    courseCompletionDate,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: effectiveVisaInterest || undefined,
    targetVisa: targetVisa ?? undefined,
    biggestConcern: biggestConcern || undefined,
    // Also persisted so lib/reports/refresh-report.ts can recompute the report with the current engine (the PDF is
    // regenerated on every download). Live state data (stateIntelligence/stateNominationConfig) is re-read then.
    migrationGoals: migrationGoals.length > 0 ? migrationGoals : undefined,
    preferredState,
    hasGraduateVisaPathwayIntent,
    isLabourAgreementEmployer: formData.get("isLabourAgreementEmployer") === "on" || undefined,
    nocCode: nocCode || undefined,
    nocTeer: nocTeer !== undefined && !isNaN(nocTeer) ? nocTeer : undefined,
    ...situationInput,
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
    previewData: buildQuickPreview(generatedReport, resolvedLocale, readinessInputForReport, fullName),
  });

  // This browser may open its own report on screen (and download its PDF) -- lib/reports/report-session.ts.
  await rememberReportSession(reportRecord.id);

  // Best-effort: the lead is already persisted and (if applicable) assigned
  // above, so a broken RESEND_API_KEY or a send failure here must never fail
  // the submission the visitor is waiting on.
  if (referralAgent && !shouldSuppressReportEmails({ email }, "quick_check_agent_assigned_email")) {
    try {
      await sendAgentAssignedEmail({
        agentEmail: referralAgent.email,
        agentName: referralAgent.name,
        leadName: fullName || email,
        status: "New",
        leadId: reportRecord.id,
        locale: resolvedLocale,
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
    // Not a silent skip: the lead is lost, so log an error and alert the operator (throttled). Fix: run
    // prisma/manual-migrations/2026-10-08-create-missing-tables.sql (docs/missing-tables.md).
    await sendOpsAlert("leads_table_missing", `A lead was NOT saved (report ${reportRecord.id}): the leads table does not exist in this database.`);
  }

  if (analysisProgressId) {
    await updateFullCheckProgress(analysisProgressId, "generating_report");
  }

  // Fire the user confirmation and admin notification concurrently rather
  // than sequentially, so neither email's latency stacks onto the other's —
  // this whole block is deliberately not awaited before the response below,
  // so email delivery never blocks the user-facing response time.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://logivisa.com";
  const reportLink = reportResultUrl(baseUrl, resolvedLocale, reportRecord.id);

  // Free admin order (the submitter's address is on the admin allow-list): neither the customer "report
  // ready" email nor the internal lead-tier notification is sent. The lead and report are saved as usual.
  const skipCustomerEmail = shouldSuppressReportEmails({ email }, "quick_check_customer_report_email");
  const skipInternalEmail = internalLeadTier !== "Cold" && shouldSuppressReportEmails({ email }, "quick_check_internal_lead_email");

  Promise.all([
    skipCustomerEmail
      ? Promise.resolve()
      : sendReportReadyEmail({
      email,
      fullName,
      reportLink,
      locale: resolvedLocale,
      preview: buildQuickPreview(generatedReport, resolvedLocale, readinessInputForReport, fullName),
    }).catch((err) => console.error("Customer report email failed (non-blocking):", err)),
    internalLeadTier === "Cold" || skipInternalEmail
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
    preview: buildQuickPreview(generatedReport, resolvedLocale, readinessInputForReport, fullName),
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

  // Free unlock ONLY for a verified admin session (lib/reports/report-access-server.ts). The typed email is never a
  // credential: before this, typing an ADMIN_EMAILS address unlocked any report without Stripe or a login.
  const isAdmin = await isAdminSession();
  console.log("Adım 2: Checkout gate değerlendiriliyor", { isAdmin, unlockMethod });

  // ── Sale switched off (READINESS_REPORT_PAID_CHECKOUT_ENABLED=false) ────────────────────────────────────
  // The Visa Information Report is sold unless READINESS_REPORT_PAID_CHECKOUT_ENABLED is exactly "false"
  // (lib/readiness/paid-checkout.ts): /api/checkout is never asked for a Stripe session. Two routes to the report:
  //   1. the BROWSER SESSION THAT CREATED IT (signed httpOnly cookie set when the form was submitted,
  //      lib/reports/report-session.ts) sees it on screen right away -- the report and its access token are returned;
  //   2. the emailed secure link, sent to the report's OWN address. Anyone else only gets that email: a typed email
  //      address alone is not a credential, so nothing is returned to the browser.
  // Unlocking is idempotent: an already unlocked report (paid or free) is never re-marked, so a paid report keeps its
  // payment record. The first free unlock sends the admin notification (labelled FREE BETA) and is counted per day.
  if (!isAdmin && nonAdminUnlockMode() === "free_beta") {
    const sameBrowser = await hasReportSession(reportId);
    if (!sameBrowser && email.trim().toLowerCase() !== record.email.trim().toLowerCase()) {
      return { status: "error", message: "The email you entered doesn't match this report. Please use the email you originally submitted." };
    }
    const betaLocale = record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en";
    const firstUnlock = !record.isUnlocked;
    if (firstUnlock) {
      await markUserReportUnlocked({ reportId, email: record.email, phone: phone || undefined, unlockMethod: "beta_free", pdfSent: false });
      try {
        if (!shouldSuppressReportEmails({ email: [email, record.email] }, "free_beta_admin_notification")) {
          const today = await countFreeBetaUnlocksToday();
          await sendFullCheckAdminEmail({ ...fullCheckAdminPayload({ fullName: record.fullName, locale: record.locale, source: "full_check", inputJson: record.input }, record.email), variant: "free_beta", freeUnlocksToday: today });
        }
      } catch (err) {
        console.error("unlockPremiumReport (sale off): admin notification failed (non-blocking):", err);
      }
      try {
        await generateAndSendReport(reportId, record.email, fullName || undefined, { freeBeta: true });
      } catch (err) {
        console.error("unlockPremiumReport (sale off): generateAndSendReport threw unexpectedly", err);
      }
    }
    if (sameBrowser) {
      let shown: ReadinessReport = record.report;
      try {
        shown = (await refreshStoredReport(record.report, record.input, { generatedAt: record.createdAt })).report;
      } catch (err) {
        console.error("unlockPremiumReport (sale off): refresh failed, showing the stored report", err);
      }
      return {
        status: "success",
        message:
          betaLocale === "tr"
            ? "Raporunuz açıldı. Güvenli bağlantı, raporun oluşturulduğu e-posta adresine de gönderildi."
            : betaLocale === "zh-Hans"
              ? "报告已打开。安全链接也已发送到创建报告时使用的邮箱。"
              : "Your report is open. The secure link was also emailed to the address the report was created with.",
        accessToken: reportAccessToken(reportId) ?? undefined,
        report: shown,
        userInput: {
          name: fullName || undefined,
          email: record.email,
          mainGoal: record.input.mainGoal,
          currentCountry: record.input.currentCountry,
          passportCountry: record.input.passportCountry,
          age: record.input.age,
          qualificationLevel: record.input.qualificationLevel,
          annualSalaryAud: typeof record.input.annualSalaryAud === "number" ? String(record.input.annualSalaryAud) : undefined,
          occupation: record.input.occupation,
          englishLevel: record.input.englishLevel,
          sponsorOrFamily: record.input.sponsorOrFamily,
          biggestConcern: record.input.biggestConcern,
        },
      };
    }
    if (!firstUnlock) await sendReportAccessLink(reportId);
    return {
      status: "success",
      message:
        betaLocale === "tr"
          ? "Raporunuzun güvenli bağlantısı, raporun oluşturulduğu e-posta adresine gönderildi (PDF, rapor sayfasından indirilir). Birkaç dakika içinde gelmezse gereksiz klasörüne bakın."
          : betaLocale === "zh-Hans"
            ? "报告的安全链接已发送到创建报告时使用的邮箱（PDF 可在报告页面下载）。如几分钟内未收到，请检查垃圾邮件文件夹。"
            : "The secure link to your report was emailed to the address the report was created with (the PDF can be downloaded from the report page). If nothing arrives within a few minutes, check your spam folder.",
    };
  }

  // ── Checkout gate ─────────────────────────────────────────────────────────
  // Every non-admin unlock -- regardless of unlockMethod ("payment" or
  // "lead_capture") -- goes through /api/checkout now. unlockMethod used to
  // pick between this branch and a local free/lead-capture unlock below
  // based on the OLD full_check_usage-backed getFreeBetaStatus() quota, which
  // let the client's default unlockMethod="lead_capture" skip /api/checkout
  // (and its own, newer isFreePromo-backed 14-free-report quota) entirely --
  // the redirect would just never happen. /api/checkout is the only place
  // that quota decision gets made now, so this function has no business
  // branching on unlockMethod itself anymore.
  if (!isAdmin) {
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

  console.log("Adım 2 sonucu: isAdmin=true, checkout gate atlandı (yerel ücretsiz açma)", {
    isAdmin,
    unlockMethod,
  });

  // ── Effective unlock method ───────────────────────────────────────────────
  // Only the isAdmin branch reaches here now -- every non-admin unlock
  // returns via the /api/checkout redirect above.
  // An admin session unlocks a report without Stripe and without a promotion code, from the normal form and unlock modal; the unlock is
  // recorded as admin_free (not as a free-beta or paid unlock). Emails follow the recipient address only.
  const effectiveUnlockMethod: UnlockMethod = "admin_free";

  // ── PDF generation & email delivery ──────────────────────────────────────
  // Shared with the free-promo and Stripe-webhook unlock paths -- see
  // lib/services/report-service.ts. Swallows its own PDF/email errors and
  // never throws, so a failure here can't crash this admin unlock; we just
  // log it and still mark the report unlocked (isAdmin already has access to
  // the on-screen report regardless of whether the emailed PDF went out).
  let pdfSent = false;
  try {
    // The email goes to the report's own address and is suppressed only if THAT address is on ADMIN_EMAILS /
    // KNOWN_TEST_EMAILS -- never because the browser holds an admin session.
    const result = await generateAndSendReport(reportId, record.email, fullName || undefined);
    pdfSent = result.pdfSent;
    if (!pdfSent && !result.suppressed && isEmailDeliveryEnabled()) {
      console.error(`unlockPremiumReport: generateAndSendReport reported failure for report ${reportId}`);
    }
  } catch (err) {
    // generateAndSendReport is contracted not to throw, but guard anyway.
    console.error("unlockPremiumReport: generateAndSendReport threw unexpectedly", err);
  }

  await markUserReportUnlocked({
    reportId,
    email: record.email,
    phone: phone || undefined,
    unlockMethod: effectiveUnlockMethod,
    pdfSent,
  });

  return {
    status: "success",
    message: "Full report unlocked. PDF sent to your email.",
    accessToken: reportAccessToken(reportId) ?? undefined,
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

  if (!safeEqual(providedSecret, expectedSecret)) {
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
