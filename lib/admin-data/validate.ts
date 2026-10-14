import { z } from "zod";

import { CURRENT_STATE_STATUSES, isStateStatus } from "./statuses";
import type { LocalizedField, StateProgramData, SubclassData } from "./types";

/**
 * Server-side validation of an edited state program (docs/admin-data-design.md A.3). The page also checks, but only this runs on save:
 * the server action is a public endpoint, so nothing the form promises is trusted.
 */

const TEXT_MAX = 4000;
const SUMMARY_MAX = 8000;
const FACT_MAX = 1500;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date as YYYY-MM-DD").refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, "is not a real date");
const httpsUrl = z.string().trim().url("must be a URL").refine((v) => v.startsWith("https://"), "must start with https://");

const translation = z.object({
  text: z.string().max(TEXT_MAX),
  reviewed: z.boolean(),
  origin: z.enum(["carried_over", "machine_draft", "manual"]),
  draftedAt: z.string().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewedAt: z.string().optional(),
}).refine((t) => !t.reviewed || t.text.trim().length > 0, "an empty translation cannot be marked reviewed");

const localized = (max: number) => z.object({ en: z.string().max(max), tr: translation.optional(), "zh-Hans": translation.optional() });

const subclassSchema = z.object({
  subclass: z.enum(["190", "491"]),
  availability: z.enum(["inherit", "open", "closed", "exception"]),
  allocation: z.number().int().min(0).max(1_000_000).nullable(),
  allocationUsed: z.number().int().min(0).max(1_000_000).nullable(),
  feeExclGst: z.number().min(0).max(100_000).nullable(),
  feeInclGst: z.number().min(0).max(100_000).nullable(),
  gstBasis: z.enum(["stated_by_state", "computed_10pct", "no_gst", "not_stated"]),
  feeNote: localized(TEXT_MAX).nullable(),
  effectiveFrom: isoDate.nullable(),
});

const conditionSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["residence", "employment", "study", "english", "points", "fee", "process", "other"]),
  subclasses: z.array(z.enum(["190", "491"])).max(2),
  stream: z.string().max(200).nullable().optional(),
  text: localized(FACT_MAX),
  residenceRule: z.enum(["required", "not_required", "not_stated"]).optional(),
  quote: z.string().max(FACT_MAX).nullable().optional(),
  source: z.string().max(500).nullable().optional(),
});

const scoringSchema = z.object({
  offshoreAvailability: z.enum(["open", "limited", "closed"]),
  onshoreAvailability: z.enum(["open", "priority", "closed"]),
  minimumPoints: z.number().int().min(0).max(200),
  minimumEnglish: z.enum(["competent", "proficient", "superior"]),
  minimumExperienceYears: z.number().min(0).max(30),
  regionalFocus: z.boolean(),
  preferredVisaTypes: z.array(z.enum(["190", "491"])).max(2),
  requiresStateResidence: z.boolean(),
  requiresRecentEmployment: z.boolean(),
  offshoreQuotaPressure: z.enum(["low", "medium", "high", "closed"]),
  ruleQuotaPressure: z.enum(["low", "medium", "high", "closed"]),
  programWindow: z.string().max(TEXT_MAX),
  specialConditions: z.array(localized(FACT_MAX)).max(20),
});

const programSchema = z.object({
  stateCode: z.string().regex(/^[A-Z]{2,3}$/),
  stateName: z.string().min(1).max(100),
  programYear: z.string().regex(/^\d{4}-\d{2}$/, "must look like 2026-27"),
  status: z.string(),
  statusChangedAt: z.string().nullable(),
  openingDate: isoDate.nullable(),
  closingDate: isoDate.nullable(),
  officialUrl: httpsUrl.nullable(),
  extraUrls: z.array(httpsUrl).max(10),
  exceptions: z.object({ text: localized(TEXT_MAX), subclass: z.enum(["190", "491"]).nullable().optional(), appliesTo: z.enum(["onshore", "offshore", "all"]).nullable().optional(), deadline: isoDate.nullable().optional() }).nullable(),
  notes: localized(TEXT_MAX),
  aiSummary: localized(SUMMARY_MAX),
  conditions: z.array(conditionSchema).max(60),
  scoring: scoringSchema,
  subclasses: z.array(subclassSchema).max(2),
  lastVerifiedAt: z.string(),
  lastVerifiedBy: z.string().nullable(),
  sourceText: z.string().max(4000),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export type ValidationIssue = { path: string; message: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** incl = round(excl x 1.10, 2) unless the state states the figure itself; "no GST" means the two are equal. Fills a missing counterpart when the basis is computed. */
export function reconcileFee(s: SubclassData): { subclass: SubclassData; issue?: string } {
  const next = { ...s };
  if (s.gstBasis === "computed_10pct") {
    if (s.feeExclGst !== null && s.feeInclGst === null) next.feeInclGst = round2(s.feeExclGst * 1.1);
    else if (s.feeInclGst !== null && s.feeExclGst === null) next.feeExclGst = round2(s.feeInclGst / 1.1);
    else if (s.feeExclGst !== null && s.feeInclGst !== null && Math.abs(round2(s.feeExclGst * 1.1) - s.feeInclGst) > 0.011) {
      return { subclass: next, issue: `incl. GST ${s.feeInclGst} is not excl. GST ${s.feeExclGst} x 1.10 (= ${round2(s.feeExclGst * 1.1)}); choose "stated by the state" if the state prints that figure` };
    }
  }
  if (s.gstBasis === "no_gst" && s.feeExclGst !== null && s.feeInclGst !== null && s.feeExclGst !== s.feeInclGst) {
    return { subclass: next, issue: `with no GST the two fees must be equal (${s.feeExclGst} vs ${s.feeInclGst})` };
  }
  if (s.gstBasis === "no_gst" && s.feeExclGst !== null && s.feeInclGst === null) next.feeInclGst = s.feeExclGst;
  return { subclass: next };
}

/**
 * Validates an edited program. `previous` is the stored one: a legacy status may stay as it is but cannot be chosen again.
 * Returns the cleaned program (fees reconciled) or the list of issues.
 */
export function validateProgram(input: unknown, previous?: StateProgramData | null): { ok: true; value: StateProgramData } | { ok: false; issues: ValidationIssue[] } {
  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  const p = parsed.data as unknown as StateProgramData;
  const issues: ValidationIssue[] = [];

  if (!isStateStatus(p.status)) issues.push({ path: "status", message: "is not a known status" });
  else if (!(CURRENT_STATE_STATUSES as readonly string[]).includes(p.status) && previous?.status !== p.status) issues.push({ path: "status", message: `"${p.status}" is a legacy value and cannot be chosen; pick a current status` });
  if (p.status === "Closed with exceptions" && !(p.exceptions?.text.en ?? "").trim()) issues.push({ path: "exceptions", message: 'status "Closed with exceptions" needs the exceptions text' });
  if (!p.notes.en.trim()) issues.push({ path: "notes.en", message: "the English note is required" });
  if (p.openingDate && p.closingDate && p.closingDate < p.openingDate) issues.push({ path: "closingDate", message: "is before the opening date" });

  const ids = new Set<string>();
  p.conditions.forEach((c, i) => {
    if (ids.has(c.id)) issues.push({ path: `conditions.${i}.id`, message: `duplicate id ${c.id}` });
    ids.add(c.id);
    if (!c.text.en.trim()) issues.push({ path: `conditions.${i}.text.en`, message: "the English text is required" });
    if (c.residenceRule && c.kind !== "residence") issues.push({ path: `conditions.${i}.residenceRule`, message: 'only a condition of kind "residence" has a residence rule' });
  });

  const subs = new Set<string>();
  const subclasses: SubclassData[] = p.subclasses.map((s, i) => {
    if (subs.has(s.subclass)) issues.push({ path: `subclasses.${i}.subclass`, message: `subclass ${s.subclass} appears twice` });
    subs.add(s.subclass);
    const r = reconcileFee(s);
    if (r.issue) issues.push({ path: `subclasses.${i}.feeInclGst`, message: r.issue });
    return r.subclass;
  });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: { ...p, subclasses } };
}

export type { LocalizedField };
