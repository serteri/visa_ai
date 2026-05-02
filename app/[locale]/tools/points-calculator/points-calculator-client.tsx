"use client";

import Link from "next/link";
import { useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";

// ─── DHA point tables ──────────────────────────────────────────────────────────

const SUBCLASS = [
  { label: "Subclass 189 — Independent", value: "189", points: 0 },
  { label: "Subclass 190 — State Nominated", value: "190", points: 5 },
  { label: "Subclass 491 — Regional (Skilled)", value: "491", points: 15 },
] as const;

const AGE = [
  { label: "18 – 24 years", value: "18-24", points: 25 },
  { label: "25 – 32 years", value: "25-32", points: 30 },
  { label: "33 – 39 years", value: "33-39", points: 25 },
  { label: "40 – 44 years", value: "40-44", points: 15 },
] as const;

const ENGLISH = [
  { label: "Competent English (IELTS 6 / PTE 50)", value: "competent", points: 0 },
  { label: "Proficient English (IELTS 7 / PTE 65)", value: "proficient", points: 10 },
  { label: "Superior English (IELTS 8 / PTE 79)", value: "superior", points: 20 },
] as const;

const OVERSEAS_EXP = [
  { label: "Less than 3 years", value: "lt3", points: 0 },
  { label: "3 – 4 years", value: "3-4", points: 5 },
  { label: "5 – 7 years", value: "5-7", points: 10 },
  { label: "8+ years", value: "8+", points: 15 },
] as const;

const AUS_EXP = [
  { label: "Less than 1 year", value: "lt1", points: 0 },
  { label: "1 – 2 years", value: "1-2", points: 5 },
  { label: "3 – 4 years", value: "3-4", points: 10 },
  { label: "5 – 7 years", value: "5-7", points: 15 },
  { label: "8+ years", value: "8+", points: 20 },
] as const;

const EDUCATION = [
  { label: "Doctorate (PhD)", value: "phd", points: 20 },
  { label: "Bachelor's or Master's degree", value: "bachelor-master", points: 15 },
  { label: "Diploma / Trade qualification", value: "diploma-trade", points: 10 },
] as const;

const PARTNER = [
  { label: "Single / No applying partner", value: "single", points: 10 },
  { label: "Partner — Skilled & meets English requirement", value: "skilled-english", points: 10 },
  { label: "Partner — Competent English only (no skilled visa)", value: "competent-only", points: 5 },
  { label: "Partner — Does not meet English requirement", value: "no-english", points: 0 },
] as const;

// ─── State & reducer ───────────────────────────────────────────────────────────

type StrField = "subclass" | "age" | "english" | "overseasExp" | "ausExp" | "education" | "partner";
type BoolField = "ausStudy" | "specialistEdu" | "naati" | "regionalStudy" | "professionalYear";

type FormState = Record<StrField, string> & Record<BoolField, boolean | null>;

const INIT: FormState = {
  subclass: "", age: "", english: "",
  overseasExp: "", ausExp: "", education: "", partner: "",
  ausStudy: null, specialistEdu: null, naati: null,
  regionalStudy: null, professionalYear: null,
};

type Action =
  | { kind: "str"; field: StrField; value: string }
  | { kind: "bool"; field: BoolField; value: boolean };

function reducer(state: FormState, action: Action): FormState {
  return { ...state, [action.field]: action.value };
}

// ─── Pure calculation ──────────────────────────────────────────────────────────

function lookup<T extends { value: string; points: number }>(
  table: readonly T[], value: string
): number {
  return table.find((r) => r.value === value)?.points ?? 0;
}

function calculate(form: FormState) {
  const subclass = lookup(SUBCLASS, form.subclass);
  const age = lookup(AGE, form.age);
  const english = lookup(ENGLISH, form.english);

  const rawOverseas = lookup(OVERSEAS_EXP, form.overseasExp);
  const rawAus = lookup(AUS_EXP, form.ausExp);
  const expRaw = rawOverseas + rawAus;
  const exp = Math.min(expRaw, 20);
  const isCapped = expRaw > 20;

  const education = lookup(EDUCATION, form.education);
  const ausStudy = form.ausStudy === true ? 5 : 0;
  const specialistEdu = form.specialistEdu === true ? 10 : 0;
  const naati = form.naati === true ? 5 : 0;
  const regionalStudy = form.regionalStudy === true ? 5 : 0;
  const partner = lookup(PARTNER, form.partner);
  const professionalYear = form.professionalYear === true ? 5 : 0;

  const total =
    subclass + age + english + exp +
    education + ausStudy + specialistEdu +
    naati + regionalStudy + partner + professionalYear;

  return {
    subclass, age, english,
    rawOverseas, rawAus, exp, isCapped,
    education, ausStudy, specialistEdu,
    naati, regionalStudy, partner, professionalYear,
    total,
  };
}

function scoreGradient(n: number): string {
  if (n >= 90) return "from-emerald-400 to-teal-500";
  if (n >= 75) return "from-blue-400 to-indigo-600";
  if (n >= 65) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-pink-600";
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SelectField({
  id, label, hint, options, value, onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  options: readonly { label: string; value: string; points: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white/80 px-4 py-3 pr-10 text-sm text-slate-800 shadow-sm backdrop-blur-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="" disabled>Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} (+{o.points} pts)
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <Chevron open={false} />
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  label, hint, value, onChange,
}: {
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
        )}
      </span>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
              value === v
                ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                : "border-gray-200 bg-white/80 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AccordionSection({
  title, badge, children,
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
            {badge}
          </span>
        </div>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5">
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  label, pts, note,
}: {
  label: string;
  pts: number | null;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <div>
        <span className="text-slate-500">{label}</span>
        {note && (
          <span className="block text-[10px] font-semibold text-amber-600">{note}</span>
        )}
      </div>
      <span className={`shrink-0 font-bold tabular-nums ${
        pts === null ? "text-slate-300" : pts > 0 ? "text-blue-600" : "text-slate-400"
      }`}>
        {pts === null ? "–" : `+${pts}`}
      </span>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function PointsCalculatorClient({ locale }: { locale: string }) {
  const [form, dispatch] = useReducer(reducer, INIT);

  function str(field: StrField) {
    return (value: string) => dispatch({ kind: "str", field, value });
  }
  function bool(field: BoolField) {
    return (value: boolean) => dispatch({ kind: "bool", field, value });
  }

  const calc = useMemo(() => calculate(form), [form]);

  const hasAny =
    form.subclass || form.age || form.english ||
    form.overseasExp || form.ausExp || form.education || form.partner ||
    form.ausStudy !== null || form.specialistEdu !== null ||
    form.naati !== null || form.regionalStudy !== null || form.professionalYear !== null;

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20">
      {/* Ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Free Tool · Official 2026 DHA Points Table
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Australia Visa{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Points Test Calculator
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            Your complete skilled migration profile for subclass{" "}
            <strong>189, 190 &amp; 491</strong> — every official DHA factor included.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* ── LEFT: Accordion form sections ─────────────────────────── */}
          <div className="flex flex-col gap-4 lg:col-span-3">

            {/* 1. Visa & Personal */}
            <AccordionSection title="Visa & Personal Details" badge="Step 1">
              <SelectField
                id="subclass"
                label="Visa Subclass"
                hint="(base points applied automatically)"
                options={SUBCLASS}
                value={form.subclass}
                onChange={str("subclass")}
              />
              <SelectField
                id="age"
                label="Age at Time of Invitation"
                options={AGE}
                value={form.age}
                onChange={str("age")}
              />
              <SelectField
                id="english"
                label="English Proficiency Level"
                hint="(IELTS / PTE / OET / TOEFL)"
                options={ENGLISH}
                value={form.english}
                onChange={str("english")}
              />
            </AccordionSection>

            {/* 2. Work Experience */}
            <AccordionSection title="Work Experience" badge="Step 2">
              <SelectField
                id="overseasExp"
                label="Overseas Work Experience"
                hint="(in your nominated occupation)"
                options={OVERSEAS_EXP}
                value={form.overseasExp}
                onChange={str("overseasExp")}
              />
              <SelectField
                id="ausExp"
                label="Australian Work Experience"
                hint="(in your nominated occupation)"
                options={AUS_EXP}
                value={form.ausExp}
                onChange={str("ausExp")}
              />
              {calc.isCapped && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  <strong>DHA Cap Applied:</strong> Your combined experience (
                  {calc.rawOverseas + calc.rawAus} pts) has been capped at{" "}
                  <strong>20 pts</strong> per official DHA rules.
                </div>
              )}
            </AccordionSection>

            {/* 3. Education */}
            <AccordionSection title="Education" badge="Step 3">
              <SelectField
                id="education"
                label="Highest Qualification"
                options={EDUCATION}
                value={form.education}
                onChange={str("education")}
              />
              <ToggleField
                label="Completed 2+ years of study in Australia?"
                hint="Australian Study Requirement (+5 pts)"
                value={form.ausStudy}
                onChange={bool("ausStudy")}
              />
              <ToggleField
                label="STEM Master's or Doctoral degree from an Australian institution?"
                hint="Specialist Education (+10 pts)"
                value={form.specialistEdu}
                onChange={bool("specialistEdu")}
              />
            </AccordionSection>

            {/* 4. Additional Factors */}
            <AccordionSection title="Additional Factors" badge="Step 4">
              <ToggleField
                label="Hold a Credentialled Community Language (NAATI) credential?"
                hint="+5 pts"
                value={form.naati}
                onChange={bool("naati")}
              />
              <ToggleField
                label="Studied for 2+ years in a regional / low-population area of Australia?"
                hint="+5 pts"
                value={form.regionalStudy}
                onChange={bool("regionalStudy")}
              />
              <SelectField
                id="partner"
                label="Partner / Spouse Situation"
                options={PARTNER}
                value={form.partner}
                onChange={str("partner")}
              />
              <ToggleField
                label="Completed a Professional Year program in Australia?"
                hint="+5 pts"
                value={form.professionalYear}
                onChange={bool("professionalYear")}
              />
            </AccordionSection>

          </div>

          {/* ── RIGHT: Sticky score panel ──────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-2 lg:sticky lg:top-28 lg:self-start">

            {/* Score card */}
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Estimated Total Points
              </p>

              <div
                className={`mt-1 bg-gradient-to-br ${
                  hasAny ? scoreGradient(calc.total) : "from-slate-300 to-slate-400"
                } inline-block bg-clip-text text-[5rem] font-black leading-none text-transparent`}
              >
                {hasAny ? calc.total : "–"}
              </div>

              {!hasAny && (
                <p className="mt-1 text-xs text-slate-400">
                  Complete the form to see your score.
                </p>
              )}

              {/* Breakdown table */}
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Score Breakdown
                </p>
                <div className="flex flex-col gap-2.5">
                  <ScoreRow label="Visa subclass" pts={form.subclass ? calc.subclass : null} />
                  <ScoreRow label="Age" pts={form.age ? calc.age : null} />
                  <ScoreRow label="English proficiency" pts={form.english ? calc.english : null} />
                  <ScoreRow
                    label="Work experience (combined)"
                    pts={(form.overseasExp || form.ausExp) ? calc.exp : null}
                    note={
                      calc.isCapped
                        ? `Capped at 20 (raw: ${calc.rawOverseas + calc.rawAus} pts)`
                        : undefined
                    }
                  />
                  <ScoreRow label="Educational qualification" pts={form.education ? calc.education : null} />
                  <ScoreRow label="Australian study (2 yrs)" pts={form.ausStudy !== null ? calc.ausStudy : null} />
                  <ScoreRow label="Specialist education" pts={form.specialistEdu !== null ? calc.specialistEdu : null} />
                  <ScoreRow label="NAATI credential" pts={form.naati !== null ? calc.naati : null} />
                  <ScoreRow label="Regional study" pts={form.regionalStudy !== null ? calc.regionalStudy : null} />
                  <ScoreRow label="Partner skills" pts={form.partner ? calc.partner : null} />
                  <ScoreRow label="Professional Year" pts={form.professionalYear !== null ? calc.professionalYear : null} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold text-slate-700">Total</span>
                  <span className="text-sm font-black text-slate-900">
                    {hasAny ? `${calc.total} pts` : "–"}
                  </span>
                </div>
              </div>
            </div>

            {/* Marketing hook card */}
            <div className="relative rounded-2xl border border-indigo-100 bg-gradient-to-br from-white/80 to-indigo-50/60 p-6 shadow-[0_0_40px_rgba(99,102,241,0.12)] backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-indigo-200/50"
              />

              <p className="mb-2 text-sm font-bold text-slate-800">
                Points are just the beginning.
              </p>
              <p className="mb-5 text-sm leading-relaxed text-slate-600">
                {hasAny ? (
                  <>
                    You have{" "}
                    <strong className="text-indigo-700">{calc.total} points</strong>, but
                    invitation cutoffs shift every round. State rules, occupational ceilings,
                    and hidden gaps can affect your real chances.
                  </>
                ) : (
                  "Invitation cutoffs shift every round. State rules, occupational ceilings, and hidden gaps can affect your real position."
                )}
              </p>

              <Link
                href={`/${locale}/full-check`}
                className="group block w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] active:scale-[0.98]"
              >
                Unlock Full Readiness Report &amp; Risk Analysis{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">
                  ➔
                </span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
              {["Official DHA factors", "Free · No signup", "Instant results"].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t}
                </span>
              ))}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
